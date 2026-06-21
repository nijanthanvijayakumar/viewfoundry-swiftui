import { parseGeneratorIR } from "./generator-ir.js";
import { createDesignBrief } from "./mockup.js";
import type { DesignBrief, GeneratorIR, RuntimeRequest } from "./types.js";

export class PlannerError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(issues.join("; "));
    this.name = "PlannerError";
    this.issues = issues;
  }
}

export interface PlannerInput {
  request: RuntimeRequest;
  designBrief: DesignBrief;
}

export function createGeneratorIRFromRuntimeRequest(request: RuntimeRequest): GeneratorIR {
  return planGeneratorIRFromBrief({
    request,
    designBrief: createDesignBrief(request)
  });
}

export function planGeneratorIRFromBrief(input: PlannerInput): GeneratorIR {
  validatePlannerInput(input);

  const request = input.request;
  const brief = input.designBrief;
  const device = [
    brief.primaryDevice.name,
    brief.primaryDevice.os,
    brief.primaryDevice.appearance
  ]
    .filter(Boolean)
    .join(" / ");
  const ir = {
    version: "generator-ir/v1",
    targetPlatform: "ios",
    root: {
      kind: "zstack",
      background: "systemBackground",
      ignoresSafeArea: true,
      children: [
        {
          kind: "vstack",
          alignment: "leading",
          spacing: 16,
          padding: 24,
          children: [
            {
              kind: "text",
              content: "ViewFoundry Sandbox",
              textStyle: "caption",
              foregroundStyle: "secondary",
              bold: true
            },
            {
              kind: "text",
              content: brief.summary,
              textStyle: "title",
              bold: true
            },
            {
              kind: "text",
              content: device || "Primary device unspecified",
              textStyle: "body",
              foregroundStyle: "secondary"
            }
          ]
        }
      ]
    },
    unsupportedRequestParts: createUnsupportedRequestParts(request),
    assumptions: createPlannerAssumptions(request, brief)
  };

  return parseGeneratorIR(ir);
}

function validatePlannerInput(input: PlannerInput): void {
  const issues: string[] = [];

  if (!isRecord(input)) {
    throw new PlannerError(["planner input must be an object"]);
  }

  const { request, designBrief } = input;
  if (!isRecord(request)) {
    issues.push("planner input request must be an object");
  }
  if (!isRecord(designBrief)) {
    issues.push("planner input designBrief must be an object");
  }
  if (issues.length > 0 || !isRecord(request) || !isRecord(designBrief)) {
    throw new PlannerError(issues);
  }

  if (designBrief.summary !== request.prompt) {
    issues.push("designBrief.summary must match request.prompt");
  }
  if (designBrief.targetPlatform !== request.targetPlatform) {
    issues.push("designBrief.targetPlatform must match request.targetPlatform");
  }
  if (designBrief.targetPlatform !== "ios") {
    issues.push("designBrief.targetPlatform must be ios");
  }
  if (!sameDeviceTarget(designBrief.primaryDevice, request.primaryDevice)) {
    issues.push("designBrief.primaryDevice must match request.primaryDevice");
  }
  if (!sameJsonValue(designBrief.smokeDevices, request.smokeDevices)) {
    issues.push("designBrief.smokeDevices must match request.smokeDevices");
  }
  if (!sameJsonValue(designBrief.visualConstraints, request.visualConstraints)) {
    issues.push("designBrief.visualConstraints must match request.visualConstraints");
  }
  if (!isNonEmptyStringArray(designBrief.acceptanceCriteria)) {
    issues.push("designBrief.acceptanceCriteria must be a non-empty array");
  }
  if (!isNonEmptyStringArray(designBrief.outOfScope)) {
    issues.push("designBrief.outOfScope must be a non-empty array");
  }

  if (issues.length > 0) {
    throw new PlannerError(issues);
  }
}

function createUnsupportedRequestParts(request: RuntimeRequest): string[] | undefined {
  const unsupported: string[] = [];

  if (request.smokeDevices && request.smokeDevices.length > 0) {
    unsupported.push(
      `smokeDevices not rendered: ${request.smokeDevices.map(formatDeviceTarget).join("; ")}`
    );
  }

  for (const [category, values] of Object.entries(request.visualConstraints ?? {})) {
    if (values && values.length > 0) {
      unsupported.push(`visualConstraints.${category} not rendered: ${values.join("; ")}`);
    }
  }

  return unsupported.length > 0 ? unsupported : undefined;
}

function createPlannerAssumptions(request: RuntimeRequest, brief: DesignBrief): string[] {
  const assumptions = [
    "Planner stub emitted static SwiftUI copy from the design brief.",
    "Generated output is isolated to the sandbox generated view."
  ];

  if (!isSupportedFixture(request, brief)) {
    assumptions.push("Fallback planner layout used because no richer fixture match exists.");
  }

  return assumptions;
}

function isSupportedFixture(request: RuntimeRequest, brief: DesignBrief): boolean {
  return (
    request.prompt === "Build a compact onboarding screen for a habit tracker." &&
    brief.acceptanceCriteria.includes("Render one inspectable SwiftUI screen in the sandbox host.")
  );
}

function sameDeviceTarget(left: unknown, right: unknown): boolean {
  if (!isRecord(left) || !isRecord(right)) {
    return false;
  }

  return (
    left.name === right.name &&
    left.os === right.os &&
    left.appearance === right.appearance
  );
}

function sameJsonValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "string" && item.length > 0)
  );
}

function formatDeviceTarget(device: RuntimeRequest["primaryDevice"]): string {
  return [device.name, device.os, device.appearance].filter(Boolean).join(" / ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
