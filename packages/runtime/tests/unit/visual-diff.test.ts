import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, it } from "node:test";
import { PNG } from "pngjs";
import { comparePngImages, VisualDiffError } from "../../src/index.js";

const execFileAsync = promisify(execFile);

describe("visual diff", () => {
  it("passes identical PNG images and writes a diff artifact", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "viewfoundry-diff-"));

    try {
      const target = path.join(tempDir, "target.png");
      const actual = path.join(tempDir, "actual.png");
      const diff = path.join(tempDir, "diff.png");
      await writePng(target, 2, 2, [
        [255, 0, 0, 255],
        [0, 255, 0, 255],
        [0, 0, 255, 255],
        [255, 255, 255, 255]
      ]);
      await writePng(actual, 2, 2, [
        [255, 0, 0, 255],
        [0, 255, 0, 255],
        [0, 0, 255, 255],
        [255, 255, 255, 255]
      ]);

      const report = await comparePngImages({
        targetPath: target,
        actualPath: actual,
        diffPath: diff,
        threshold: 1
      });

      assert.equal(report.score, 1);
      assert.equal(report.passed, true);
      assert.equal(PNG.sync.read(await readFile(diff)).width, 2);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("fails different PNG images below threshold", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "viewfoundry-diff-"));

    try {
      const target = path.join(tempDir, "target.png");
      const actual = path.join(tempDir, "actual.png");
      const diff = path.join(tempDir, "diff.png");
      await writePng(target, 1, 1, [[255, 255, 255, 255]]);
      await writePng(actual, 1, 1, [[0, 0, 0, 255]]);

      const report = await comparePngImages({
        targetPath: target,
        actualPath: actual,
        diffPath: diff,
        threshold: 0.5
      });

      assert.equal(report.score, 0.25);
      assert.equal(report.passed, false);
      assert.match(report.observations?.[1] ?? "", /1 of 1 pixels changed/);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects dimension mismatches explicitly", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "viewfoundry-diff-"));

    try {
      const target = path.join(tempDir, "target.png");
      const actual = path.join(tempDir, "actual.png");
      await writePng(target, 1, 1, [[255, 255, 255, 255]]);
      await writePng(actual, 2, 1, [
        [255, 255, 255, 255],
        [255, 255, 255, 255]
      ]);

      await assert.rejects(
        () =>
          comparePngImages({
            targetPath: target,
            actualPath: actual,
            diffPath: path.join(tempDir, "diff.png")
          }),
        (error) =>
          error instanceof VisualDiffError &&
          /image dimensions differ/.test(error.message)
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("CLI writes the runtime contract report shape", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "viewfoundry-diff-"));

    try {
      const target = path.join(tempDir, "target.png");
      const actual = path.join(tempDir, "actual.png");
      const diff = path.join(tempDir, "primary-diff.png");
      const reportPath = path.join(tempDir, "primary-report.json");
      await writePng(target, 1, 1, [[8, 16, 32, 255]]);
      await writePng(actual, 1, 1, [[8, 16, 32, 255]]);

      const { stdout } = await execFileAsync(process.execPath, [
        "dist/src/diff-cli.js",
        "--target",
        target,
        "--actual",
        actual,
        "--diff",
        diff,
        "--report",
        reportPath
      ]);
      const report = JSON.parse(stdout);

      assert.equal(report.targetPath, target);
      assert.equal(report.actualPath, actual);
      assert.equal(report.diffPath, diff);
      assert.equal(report.score, 1);
      assert.equal(report.passed, true);
      assert.deepEqual(report, JSON.parse(await readFile(reportPath, "utf8")));
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

async function writePng(
  filePath: string,
  width: number,
  height: number,
  pixels: Array<[number, number, number, number]>
): Promise<void> {
  const png = new PNG({ width, height });

  pixels.forEach(([red, green, blue, alpha], pixelIndex) => {
    const offset = pixelIndex * 4;
    png.data[offset] = red;
    png.data[offset + 1] = green;
    png.data[offset + 2] = blue;
    png.data[offset + 3] = alpha;
  });

  await writeFile(filePath, PNG.sync.write(png));
}
