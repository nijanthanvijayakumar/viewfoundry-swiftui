export type TargetPlatform = "ios";
export type DeviceAppearance = "light" | "dark" | "unspecified";
export type RuntimeStatus = "passed" | "failed" | "blocked";
export type RuntimeStep =
  | "request"
  | "imagegen"
  | "generation"
  | "build"
  | "screenshot"
  | "diff"
  | "report";

export interface DeviceTarget {
  name: string;
  os?: string;
  appearance?: DeviceAppearance;
}

export interface CapturedDeviceTarget {
  name: string;
  os: string;
  appearance: DeviceAppearance;
}

export interface VisualConstraints {
  style?: string[];
  layout?: string[];
  accessibility?: string[];
  avoid?: string[];
}

export interface RuntimeRequest {
  prompt: string;
  targetPlatform: TargetPlatform;
  primaryDevice: DeviceTarget;
  smokeDevices?: DeviceTarget[];
  visualConstraints?: VisualConstraints;
}

export interface DesignBrief {
  summary: string;
  targetPlatform: TargetPlatform;
  primaryDevice: DeviceTarget;
  smokeDevices?: DeviceTarget[];
  visualConstraints?: VisualConstraints;
  acceptanceCriteria: string[];
  outOfScope: string[];
}

export interface ImagegenRequest {
  provider: "stub" | "imagegen";
  prompt: string;
  targetPlatform: TargetPlatform;
  primaryDevice: DeviceTarget;
  visualConstraints?: VisualConstraints;
  outputPath: string;
  width: number;
  height: number;
  seed: string;
}

export interface MockupArtifact {
  kind: "imagegen" | "provided";
  prompt: string;
  imagePath: string;
  width?: number;
  height?: number;
  notes?: string[];
}

export interface FileArtifact {
  path: string;
  role?: string;
}

export interface SwiftUIGenerationOutput {
  entryFile: string;
  sourceFiles: FileArtifact[];
  assetFiles: FileArtifact[];
  unsupportedRequestParts?: string[];
  assumptions?: string[];
}

export type GeneratorIRVersion = "generator-ir/v1";
export type GeneratorIRStackKind = "zstack" | "vstack";
export type GeneratorIRNodeKind = GeneratorIRStackKind | "text" | "button" | "sfSymbol";
export type GeneratorIRAlignment = "leading" | "center" | "trailing";
export type GeneratorIRTextStyle = "caption" | "headline" | "title" | "body";
export type GeneratorIRForegroundStyle = "primary" | "secondary";
export type GeneratorIRSystemBackground = "systemBackground" | "secondarySystemBackground";

export interface GeneratorIR {
  version: GeneratorIRVersion;
  targetPlatform: TargetPlatform;
  root: GeneratorIRStackNode;
  unsupportedRequestParts?: string[];
  assumptions?: string[];
}

export interface GeneratorIRStackNode {
  kind: GeneratorIRStackKind;
  children: GeneratorIRNode[];
  alignment?: GeneratorIRAlignment;
  spacing?: number;
  padding?: number;
  background?: GeneratorIRSystemBackground;
  ignoresSafeArea?: boolean;
}

export interface GeneratorIRTextNode {
  kind: "text";
  content: string;
  textStyle: GeneratorIRTextStyle;
  foregroundStyle?: GeneratorIRForegroundStyle;
  bold?: boolean;
}

export interface GeneratorIRButtonNode {
  kind: "button";
  label: string;
  role: "primary";
}

export interface GeneratorIRSymbolNode {
  kind: "sfSymbol";
  systemName: string;
  textStyle?: GeneratorIRTextStyle;
  foregroundStyle?: GeneratorIRForegroundStyle;
}

export type GeneratorIRNode =
  | GeneratorIRStackNode
  | GeneratorIRTextNode
  | GeneratorIRButtonNode
  | GeneratorIRSymbolNode;

export interface SimulatorScreenshotArtifact {
  device: CapturedDeviceTarget;
  path: string;
  capturedAt: string;
}

export interface VisualDiffReport {
  targetPath: string;
  actualPath: string;
  diffPath: string;
  score: number;
  threshold: number;
  passed: boolean;
  observations?: string[];
}

export interface RuntimeError {
  step: RuntimeStep;
  message: string;
  retryable: boolean;
}

export type IterationFeedbackSource = "diff" | "report";

export interface IterationFeedback {
  source: IterationFeedbackSource;
  step: RuntimeStep;
  message: string;
  retryable: boolean;
  score?: number;
  threshold?: number;
  artifactPath?: string;
}

export interface NextAttemptPlan {
  attempt: number;
  reason: string;
  actions: string[];
  feedback: IterationFeedback[];
}

export interface IterationState {
  runId: string;
  attempt: number;
  maxAttempts: number;
  status: "running" | RuntimeStatus;
  lastError?: RuntimeError;
  feedback?: IterationFeedback[];
  nextAttempt?: NextAttemptPlan;
  stopReason?: string;
  artifacts?: FileArtifact[];
}

export type SmokeResult =
  | {
      device: DeviceTarget;
      passed: true;
      screenshot: SimulatorScreenshotArtifact;
    }
  | {
      device: DeviceTarget;
      passed: false;
      failureArtifactPath: string;
      error: RuntimeError;
    };

export interface FinalReport {
  runId: string;
  status: RuntimeStatus;
  primaryPassed: boolean;
  primaryScreenshot?: SimulatorScreenshotArtifact;
  smokeResults?: SmokeResult[];
  artifactRoot: string;
  swiftuiEntryFile?: string;
  diffReportPath?: string;
  iterationStatePath?: string;
  errors: RuntimeError[];
  nextActions?: string[];
}
