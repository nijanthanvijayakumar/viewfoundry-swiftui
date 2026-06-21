import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createArtifactPaths } from "./artifacts.js";
import { createMockupStub } from "./mockup.js";
import { createRunId } from "./placeholder.js";
import { planGeneratorIRFromBrief } from "./planner.js";
import { DEFAULT_MAX_ATTEMPTS, planIterationState } from "./iteration-loop.js";
import { writeSwiftUIEmission } from "./swiftui-emitter.js";
import { parseRuntimeRequest } from "./validation.js";
import { comparePngImages, VisualDiffError } from "./visual-diff.js";
import type {
  DesignBrief,
  FileArtifact,
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
  attempt?: number;
  maxAttempts?: number;
}

export interface MockPipelineReport extends FinalReport {
  steps: PipelineStepReport[];
  requestPath: string;
  designBriefPath: string;
  mockupPath: string;
  targetImagePath: string;
  iterationStatePath: string;
  generatorIRPath?: string;
  generationReportPath?: string;
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

  let generatorIRWritten = false;
  const generation = await runGenerationStep({
    request,
    designBrief: mockupResult.designBrief,
    artifactRoot,
    sandboxGeneratedFile: options.sandboxGeneratedFile ?? defaultSandboxGeneratedFile,
    onGeneratorIRWritten: () => {
      generatorIRWritten = true;
    }
  }).catch(async (error: unknown) => {
    const runtimeError = toRuntimeError("generation", errorMessage(error));
    errors.push(runtimeError);
    steps.push({ step: "generation", status: "failed", reason: runtimeError.message });

    const report = createReport({
      runId,
      status: "failed",
      artifactRoot,
      errors,
      steps,
      paths,
      includeGeneratorIRPath: generatorIRWritten,
      attempt: options.attempt,
      maxAttempts: options.maxAttempts
    });
    await writeIterationState(report, undefined, paths, options);
    await writeFile(paths.finalReport, `${JSON.stringify(report, null, 2)}\n`);
    return undefined;
  });

  if (!generation) {
    return JSON.parse(await readFile(paths.finalReport, "utf8")) as MockPipelineReport;
  }

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
          `visual diff score ${diffReport.score} is below threshold ${diffReport.threshold}`,
          true
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
  const report = createReport({
    runId,
    status,
    artifactRoot,
    errors,
    steps,
    paths,
    generation,
    diffReport,
    attempt: options.attempt,
    maxAttempts: options.maxAttempts
  });

  await writeIterationState(report, diffReport, paths, options);
  await writeFile(paths.finalReport, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

interface GenerationStepInput {
  request: RuntimeRequest;
  designBrief: DesignBrief;
  artifactRoot: string;
  sandboxGeneratedFile: string;
  onGeneratorIRWritten?: () => void;
}

async function runGenerationStep(input: GenerationStepInput) {
  const paths = createArtifactPaths(input.artifactRoot);
  const ir = planGeneratorIRFromBrief({
    request: input.request,
    designBrief: input.designBrief
  });

  await mkdir(path.dirname(paths.generatorIR), { recursive: true });
  await writeFile(paths.generatorIR, `${JSON.stringify(ir, null, 2)}\n`);
  input.onGeneratorIRWritten?.();

  return writeSwiftUIEmission(ir, {
    artifactRoot: input.artifactRoot,
    sandboxGeneratedFile: input.sandboxGeneratedFile
  });
}

interface CreateReportInput {
  runId: string;
  status: MockPipelineReport["status"];
  artifactRoot: string;
  errors: RuntimeError[];
  steps: PipelineStepReport[];
  paths: ReturnType<typeof createArtifactPaths>;
  includeGeneratorIRPath?: boolean;
  generation?: Awaited<ReturnType<typeof runGenerationStep>>;
  diffReport?: VisualDiffReport | VisualDiffError;
  attempt?: number;
  maxAttempts?: number;
}

function createReport(input: CreateReportInput): MockPipelineReport {
  return {
    runId: input.runId,
    status: input.status,
    primaryPassed: input.status === "passed",
    artifactRoot: input.artifactRoot,
    ...(input.generation ? { swiftuiEntryFile: input.generation.entryFile } : {}),
    ...(input.generation || input.includeGeneratorIRPath
      ? { generatorIRPath: input.paths.generatorIR }
      : {}),
    ...(input.diffReport && !(input.diffReport instanceof VisualDiffError)
      ? { diffReportPath: input.paths.primaryDiffReport }
      : {}),
    iterationStatePath: input.paths.iterationState,
    errors: input.errors,
    nextActions: createNextActions(input.status),
    steps: input.steps,
    requestPath: input.paths.request,
    designBriefPath: input.paths.designBrief,
    mockupPath: input.paths.mockup,
    targetImagePath: input.paths.targetImage,
    ...(input.generation ? { generationReportPath: input.paths.generationReport } : {})
  };
}

async function writeIterationState(
  report: MockPipelineReport,
  diffReport: VisualDiffReport | VisualDiffError | undefined,
  paths: ReturnType<typeof createArtifactPaths>,
  options: MockPipelineOptions
): Promise<void> {
  const state = planIterationState({
    runId: report.runId,
    attempt: options.attempt,
    maxAttempts: options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
    finalStatus: report.status,
    errors: report.errors,
    diffReport: diffReport instanceof VisualDiffError ? undefined : diffReport,
    diffReportPath: report.diffReportPath,
    screenshotAvailable: Boolean(options.actualScreenshotPath),
    artifacts: reportArtifacts(report)
  });

  await writeFile(paths.iterationState, `${JSON.stringify(state, null, 2)}\n`);
}

function reportArtifacts(report: MockPipelineReport): FileArtifact[] {
  return [
    { path: report.requestPath, role: "request" },
    { path: report.designBriefPath, role: "design-brief" },
    { path: report.mockupPath, role: "mockup" },
    { path: report.targetImagePath, role: "target-image" },
    ...(report.generatorIRPath ? [{ path: report.generatorIRPath, role: "generator-ir" }] : []),
    ...(report.generationReportPath ? [{ path: report.generationReportPath, role: "generation-report" }] : []),
    ...(report.diffReportPath ? [{ path: report.diffReportPath, role: "diff-report" }] : []),
    { path: report.iterationStatePath, role: "iteration-state" },
    { path: path.join(report.artifactRoot, "final-report.json"), role: "final-report" }
  ];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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

function toRuntimeError(step: RuntimeStep, message: string, retryable = false): RuntimeError {
  return {
    step,
    message,
    retryable
  };
}
