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

export interface IterationState {
  runId: string;
  attempt: number;
  maxAttempts: number;
  status: "running" | RuntimeStatus;
  lastError?: RuntimeError;
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
  errors: RuntimeError[];
  nextActions?: string[];
}
