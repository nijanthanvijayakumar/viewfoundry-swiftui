import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";
import type { VisualDiffReport } from "./types.js";

export interface VisualDiffOptions {
  targetPath: string;
  actualPath: string;
  diffPath: string;
  threshold?: number;
}

export class VisualDiffError extends Error {
  readonly step = "diff";
  readonly retryable = false;

  constructor(message: string) {
    super(message);
    this.name = "VisualDiffError";
  }
}

export async function comparePngImages(
  options: VisualDiffOptions
): Promise<VisualDiffReport> {
  const threshold = options.threshold ?? 0.98;
  validateThreshold(threshold);

  const [target, actual] = await Promise.all([
    readPng(options.targetPath),
    readPng(options.actualPath)
  ]);

  if (target.width !== actual.width || target.height !== actual.height) {
    throw new VisualDiffError(
      `image dimensions differ: target ${target.width}x${target.height}, actual ${actual.width}x${actual.height}`
    );
  }

  const diff = new PNG({ width: target.width, height: target.height });
  let absoluteDelta = 0;
  let changedPixels = 0;
  const pixelCount = target.width * target.height;

  for (let index = 0; index < target.data.length; index += 4) {
    const redDelta = Math.abs(target.data[index] - actual.data[index]);
    const greenDelta = Math.abs(target.data[index + 1] - actual.data[index + 1]);
    const blueDelta = Math.abs(target.data[index + 2] - actual.data[index + 2]);
    const alphaDelta = Math.abs(target.data[index + 3] - actual.data[index + 3]);
    const pixelDelta = redDelta + greenDelta + blueDelta + alphaDelta;

    absoluteDelta += pixelDelta;
    if (pixelDelta > 0) {
      changedPixels += 1;
    }

    diff.data[index] = pixelDelta > 0 ? Math.max(redDelta, 12) : 0;
    diff.data[index + 1] = pixelDelta > 0 ? greenDelta : 0;
    diff.data[index + 2] = pixelDelta > 0 ? blueDelta : 0;
    diff.data[index + 3] = pixelDelta > 0 ? 255 : 32;
  }

  const maxDelta = pixelCount * 4 * 255;
  const score = roundScore(1 - absoluteDelta / maxDelta);
  await mkdir(path.dirname(options.diffPath), { recursive: true });
  await writeFile(options.diffPath, PNG.sync.write(diff));

  return {
    targetPath: options.targetPath,
    actualPath: options.actualPath,
    diffPath: options.diffPath,
    score,
    threshold,
    passed: score >= threshold,
    observations: [
      `Compared ${target.width}x${target.height} PNG images.`,
      `${changedPixels} of ${pixelCount} pixels changed.`,
      "Prototype score is normalized per-channel absolute pixel similarity."
    ]
  };
}

async function readPng(imagePath: string): Promise<PNG> {
  try {
    return PNG.sync.read(await readFile(imagePath));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new VisualDiffError(`could not read PNG ${imagePath}: ${message}`);
  }
}

function validateThreshold(threshold: number): void {
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    throw new VisualDiffError("--threshold must be a number between 0 and 1");
  }
}

function roundScore(score: number): number {
  return Math.max(0, Math.min(1, Number(score.toFixed(6))));
}
