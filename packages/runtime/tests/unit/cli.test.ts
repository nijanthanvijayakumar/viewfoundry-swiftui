import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, it } from "node:test";

const execFileAsync = promisify(execFile);

describe("cli", () => {
  it("validates input and prints deterministic placeholder JSON", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "viewfoundry-runtime-"));
    const input = path.join(tempDir, "request.json");

    try {
      await writeFile(
        input,
        JSON.stringify({
          prompt: "Build a compact onboarding screen.",
          targetPlatform: "ios",
          primaryDevice: {
            name: "iPhone 16"
          }
        })
      );

      const { stdout } = await execFileAsync(process.execPath, [
        "dist/src/cli.js",
        "--input",
        input,
        "--output",
        ".viewfoundry/runs/sample"
      ]);
      const output = JSON.parse(stdout);

      assert.equal(output.status, "blocked");
      assert.equal(output.primaryPassed, false);
      assert.equal(output.artifactRoot, ".viewfoundry/runs/sample");
      assert.equal(output.errors[0].step, "generation");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
