import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createArtifactPaths, createRunId, parseRuntimeRequest, runViewFoundryPlaceholder } from "../../src/index.js";

const sample = {
  prompt: "Build a compact onboarding screen for a habit tracker.",
  targetPlatform: "ios",
  primaryDevice: {
    name: "iPhone 16",
    os: "iOS 18",
    appearance: "light"
  },
  smokeDevices: [
    {
      name: "iPhone SE",
      os: "iOS 18",
      appearance: "light"
    }
  ],
  visualConstraints: {
    style: ["plain SwiftUI", "large tap targets"],
    layout: ["single screen", "no scrolling"],
    accessibility: ["Dynamic Type friendly"],
    avoid: ["custom runtime dependency"]
  }
} as const;

describe("runtime request", () => {
  it("parses the contract sample", () => {
    const request = parseRuntimeRequest(sample);

    assert.equal(request.prompt, sample.prompt);
    assert.equal(request.targetPlatform, "ios");
    assert.equal(request.primaryDevice.name, "iPhone 16");
    assert.equal(request.smokeDevices?.[0]?.name, "iPhone SE");
  });

  it("rejects missing required fields", () => {
    assert.throws(
      () => parseRuntimeRequest({ targetPlatform: "ios" }),
      /prompt must be a non-empty string/
    );
  });
});

describe("placeholder runner", () => {
  it("emits deterministic blocked output", () => {
    const request = parseRuntimeRequest(sample);
    const first = runViewFoundryPlaceholder(request, ".viewfoundry/runs/sample");
    const second = runViewFoundryPlaceholder(request, ".viewfoundry/runs/sample");

    assert.deepEqual(first, second);
    assert.equal(first.status, "blocked");
    assert.equal(first.primaryPassed, false);
    assert.equal(first.errors[0]?.step, "generation");
  });

  it("creates stable run ids from request content", () => {
    const request = parseRuntimeRequest(sample);

    assert.equal(createRunId(request), createRunId(request));
    assert.match(createRunId(request), /^run-[a-f0-9]{12}$/);
  });
});

describe("artifact paths", () => {
  it("matches the runtime contract layout", () => {
    const paths = createArtifactPaths(".viewfoundry/runs/run-sample");

    assert.equal(paths.request, ".viewfoundry/runs/run-sample/request.json");
    assert.equal(paths.designBrief, ".viewfoundry/runs/run-sample/design-brief.json");
    assert.equal(paths.targetImage, ".viewfoundry/runs/run-sample/mockups/target.png");
    assert.equal(paths.generationReport, ".viewfoundry/runs/run-sample/swiftui/generation-report.json");
    assert.equal(paths.primaryScreenshot, ".viewfoundry/runs/run-sample/screenshots/primary.png");
    assert.equal(paths.primaryDiffReport, ".viewfoundry/runs/run-sample/diffs/primary-report.json");
    assert.equal(paths.finalReport, ".viewfoundry/runs/run-sample/final-report.json");
  });
});
