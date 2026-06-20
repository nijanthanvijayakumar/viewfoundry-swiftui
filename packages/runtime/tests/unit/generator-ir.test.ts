import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { GeneratorIRError, parseGeneratorIR } from "../../src/index.js";

const fixtureRoot = path.join("tests", "fixtures", "generator-ir");

async function readFixture(name: string): Promise<unknown> {
  return JSON.parse(await readFile(path.join(fixtureRoot, name), "utf8"));
}

describe("generator IR", () => {
  it("parses the first supported SwiftUI subset", async () => {
    const ir = parseGeneratorIR(await readFixture("onboarding-basic.json"));

    assert.equal(ir.version, "generator-ir/v1");
    assert.equal(ir.targetPlatform, "ios");
    assert.equal(ir.root.kind, "zstack");
    assert.equal(ir.root.children[0]?.kind, "vstack");
    assert.deepEqual(ir.assumptions, ["Static onboarding copy only."]);
  });

  it("rejects malformed supported nodes", async () => {
    const fixture = await readFixture("malformed.json");

    assert.throws(
      () => parseGeneratorIR(fixture),
      (error: unknown) => {
        assert.ok(error instanceof GeneratorIRError);
        assert.deepEqual(error.issues, [
          "generatorIR.root.children.0.content must be a non-empty string",
          "generatorIR.root.children.0.textStyle must be caption, headline, title, body",
          "generatorIR.root.spacing must be a non-negative number"
        ]);
        return true;
      }
    );
  });

  it("rejects unsupported layout and component structures", async () => {
    const fixture = await readFixture("unsupported-structure.json");

    assert.throws(
      () => parseGeneratorIR(fixture),
      (error: unknown) => {
        assert.ok(error instanceof GeneratorIRError);
        assert.deepEqual(error.issues, [
          "generatorIR.root.kind must be zstack, vstack, text, button, or sfSymbol"
        ]);
        return true;
      }
    );
  });

  it("rejects malformed children even when siblings are valid", () => {
    assert.throws(
      () =>
        parseGeneratorIR({
          version: "generator-ir/v1",
          targetPlatform: "ios",
          root: {
            kind: "vstack",
            children: [
              {
                kind: "text",
                content: "Valid",
                textStyle: "body"
              },
              {
                kind: "button",
                label: "Missing role"
              },
              {
                kind: "text",
                content: "Missing style"
              }
            ]
          }
        }),
      (error: unknown) => {
        assert.ok(error instanceof GeneratorIRError);
        assert.deepEqual(error.issues, [
          "generatorIR.root.children.1.role must be primary",
          "generatorIR.root.children.2.textStyle must be caption, headline, title, body"
        ]);
        return true;
      }
    );
  });

  it("requires a stack root", () => {
    assert.throws(
      () =>
        parseGeneratorIR({
          version: "generator-ir/v1",
          targetPlatform: "ios",
          root: {
            kind: "text",
            content: "Title",
            textStyle: "title"
          }
        }),
      /generatorIR.root must be zstack or vstack/
    );
  });
});
