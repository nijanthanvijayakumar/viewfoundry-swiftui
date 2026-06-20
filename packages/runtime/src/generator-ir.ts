import type {
  GeneratorIR,
  GeneratorIRAlignment,
  GeneratorIRButtonNode,
  GeneratorIRForegroundStyle,
  GeneratorIRNode,
  GeneratorIRStackKind,
  GeneratorIRStackNode,
  GeneratorIRSymbolNode,
  GeneratorIRSystemBackground,
  GeneratorIRTextNode,
  GeneratorIRTextStyle
} from "./types.js";

export class GeneratorIRError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(issues.join("; "));
    this.name = "GeneratorIRError";
    this.issues = issues;
  }
}

export function parseGeneratorIR(value: unknown): GeneratorIR {
  const issues: string[] = [];

  if (!isRecord(value)) {
    throw new GeneratorIRError(["generator IR must be an object"]);
  }

  const allowed = new Set([
    "version",
    "targetPlatform",
    "root",
    "unsupportedRequestParts",
    "assumptions"
  ]);
  rejectUnknownKeys(value, allowed, "generatorIR", issues);

  const version = value.version;
  if (version !== "generator-ir/v1") {
    issues.push("generatorIR.version must be generator-ir/v1");
  }

  const targetPlatform = value.targetPlatform;
  if (targetPlatform !== "ios") {
    issues.push("generatorIR.targetPlatform must be ios");
  }

  const root = parseNode(value.root, "generatorIR.root", issues);
  if (root && !isStackNode(root)) {
    issues.push("generatorIR.root must be zstack or vstack");
  }

  const unsupportedRequestParts = readOptionalStringArray(
    value.unsupportedRequestParts,
    "generatorIR.unsupportedRequestParts",
    issues
  );
  const assumptions = readOptionalStringArray(value.assumptions, "generatorIR.assumptions", issues);

  if (issues.length > 0 || !root || !isStackNode(root)) {
    throw new GeneratorIRError(issues);
  }

  return {
    version: "generator-ir/v1",
    targetPlatform: "ios",
    root,
    ...(unsupportedRequestParts ? { unsupportedRequestParts } : {}),
    ...(assumptions ? { assumptions } : {})
  };
}

function parseNode(value: unknown, path: string, issues: string[]): GeneratorIRNode | undefined {
  if (!isRecord(value)) {
    issues.push(`${path} must be an object`);
    return undefined;
  }

  switch (value.kind) {
    case "zstack":
    case "vstack":
      return parseStackNode(value, path, issues);
    case "text":
      return parseTextNode(value, path, issues);
    case "button":
      return parseButtonNode(value, path, issues);
    case "sfSymbol":
      return parseSymbolNode(value, path, issues);
    default:
      issues.push(`${path}.kind must be zstack, vstack, text, button, or sfSymbol`);
      return undefined;
  }
}

function parseStackNode(
  value: Record<string, unknown>,
  path: string,
  issues: string[]
): GeneratorIRStackNode | undefined {
  const allowed = new Set([
    "kind",
    "children",
    "alignment",
    "spacing",
    "padding",
    "background",
    "ignoresSafeArea"
  ]);
  rejectUnknownKeys(value, allowed, path, issues);

  const kind = value.kind as GeneratorIRStackKind;
  const children = readChildren(value.children, `${path}.children`, issues);
  const alignment = readEnum(
    value.alignment,
    ["leading", "center", "trailing"],
    `${path}.alignment`,
    issues
  ) as GeneratorIRAlignment | undefined;
  const background = readEnum(
    value.background,
    ["systemBackground", "secondarySystemBackground"],
    `${path}.background`,
    issues
  ) as GeneratorIRSystemBackground | undefined;
  const spacing = readOptionalNonNegativeNumber(value.spacing, `${path}.spacing`, issues);
  const padding = readOptionalNonNegativeNumber(value.padding, `${path}.padding`, issues);
  const ignoresSafeArea = readOptionalBoolean(value.ignoresSafeArea, `${path}.ignoresSafeArea`, issues);

  if (!children) {
    return undefined;
  }

  return {
    kind,
    children,
    ...(alignment ? { alignment } : {}),
    ...(spacing !== undefined ? { spacing } : {}),
    ...(padding !== undefined ? { padding } : {}),
    ...(background ? { background } : {}),
    ...(ignoresSafeArea !== undefined ? { ignoresSafeArea } : {})
  };
}

function parseTextNode(
  value: Record<string, unknown>,
  path: string,
  issues: string[]
): GeneratorIRTextNode | undefined {
  const allowed = new Set(["kind", "content", "textStyle", "foregroundStyle", "bold"]);
  rejectUnknownKeys(value, allowed, path, issues);

  const content = readRequiredString(value.content, `${path}.content`, issues);
  const textStyle = readTextStyle(value.textStyle, `${path}.textStyle`, issues);
  const foregroundStyle = readForegroundStyle(value.foregroundStyle, `${path}.foregroundStyle`, issues);
  const bold = readOptionalBoolean(value.bold, `${path}.bold`, issues);

  if (!content || !textStyle) {
    return undefined;
  }

  return {
    kind: "text",
    content,
    textStyle,
    ...(foregroundStyle ? { foregroundStyle } : {}),
    ...(bold !== undefined ? { bold } : {})
  };
}

function parseButtonNode(
  value: Record<string, unknown>,
  path: string,
  issues: string[]
): GeneratorIRButtonNode | undefined {
  const allowed = new Set(["kind", "label", "role"]);
  rejectUnknownKeys(value, allowed, path, issues);

  const label = readRequiredString(value.label, `${path}.label`, issues);
  const role = readEnum(value.role, ["primary"], `${path}.role`, issues);
  if (!label || !role) {
    return undefined;
  }

  return {
    kind: "button",
    label,
    role: "primary"
  };
}

function parseSymbolNode(
  value: Record<string, unknown>,
  path: string,
  issues: string[]
): GeneratorIRSymbolNode | undefined {
  const allowed = new Set(["kind", "systemName", "textStyle", "foregroundStyle"]);
  rejectUnknownKeys(value, allowed, path, issues);

  const systemName = readRequiredString(value.systemName, `${path}.systemName`, issues);
  const textStyle = readTextStyle(value.textStyle, `${path}.textStyle`, issues);
  const foregroundStyle = readForegroundStyle(value.foregroundStyle, `${path}.foregroundStyle`, issues);

  if (!systemName) {
    return undefined;
  }

  return {
    kind: "sfSymbol",
    systemName,
    ...(textStyle ? { textStyle } : {}),
    ...(foregroundStyle ? { foregroundStyle } : {})
  };
}

function readChildren(
  value: unknown,
  path: string,
  issues: string[]
): GeneratorIRNode[] | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push(`${path} must be a non-empty array`);
    return undefined;
  }

  const children = value
    .map((child, index) => parseNode(child, `${path}.${index}`, issues))
    .filter((child): child is GeneratorIRNode => child !== undefined);

  return children.length > 0 ? children : undefined;
}

function readTextStyle(
  value: unknown,
  path: string,
  issues: string[]
): GeneratorIRTextStyle | undefined {
  return readEnum(value, ["caption", "headline", "title", "body"], path, issues) as
    | GeneratorIRTextStyle
    | undefined;
}

function readForegroundStyle(
  value: unknown,
  path: string,
  issues: string[]
): GeneratorIRForegroundStyle | undefined {
  return readEnum(value, ["primary", "secondary"], path, issues) as
    | GeneratorIRForegroundStyle
    | undefined;
}

function readEnum(
  value: unknown,
  allowed: readonly string[],
  path: string,
  issues: string[]
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || !allowed.includes(value)) {
    issues.push(`${path} must be ${allowed.join(", ")}`);
    return undefined;
  }

  return value;
}

function readRequiredString(value: unknown, path: string, issues: string[]): string | undefined {
  if (typeof value !== "string" || value.length === 0) {
    issues.push(`${path} must be a non-empty string`);
    return undefined;
  }

  return value;
}

function readOptionalStringArray(
  value: unknown,
  path: string,
  issues: string[]
): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) {
    issues.push(`${path} must be an array of non-empty strings`);
    return undefined;
  }

  return value;
}

function readOptionalNonNegativeNumber(
  value: unknown,
  path: string,
  issues: string[]
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    issues.push(`${path} must be a non-negative number`);
    return undefined;
  }

  return value;
}

function readOptionalBoolean(value: unknown, path: string, issues: string[]): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    issues.push(`${path} must be a boolean`);
    return undefined;
  }

  return value;
}

function rejectUnknownKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
  path: string,
  issues: string[]
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      issues.push(`${path}.${key} is not allowed`);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStackNode(value: GeneratorIRNode): value is GeneratorIRStackNode {
  return value.kind === "zstack" || value.kind === "vstack";
}
