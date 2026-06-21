import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createArtifactPaths } from "./artifacts.js";
import { createMockupStub } from "./mockup.js";
import { createRunId } from "./placeholder.js";
import { planGeneratorIRFromBrief } from "./planner.js";
import { writeSwiftUIEmission } from "./swiftui-emitter.js";
import { parseRuntimeRequest } from "./validation.js";
import { comparePngImages, VisualDiffError } from "./visual-diff.js";
import type {
  FinalReport,
  RuntimeError,
  RuntimeRequest,
  RuntimeStep,
  VisualDiffReport
} from "./types.js";

export type PipelineStepStatus = "completed" | "skipped" | "failed";

export interface PipelineStepReport {
  step: RuntimeStep;
  status: PipelineStepStatus;
  artifactPath?: string;
  reason?: string;
}

export interface MockPipelineOptions {
  artifactRoot?: string;
  width?: number;
  height?: number;
  actualScreenshotPath?: string;
  sandboxGeneratedFile?: string;
}

export interface MockPipelineReport extends FinalReport {
  steps: PipelineStepReport[];
  requestPath: string;
  designBriefPath: string;
  mockupPath: string;
  targetImagePath: string;
  generationReportPath: string;
}

const defaultSandboxGeneratedFile =
  "examples/Sandbox/ViewFoundrySandbox/Generated/ViewFoundryGeneratedView.swift";

export async function runMockPipelineFromFile(
  inputPath: string,
  options: MockPipelineOptions = {}
): Promise<MockPipelineReport> {
  const request = parseRuntimeRequest(JSON.parse(await readFile(inputPath, "utf8")));
  return runMockPipeline(request, options);
}

export async function runMockPipeline(
  request: RuntimeRequest,
  options: MockPipelineOptions = {}
): Promise<MockPipelineReport> {
  const runId = createRunId(request);
  const artifactRoot = options.artifactRoot ?? `.viewfoundry/runs/${runId}`;
  const paths = createArtifactPaths(artifactRoot);
  const steps: PipelineStepReport[] = [];
  const errors: RuntimeError[] = [];

  await mkdir(paths.root, { recursive: true });
  await writeFile(paths.request, `${JSON.stringify(request, null, 2)}\n`);
  steps.push({ step: "request", status: "completed", artifactPath: paths.request });

  const mockupResult = await createMockupStub(request, {
    artifactRoot,
    width: options.width,
    height: options.height
  });
  steps.push({ step: "imagegen", status: "completed", artifactPath: paths.mockup });

  const generation = await writeSwiftUIEmission(planGeneratorIRFromBrief({
    request,
    designBrief: mockupResult.designBrief
  }), {
    artifactRoot,
    sandboxGeneratedFile: options.sandboxGeneratedFile ?? defaultSandboxGeneratedFile
  });
  steps.push({
    step: "generation",
    status: "completed",
    artifactPath: generation.entryFile
  });

  steps.push({
    step: "build",
    status: "skipped",
    reason: "Mocked CI path writes generated SwiftUI but does not invoke Xcode."
  });
  steps.push({
    step: "screenshot",
    status: "skipped",
    reason: "Simulator screenshot is optional and not run in the no-simulator mock path."
  });

  const diffReport = await maybeRunDiff(paths.targetImage, options.actualScreenshotPath, paths);
  if (diffReport instanceof VisualDiffError) {
    const error = toRuntimeError("diff", diffReport.message);
    errors.push(error);
    steps.push({ step: "diff", status: "failed", reason: error.message });
  } else if (diffReport) {
    const diffError = diffReport.passed
      ? undefined
      : toRuntimeError(
          "diff",
          `visual diff score ${diffReport.score} is below threshold ${diffReport.threshold}`
        );
    if (diffError) {
      errors.push(diffError);
    }
    steps.push({
      step: "diff",
      status: diffReport.passed ? "completed" : "failed",
      artifactPath: paths.primaryDiffReport,
      ...(diffError ? { reason: diffError.message } : {})
    });
  } else {
    steps.push({
      step: "diff",
      status: "skipped",
      reason: "No actual screenshot PNG was provided for diffing."
    });
  }

  const status = determineStatus(diffReport, errors);
  const report: MockPipelineReport = {
    runId,
    status,
    primaryPassed: status === "passed",
    artifactRoot,
    swiftuiEntryFile: generation.entryFile,
    ...(diffReport && !(diffReport instanceof VisualDiffError)
      ? { diffReportPath: paths.primaryDiffReport }
      : {}),
    errors,
    nextActions: createNextActions(status),
    steps,
    requestPath: paths.request,
    designBriefPath: paths.designBrief,
    mockupPath: paths.mockup,
    targetImagePath: paths.targetImage,
    generationReportPath: paths.generationReport
  };

  await writeFile(paths.finalReport, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

async function maybeRunDiff(
  targetPath: string,
  actualPath: string | undefined,
  paths: ReturnType<typeof createArtifactPaths>
): Promise<VisualDiffReport | VisualDiffError | undefined> {
  if (!actualPath) {
    return undefined;
  }

  try {
    const report = await comparePngImages({
      targetPath,
      actualPath,
      diffPath: paths.primaryDiff,
      threshold: 0.98
    });
    await writeFile(paths.primaryDiffReport, `${JSON.stringify(report, null, 2)}\n`);
    return report;
  } catch (error) {
    if (error instanceof VisualDiffError) {
      return error;
    }
    const message = error instanceof Error ? error.message : String(error);
    return new VisualDiffError(message);
  }
}

function determineStatus(
  diffReport: VisualDiffReport | VisualDiffError | undefined,
  errors: RuntimeError[]
): MockPipelineReport["status"] {
  if (errors.length > 0 || diffReport instanceof VisualDiffError) {
    return "failed";
  }
  if (diffReport) {
    return diffReport.passed ? "blocked" : "failed";
  }
  return "blocked";
}

function createNextActions(status: MockPipelineReport["status"]): string[] {
  if (status === "passed") {
    return [];
  }
  if (status === "failed") {
    return ["Fix the failed mocked pipeline step, then rerun the pipeline."];
  }
  return [
    "Run simulator screenshot capture when available.",
    "Run visual diff with the target mockup and captured screenshot."
  ];
}

function toRuntimeError(step: RuntimeStep, message: string): RuntimeError {
  return {
    step,
    message,
    retryable: false
  };
}
