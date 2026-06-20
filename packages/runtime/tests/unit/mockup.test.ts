import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, it } from "node:test";
import { PNG } from "pngjs";
import { createMockupStub, parseRuntimeRequest } from "../../src/index.js";

const execFileAsync = promisify(execFile);

const sample = {
  prompt: "Build a compact onboarding screen for a habit tracker.",
  targetPlatform: "ios",
  primaryDevice: {
    name: "iPhone 16",
    os: "iOS 18",
    appearance: "light"
  },
  visualConstraints: {
    style: ["plain SwiftUI", "large tap targets"],
    layout: ["single screen", "no scrolling"],
    accessibility: ["Dynamic Type friendly"],
    avoid: ["custom runtime dependency"]
  }
} as const;

describe("mockup stub", () => {
  it("writes deterministic design brief, request metadata, artifact JSON, and PNG", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "viewfoundry-mockup-"));

    try {
      const request = parseRuntimeRequest(sample);
      const first = await createMockupStub(request, {
        artifactRoot: tempDir,
        width: 64,
        height: 96
      });
      const firstPng = await readFile(path.join(tempDir, "mockups", "target.png"));
      const second = await createMockupStub(request, {
        artifactRoot: tempDir,
        width: 64,
        height: 96
      });
      const secondPng = await readFile(path.join(tempDir, "mockups", "target.png"));
      const mockup = JSON.parse(
        await readFile(path.join(tempDir, "mockups", "mockup.json"), "utf8")
      );
      const imagegen = JSON.parse(
        await readFile(path.join(tempDir, "mockups", "imagegen-request.json"), "utf8")
      );
      const designBrief = JSON.parse(
        await readFile(path.join(tempDir, "design-brief.json"), "utf8")
      );

      assert.deepEqual(first, second);
      assert.deepEqual(firstPng, secondPng);
      assert.equal(first.mockup.kind, "imagegen");
      assert.equal(mockup.imagePath, path.join(tempDir, "mockups", "target.png"));
      assert.equal(imagegen.provider, "stub");
      assert.equal(imagegen.width, 64);
      assert.equal(designBrief.targetPlatform, "ios");
      assert.equal(PNG.sync.read(firstPng).height, 96);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects invalid stub dimensions", async () => {
    const request = parseRuntimeRequest(sample);
    await assert.rejects(
      () => createMockupStub(request, { width: 0 }),
      /--width must be a positive integer/
    );
  });

  it("CLI validates input and writes mockup artifacts", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "viewfoundry-mockup-"));
    const input = path.join(tempDir, "request.json");
    const output = path.join(tempDir, "run");

    try {
      await writeFile(input, `${JSON.stringify(sample)}\n`);
      const { stdout } = await execFileAsync(process.execPath, [
        "dist/src/mockup-cli.js",
        "--input",
        input,
        "--output",
        output,
        "--width",
        "32",
        "--height",
        "48"
      ]);
      const result = JSON.parse(stdout);

      assert.equal(result.artifactRoot, output);
      assert.equal(result.imagegenRequest.provider, "stub");
      assert.equal(result.mockup.width, 32);
      const mockupImage = PNG.sync.read(
        await readFile(path.join(output, "mockups", "target.png"))
      );
      assert.equal(mockupImage.width, 32);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
