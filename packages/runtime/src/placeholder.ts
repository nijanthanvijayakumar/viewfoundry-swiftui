import { createHash } from "node:crypto";
import type { FinalReport, RuntimeRequest } from "./types.js";

export function createRunId(request: RuntimeRequest): string {
  const canonical = JSON.stringify(sortValue(request));
  return `run-${createHash("sha256").update(canonical).digest("hex").slice(0, 12)}`;
}

export function runViewFoundryPlaceholder(
  request: RuntimeRequest,
  artifactRoot?: string
): FinalReport {
  const runId = createRunId(request);
  const root = artifactRoot ?? `.viewfoundry/runs/${runId}`;

  return {
    runId,
    status: "blocked",
    primaryPassed: false,
    artifactRoot: root,
    errors: [
      {
        step: "generation",
        message: "SwiftUI generation is not implemented in the runtime skeleton.",
        retryable: false
      }
    ],
    nextActions: [
      "Implement imagegen mockup creation.",
      "Implement SwiftUI generation.",
      "Implement simulator screenshot capture.",
      "Implement primary visual diff."
    ]
  };
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, sortValue(item)])
    );
  }

  return value;
}
