import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createDesignBrief,
  parseRuntimeRequest,
  planGeneratorIRFromBrief,
  PlannerError
} from "../../src/index.js";

const fixtureRequest = parseRuntimeRequest({
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
});

describe("brief-to-IR planner stub", () => {
  it("plans deterministic generator IR from the request design brief fixture", () => {
    const ir = planGeneratorIRFromBrief({
      request: fixtureRequest,
      designBrief: createDesignBrief(fixtureRequest)
    });

    assert.equal(ir.version, "generator-ir/v1");
    assert.equal(ir.root.kind, "zstack");
    assert.equal(ir.root.children[0]?.kind, "vstack");
    assert.deepEqual(ir.unsupportedRequestParts, [
      "smokeDevices not rendered: iPhone SE / iOS 18 / light",
      "visualConstraints.style not rendered: plain SwiftUI; large tap targets",
      "visualConstraints.layout not rendered: single screen; no scrolling",
      "visualConstraints.accessibility not rendered: Dynamic Type friendly",
      "visualConstraints.avoid not rendered: custom runtime dependency"
    ]);
    assert.deepEqual(ir.assumptions, [
      "Planner stub emitted static SwiftUI copy from the design brief.",
      "Generated output is isolated to the sandbox generated view."
    ]);
  });

  it("uses explicit fallback assumptions for unmatched briefs", () => {
    const request = parseRuntimeRequest({
      prompt: "Build a quiet settings screen for notification preferences.",
      targetPlatform: "ios",
      primaryDevice: {
        name: "iPhone 16",
        appearance: "dark"
      }
    });
    const ir = planGeneratorIRFromBrief({
      request,
      designBrief: createDesignBrief(request)
    });

    assert.match(JSON.stringify(ir.root), /quiet settings screen/);
    assert.ok(
      ir.assumptions?.includes("Fallback planner layout used because no richer fixture match exists.")
    );
  });

  it("rejects invalid planner inputs before emitting IR", () => {
    const designBrief = createDesignBrief(fixtureRequest);

    assert.throws(
      () =>
        planGeneratorIRFromBrief({
          request: fixtureRequest,
          designBrief: {
            ...designBrief,
            summary: "Different prompt",
            visualConstraints: undefined,
            acceptanceCriteria: []
          }
        }),
      (error: unknown) => {
        assert.ok(error instanceof PlannerError);
        assert.deepEqual(error.issues, [
          "designBrief.summary must match request.prompt",
          "designBrief.visualConstraints must match request.visualConstraints",
          "designBrief.acceptanceCriteria must be a non-empty array"
        ]);
        return true;
      }
    );
  });
});
