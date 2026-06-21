import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import {
  emitSwiftUI,
  parseGeneratorIR,
  swiftStringLiteral,
  SwiftUIEmitterError
} from "../../src/index.js";
import type { GeneratorIR } from "../../src/index.js";

const fixtureRoot = path.join("tests", "fixtures", "generator");
const entryFile = ".viewfoundry/runs/fixture/swiftui/Sources/ViewFoundryGeneratedView.swift";

async function readText(file: string): Promise<string> {
  return readFile(file, "utf8");
}

async function readJson(file: string): Promise<unknown> {
  return JSON.parse(await readText(file));
}

async function assertFixture(name: string): Promise<void> {
  const root = path.join(fixtureRoot, name);
  const ir = parseGeneratorIR(await readJson(path.join(root, "request.json")));
  const emission = emitSwiftUI(ir, entryFile);

  assert.equal(
    emission.source,
    await readText(path.join(root, "expected", "ViewFoundryGeneratedView.swift"))
  );
  assert.deepEqual(
    emission.report,
    await readJson(path.join(root, "expected", "generation-report.json"))
  );
}

describe("SwiftUI emitter", () => {
  it("emits deterministic onboarding SwiftUI", async () => {
    await assertFixture("onboarding-basic");
  });

  it("emits deterministic dense settings SwiftUI", async () => {
    await assertFixture("dense-settings");
  });

  it("reports unsupported request parts without emitting them", async () => {
    await assertFixture("unsupported-parts");
  });

  it("escapes Swift string literals", () => {
    assert.equal(
      swiftStringLiteral("A\bB\fC\u0000D \"quoted\" \\ path\u2028tail"),
      "\"A\\u{8}B\\u{c}C\\u{0}D \\\"quoted\\\" \\\\ path\\u{2028}tail\""
    );
  });

  it("rejects unsupported render-time nodes", () => {
    const ir = {
      version: "generator-ir/v1",
      targetPlatform: "ios",
      root: {
        kind: "vstack",
        children: [
          {
            kind: "remoteImage",
            url: "https://example.invalid/image.png"
          }
        ]
      }
    } as unknown as GeneratorIR;

    assert.throws(() => emitSwiftUI(ir, entryFile), SwiftUIEmitterError);
  });
});
