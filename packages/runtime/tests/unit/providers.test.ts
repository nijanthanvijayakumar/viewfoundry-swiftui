import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertNoNetworkProviderConfig,
  createDesignBrief,
  createStubImagegenProvider,
  createStubPlannerProvider,
  parseRuntimeRequest,
  ProviderConfigError,
  resolveProviderBoundaryConfig
} from "../../src/index.js";

const request = parseRuntimeRequest({
  prompt: "Build a compact onboarding screen for a habit tracker.",
  targetPlatform: "ios",
  primaryDevice: {
    name: "iPhone 16",
    os: "iOS 18",
    appearance: "light"
  }
});

describe("provider boundaries", () => {
  it("defaults to local stubs with no env requirements", () => {
    const config = resolveProviderBoundaryConfig({ env: {} });

    assert.equal(config.allowNetwork, false);
    assert.deepEqual(config.imagegen, {
      kind: "stub",
      mode: "stub",
      requiredEnv: []
    });
    assert.deepEqual(config.planner, {
      kind: "stub",
      mode: "stub",
      requiredEnv: []
    });
    assert.doesNotThrow(() => assertNoNetworkProviderConfig(config));
  });

  it("reports missing future provider env keys without leaking values", () => {
    assert.throws(
      () =>
        resolveProviderBoundaryConfig({
          imagegenProvider: "imagegen",
          env: {
            VIEWFOUNDRY_IMAGEGEN_PROVIDER: "future-provider"
          }
        }),
      (error: unknown) => {
        assert.ok(error instanceof ProviderConfigError);
        assert.equal(error.provider, "imagegen");
        assert.deepEqual(error.missingEnv, ["VIEWFOUNDRY_IMAGEGEN_API_KEY"]);
        assert.doesNotMatch(error.message, /future-provider|secret-value/);
        return true;
      }
    );

    assert.throws(
      () =>
        resolveProviderBoundaryConfig({
          plannerProvider: "planner",
          env: {
            VIEWFOUNDRY_PLANNER_PROVIDER: "future-provider"
          }
        }),
      (error: unknown) => {
        assert.ok(error instanceof ProviderConfigError);
        assert.equal(error.provider, "planner");
        assert.deepEqual(error.missingEnv, ["VIEWFOUNDRY_PLANNER_API_KEY"]);
        assert.match(error.message, /VIEWFOUNDRY_PLANNER_API_KEY/);
        assert.doesNotMatch(error.message, /future-provider|secret-value/);
        return true;
      }
    );
  });

  it("rejects external provider config in no-network policy checks", () => {
    const config = resolveProviderBoundaryConfig({
      imagegenProvider: "imagegen",
      env: {
        VIEWFOUNDRY_IMAGEGEN_PROVIDER: "future-provider",
        VIEWFOUNDRY_IMAGEGEN_API_KEY: "secret-value"
      }
    });

    assert.throws(
      () => assertNoNetworkProviderConfig(config),
      /VIEWFOUNDRY_PROVIDER_NETWORK_DISABLED/
    );
  });

  it("exposes local imagegen and planner test doubles", async () => {
    const imagegen = createStubImagegenProvider();
    const imagegenOutput = await imagegen.createMockup({
      request,
      prompt: "Create a local-only mockup",
      outputPath: ".viewfoundry/runs/test/mockups/target.png",
      width: 64,
      height: 96,
      seed: "test"
    });
    const planner = createStubPlannerProvider(() => ({
      version: "generator-ir/v1",
      targetPlatform: "ios",
      root: {
        kind: "zstack",
        children: []
      }
    }));
    const ir = await planner.plan({
      request,
      designBrief: createDesignBrief(request)
    });

    assert.equal(imagegen.config.mode, "stub");
    assert.equal(imagegenOutput.imagegenRequest.provider, "stub");
    assert.match(imagegenOutput.mockup.notes?.join("\n") ?? "", /no image generation provider/);
    assert.equal(planner.config.mode, "stub");
    assert.equal(ir.version, "generator-ir/v1");
  });
});
