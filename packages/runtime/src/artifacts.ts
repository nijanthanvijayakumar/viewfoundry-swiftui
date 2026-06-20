import path from "node:path";

export interface ArtifactPaths {
  root: string;
  request: string;
  designBrief: string;
  mockups: string;
  mockup: string;
  targetImage: string;
  swiftui: string;
  swiftuiSources: string;
  swiftuiAssets: string;
  generationReport: string;
  screenshots: string;
  primaryScreenshot: string;
  diffs: string;
  primaryDiff: string;
  primaryDiffReport: string;
  iterationState: string;
  finalReport: string;
}

export function createArtifactPaths(root: string): ArtifactPaths {
  return {
    root,
    request: path.join(root, "request.json"),
    designBrief: path.join(root, "design-brief.json"),
    mockups: path.join(root, "mockups"),
    mockup: path.join(root, "mockups", "mockup.json"),
    targetImage: path.join(root, "mockups", "target.png"),
    swiftui: path.join(root, "swiftui"),
    swiftuiSources: path.join(root, "swiftui", "Sources"),
    swiftuiAssets: path.join(root, "swiftui", "Assets.xcassets"),
    generationReport: path.join(root, "swiftui", "generation-report.json"),
    screenshots: path.join(root, "screenshots"),
    primaryScreenshot: path.join(root, "screenshots", "primary.png"),
    diffs: path.join(root, "diffs"),
    primaryDiff: path.join(root, "diffs", "primary-diff.png"),
    primaryDiffReport: path.join(root, "diffs", "primary-report.json"),
    iterationState: path.join(root, "iteration-state.json"),
    finalReport: path.join(root, "final-report.json")
  };
}
