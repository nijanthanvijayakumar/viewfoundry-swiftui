import type {
  FileArtifact,
  IterationFeedback,
  IterationState,
  RuntimeError,
  RuntimeStatus,
  VisualDiffReport
} from "./types.js";

export const DEFAULT_MAX_ATTEMPTS = 3;

export interface PlanIterationStateInput {
  runId: string;
  attempt?: number;
  maxAttempts?: number;
  finalStatus: RuntimeStatus;
  errors?: RuntimeError[];
  diffReport?: VisualDiffReport;
  diffReportPath?: string;
  screenshotAvailable?: boolean;
  artifacts?: FileArtifact[];
}

export class IterationPlanningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IterationPlanningError";
  }
}

export function planIterationState(input: PlanIterationStateInput): IterationState {
  const attempt = validatePositiveInteger(input.attempt ?? 1, "attempt");
  const maxAttempts = validatePositiveInteger(input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS, "maxAttempts");

  if (attempt > maxAttempts) {
    throw new IterationPlanningError("attempt must be less than or equal to maxAttempts");
  }

  validateDiffReport(input.diffReport);

  const feedback = collectFeedback(input);
  const lastError = lastRuntimeError(feedback);

  if (input.finalStatus === "passed") {
    return {
      runId: input.runId,
      attempt,
      maxAttempts,
      status: "passed",
      ...(lastError ? { lastError } : {}),
      feedback,
      stopReason: "Primary screenshot and visual diff passed.",
      artifacts: input.artifacts ?? []
    };
  }

  const retryable = feedback.filter((item) => item.retryable);
  if (retryable.length === 0) {
    return {
      runId: input.runId,
      attempt,
      maxAttempts,
      status: input.finalStatus,
      ...(lastError ? { lastError } : {}),
      feedback,
      stopReason: feedback[0]?.message ?? "No retryable feedback is available.",
      artifacts: input.artifacts ?? []
    };
  }

  if (attempt >= maxAttempts) {
    return {
      runId: input.runId,
      attempt,
      maxAttempts,
      status: input.finalStatus,
      ...(lastError ? { lastError } : {}),
      feedback,
      stopReason: `maxAttempts ${maxAttempts} reached.`,
      artifacts: input.artifacts ?? []
    };
  }

  return {
    runId: input.runId,
    attempt,
    maxAttempts,
    status: "running",
    ...(lastError ? { lastError } : {}),
    feedback,
    nextAttempt: {
      attempt: attempt + 1,
      reason: retryable[0]?.message ?? "Retryable feedback is available.",
      actions: retryActions(retryable),
      feedback: retryable
    },
    artifacts: input.artifacts ?? []
  };
}

function collectFeedback(input: PlanIterationStateInput): IterationFeedback[] {
  const feedback: IterationFeedback[] = [];

  if (input.diffReport) {
    feedback.push({
      source: "diff",
      step: "diff",
      message: input.diffReport.passed
        ? `Visual diff passed with score ${input.diffReport.score} at threshold ${input.diffReport.threshold}.`
        : `Visual diff score ${input.diffReport.score} is below threshold ${input.diffReport.threshold}.`,
      retryable: !input.diffReport.passed,
      score: input.diffReport.score,
      threshold: input.diffReport.threshold,
      ...(input.diffReportPath ? { artifactPath: input.diffReportPath } : {})
    });
  }

  for (const error of input.errors ?? []) {
    feedback.push({
      source: "report",
      step: error.step,
      message: error.message,
      retryable: error.retryable
    });
  }

  if (input.finalStatus !== "passed" && !input.screenshotAvailable) {
    feedback.push({
      source: "report",
      step: "screenshot",
      message: "No primary screenshot PNG was available; capture is required before visual retry planning.",
      retryable: false
    });
  } else if (input.finalStatus === "blocked" && input.diffReport?.passed) {
    feedback.push({
      source: "report",
      step: "screenshot",
      message: "Primary screenshot metadata is unavailable in the mocked pipeline; report cannot pass.",
      retryable: false
    });
  }

  if (input.finalStatus !== "passed" && feedback.length === 0) {
    feedback.push({
      source: "report",
      step: "report",
      message: "No retryable report or diff feedback is available.",
      retryable: false
    });
  }

  return feedback;
}

function retryActions(feedback: IterationFeedback[]): string[] {
  if (feedback.some((item) => item.step === "diff")) {
    return [
      "Use the diff score and observations to revise generated SwiftUI.",
      "Rerun primary screenshot capture and visual diff before accepting."
    ];
  }

  return ["Fix the retryable local runtime failure, then rerun the attempt."];
}

function lastRuntimeError(feedback: IterationFeedback[]): RuntimeError | undefined {
  const item = feedback.find((candidate) => candidate.source === "report") ?? feedback[0];
  if (!item) {
    return undefined;
  }

  return {
    step: item.step,
    message: item.message,
    retryable: item.retryable
  };
}

function validatePositiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new IterationPlanningError(`${name} must be a positive integer`);
  }
  return value;
}

function validateDiffReport(report: VisualDiffReport | undefined): void {
  if (!report) {
    return;
  }

  if (!Number.isFinite(report.score) || report.score < 0 || report.score > 1) {
    throw new IterationPlanningError("diff feedback score must be between 0 and 1");
  }
  if (!Number.isFinite(report.threshold) || report.threshold < 0 || report.threshold > 1) {
    throw new IterationPlanningError("diff feedback threshold must be between 0 and 1");
  }
  if (typeof report.passed !== "boolean") {
    throw new IterationPlanningError("diff feedback passed must be boolean");
  }
}
