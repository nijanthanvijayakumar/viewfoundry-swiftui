import type {
  DeviceAppearance,
  DeviceTarget,
  RuntimeRequest,
  TargetPlatform,
  VisualConstraints
} from "./types.js";

export class RuntimeRequestError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(issues.join("; "));
    this.name = "RuntimeRequestError";
    this.issues = issues;
  }
}

export function parseRuntimeRequest(value: unknown): RuntimeRequest {
  const issues: string[] = [];

  if (!isRecord(value)) {
    throw new RuntimeRequestError(["request must be an object"]);
  }

  const prompt = readRequiredString(value, "prompt", issues);
  const targetPlatform = readTargetPlatform(value.targetPlatform, issues);
  const primaryDevice = readDeviceTarget(value.primaryDevice, "primaryDevice", issues);
  const smokeDevices = readDeviceArray(value.smokeDevices, "smokeDevices", issues);
  const visualConstraints = readVisualConstraints(value.visualConstraints, issues);

  const allowed = new Set([
    "prompt",
    "targetPlatform",
    "primaryDevice",
    "smokeDevices",
    "visualConstraints"
  ]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      issues.push(`${key} is not allowed`);
    }
  }

  if (issues.length > 0 || !prompt || !targetPlatform || !primaryDevice) {
    throw new RuntimeRequestError(issues);
  }

  return {
    prompt,
    targetPlatform,
    primaryDevice,
    ...(smokeDevices ? { smokeDevices } : {}),
    ...(visualConstraints ? { visualConstraints } : {})
  };
}

function readRequiredString(
  value: Record<string, unknown>,
  key: string,
  issues: string[]
): string | undefined {
  const raw = value[key];
  if (typeof raw !== "string" || raw.length === 0) {
    issues.push(`${key} must be a non-empty string`);
    return undefined;
  }
  return raw;
}

function readTargetPlatform(value: unknown, issues: string[]): TargetPlatform | undefined {
  if (value !== "ios") {
    issues.push("targetPlatform must be ios");
    return undefined;
  }
  return value;
}

function readDeviceTarget(
  value: unknown,
  prefix: string,
  issues: string[]
): DeviceTarget | undefined {
  if (!isRecord(value)) {
    issues.push(`${prefix} must be an object`);
    return undefined;
  }

  const name = value.name;
  const os = value.os;
  const appearance = value.appearance;
  const allowed = new Set(["name", "os", "appearance"]);

  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      issues.push(`${prefix}.${key} is not allowed`);
    }
  }

  if (typeof name !== "string" || name.length === 0) {
    issues.push(`${prefix}.name must be a non-empty string`);
    return undefined;
  }

  if (os !== undefined && (typeof os !== "string" || os.length === 0)) {
    issues.push(`${prefix}.os must be a non-empty string`);
  }

  if (appearance !== undefined && !isDeviceAppearance(appearance)) {
    issues.push(`${prefix}.appearance must be light, dark, or unspecified`);
  }

  return {
    name,
    ...(typeof os === "string" && os.length > 0 ? { os } : {}),
    ...(isDeviceAppearance(appearance) ? { appearance } : {})
  };
}

function readDeviceArray(
  value: unknown,
  prefix: string,
  issues: string[]
): DeviceTarget[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    issues.push(`${prefix} must be an array`);
    return undefined;
  }

  return value
    .map((item, index) => readDeviceTarget(item, `${prefix}.${index}`, issues))
    .filter((device): device is DeviceTarget => device !== undefined);
}

function readVisualConstraints(
  value: unknown,
  issues: string[]
): VisualConstraints | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    issues.push("visualConstraints must be an object");
    return undefined;
  }

  const allowed = new Set(["style", "layout", "accessibility", "avoid"]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      issues.push(`visualConstraints.${key} is not allowed`);
    }
  }

  const constraints: VisualConstraints = {};
  for (const key of allowed) {
    const raw = value[key];
    if (raw === undefined) {
      continue;
    }

    if (
      !Array.isArray(raw) ||
      raw.some((item) => typeof item !== "string" || item.length === 0)
    ) {
      issues.push(`visualConstraints.${key} must be an array of non-empty strings`);
      continue;
    }

    constraints[key as keyof VisualConstraints] = raw;
  }

  return constraints;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDeviceAppearance(value: unknown): value is DeviceAppearance {
  return value === "light" || value === "dark" || value === "unspecified";
}
