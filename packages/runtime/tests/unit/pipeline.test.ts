import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, it } from "node:test";
import { PNG } from "pngjs";
import { parseRuntimeRequest, runMockPipeline } from "../../src/index.js";

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
    style: ["plain SwiftUI"],
    layout: ["single screen"]
  }
} as const;

describe("mock pipeline", () => {
  it("writes no-network artifacts and a blocked report when screenshot is absent", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "viewfoundry-pipeline-"));
    const sandboxOutput = path.join(tempDir, "Generated", "ViewFoundryGeneratedView.swift");

    try {
      const report = await runMockPipeline(parseRuntimeRequest(sample), {
        artifactRoot: tempDir,
        width: 32,
        height: 48,
        sandboxGeneratedFile: sandboxOutput
      });

      assert.equal(report.status, "blocked");
      assert.equal(report.primaryPassed, false);
      assert.equal(report.steps.find((step) => step.step === "imagegen")?.status, "completed");
      assert.equal(report.steps.find((step) => step.step === "generation")?.status, "completed");
      assert.equal(report.steps.find((step) => step.step === "screenshot")?.status, "skipped");
      assert.equal(report.steps.find((step) => step.step === "diff")?.status, "skipped");
      assert.equal(report.generatorIRPath, path.join(tempDir, "swiftui", "generator-ir.json"));
      assert.equal(report.iterationStatePath, path.join(tempDir, "iteration-state.json"));
      assert.equal(
        JSON.parse(await readFile(path.join(tempDir, "iteration-state.json"), "utf8")).status,
        "blocked"
      );
      assert.equal(PNG.sync.read(await readFile(path.join(tempDir, "mockups", "target.png"))).width, 32);
      assert.equal(
        JSON.parse(await readFile(path.join(tempDir, "swiftui", "generator-ir.json"), "utf8")).version,
        "generator-ir/v1"
      );
      assert.match(await readFile(sandboxOutput, "utf8"), /Build a compact onboarding screen/);
      assert.deepEqual(
        JSON.parse(await readFile(path.join(tempDir, "swiftui", "generation-report.json"), "utf8"))
          .unsupportedRequestParts,
        [
          "visualConstraints.style not rendered: plain SwiftUI",
          "visualConstraints.layout not rendered: single screen"
        ]
      );
      assert.deepEqual(
        JSON.parse(await readFile(path.join(tempDir, "final-report.json"), "utf8")),
        report
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("runs visual diff when an actual screenshot is provided", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "viewfoundry-pipeline-"));
    const actual = path.join(tempDir, "actual.png");

    try {
      const request = parseRuntimeRequest(sample);
      await runMockPipeline(request, {
        artifactRoot: tempDir,
        width: 32,
        height: 48,
        sandboxGeneratedFile: path.join(tempDir, "Generated.swift")
      });
      await writeFile(actual, await readFile(path.join(tempDir, "mockups", "target.png")));

      const report = await runMockPipeline(request, {
        artifactRoot: tempDir,
        width: 32,
        height: 48,
        actualScreenshotPath: actual,
        sandboxGeneratedFile: path.join(tempDir, "Generated.swift")
      });

      assert.equal(report.status, "blocked");
      assert.equal(report.primaryPassed, false);
      assert.equal(report.steps.find((step) => step.step === "diff")?.status, "completed");
      assert.equal(JSON.parse(await readFile(path.join(tempDir, "diffs", "primary-report.json"), "utf8")).passed, true);
      assert.match(
        JSON.parse(await readFile(path.join(tempDir, "iteration-state.json"), "utf8")).stopReason,
        /screenshot metadata is unavailable/
      );
      assert.equal(
        JSON.parse(await readFile(path.join(tempDir, "iteration-state.json"), "utf8")).nextAttempt,
        undefined
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("CLI validates input and writes pipeline artifacts", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "viewfoundry-pipeline-"));
    const input = path.join(tempDir, "request.json");
    const output = path.join(tempDir, "run");

    try {
      await writeFile(input, `${JSON.stringify(sample)}\n`);
      const { stdout } = await execFileAsync(process.execPath, [
        "dist/src/pipeline-cli.js",
        "--input",
        input,
        "--output",
        output,
        "--width",
        "32",
        "--height",
        "48",
        "--sandbox-output",
        path.join(tempDir, "Generated.swift")
      ]);
      const report = JSON.parse(stdout);

      assert.equal(report.artifactRoot, output);
      assert.equal(report.status, "blocked");
      assert.equal(report.generatorIRPath, path.join(output, "swiftui", "generator-ir.json"));
      assert.equal(report.generationReportPath, path.join(output, "swiftui", "generation-report.json"));
      assert.equal(report.steps.some((step: { status: string }) => step.status === "skipped"), true);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when diff input dimensions do not match", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "viewfoundry-pipeline-"));
    const actual = path.join(tempDir, "actual.png");

    try {
      await writeFile(actual, PNG.sync.write(new PNG({ width: 8, height: 8 })));
      const report = await runMockPipeline(parseRuntimeRequest(sample), {
        artifactRoot: tempDir,
        width: 32,
        height: 48,
        actualScreenshotPath: actual,
        sandboxGeneratedFile: path.join(tempDir, "Generated.swift")
      });

      assert.equal(report.status, "failed");
      assert.match(report.errors[0]?.message, /image dimensions differ/);
      assert.equal(report.steps.find((step) => step.step === "diff")?.status, "failed");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("writes a failed final report when SwiftUI generation fails", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "viewfoundry-pipeline-"));

    try {
      const report = await runMockPipeline(parseRuntimeRequest(sample), {
        artifactRoot: tempDir,
        width: 32,
        height: 48,
        sandboxGeneratedFile: tempDir
      });

      assert.equal(report.status, "failed");
      assert.equal(report.primaryPassed, false);
      assert.equal(report.steps.find((step) => step.step === "generation")?.status, "failed");
      assert.match(report.errors[0]?.message ?? "", /EISDIR|illegal operation on a directory/);
      assert.equal(report.generatorIRPath, path.join(tempDir, "swiftui", "generator-ir.json"));
      assert.equal(report.generationReportPath, undefined);
      assert.deepEqual(
        JSON.parse(await readFile(path.join(tempDir, "final-report.json"), "utf8")),
        report
      );
      assert.equal(
        JSON.parse(await readFile(path.join(tempDir, "swiftui", "generator-ir.json"), "utf8")).version,
        "generator-ir/v1"
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("records below-threshold diffs as failed steps with errors", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "viewfoundry-pipeline-"));
    const actual = path.join(tempDir, "actual.png");

    try {
      const png = new PNG({ width: 32, height: 48 });
      for (let offset = 0; offset < png.data.length; offset += 4) {
        png.data[offset] = 255;
        png.data[offset + 1] = 0;
        png.data[offset + 2] = 0;
        png.data[offset + 3] = 255;
      }
      await writeFile(actual, PNG.sync.write(png));

      const report = await runMockPipeline(parseRuntimeRequest(sample), {
        artifactRoot: tempDir,
        width: 32,
        height: 48,
        actualScreenshotPath: actual,
        sandboxGeneratedFile: path.join(tempDir, "Generated.swift")
      });

      assert.equal(report.status, "failed");
      assert.match(report.errors[0]?.message, /below threshold/);
      assert.equal(report.errors[0]?.retryable, true);
      assert.equal(report.steps.find((step) => step.step === "diff")?.status, "failed");
      assert.match(report.steps.find((step) => step.step === "diff")?.reason ?? "", /below threshold/);
      assert.equal(
        JSON.parse(await readFile(path.join(tempDir, "iteration-state.json"), "utf8")).nextAttempt
          .attempt,
        2
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("escapes generated Swift text literals with Swift syntax", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "viewfoundry-pipeline-"));
    const sandboxOutput = path.join(tempDir, "Generated.swift");

    try {
      await runMockPipeline(
        parseRuntimeRequest({
          ...sample,
          prompt: "A\bB\fC\u0000D \"quoted\" \\ path",
          primaryDevice: {
            ...sample.primaryDevice,
            name: "iPhone\u2028Fold"
          }
        }),
        {
          artifactRoot: tempDir,
          width: 32,
          height: 48,
          sandboxGeneratedFile: sandboxOutput
        }
      );

      const source = await readFile(sandboxOutput, "utf8");
      assert.match(source, /Text\("A\\u\{8\}B\\u\{c\}C\\u\{0\}D \\"quoted\\" \\\\ path"\)/);
      assert.match(source, /iPhone\\u\{2028\}Fold/);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
