import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";
import { createArtifactPaths } from "./artifacts.js";
import { createRunId } from "./placeholder.js";
import { createStubImagegenProvider } from "./providers.js";
import { parseRuntimeRequest } from "./validation.js";
import type { DesignBrief, ImagegenRequest, MockupArtifact, RuntimeRequest } from "./types.js";

export interface MockupStubOptions {
  artifactRoot?: string;
  width?: number;
  height?: number;
}

export interface MockupStubResult {
  runId: string;
  artifactRoot: string;
  designBrief: DesignBrief;
  imagegenRequest: ImagegenRequest;
  mockup: MockupArtifact;
}

export async function createMockupStub(
  request: RuntimeRequest,
  options: MockupStubOptions = {}
): Promise<MockupStubResult> {
  const runId = createRunId(request);
  const artifactRoot = options.artifactRoot ?? `.viewfoundry/runs/${runId}`;
  const width = options.width ?? 390;
  const height = options.height ?? 844;
  validateDimensions(width, height);

  const paths = createArtifactPaths(artifactRoot);
  const designBrief = createDesignBrief(request);
  const imagegenPrompt = createImagegenPrompt(request);
  const imagegenProvider = createStubImagegenProvider();
  const providerOutput = await imagegenProvider.createMockup({
    request,
    prompt: imagegenPrompt,
    width,
    height,
    outputPath: paths.targetImage,
    seed: runId
  });
  const { imagegenRequest, mockup } = providerOutput;

  await mkdir(paths.mockups, { recursive: true });
  await Promise.all([
    writeFile(paths.designBrief, `${JSON.stringify(designBrief, null, 2)}\n`),
    writeFile(
      path.join(paths.mockups, "imagegen-request.json"),
      `${JSON.stringify(imagegenRequest, null, 2)}\n`
    ),
    writeFile(paths.mockup, `${JSON.stringify(mockup, null, 2)}\n`),
    writeStubPng(paths.targetImage, width, height, runId)
  ]);

  return {
    runId,
    artifactRoot,
    designBrief,
    imagegenRequest,
    mockup
  };
}

export async function createMockupStubFromFile(
  inputPath: string,
  options: MockupStubOptions = {}
): Promise<MockupStubResult> {
  const request = parseRuntimeRequest(JSON.parse(await readFile(inputPath, "utf8")));
  return createMockupStub(request, options);
}

export function createDesignBrief(request: RuntimeRequest): DesignBrief {
  return {
    summary: request.prompt,
    targetPlatform: request.targetPlatform,
    primaryDevice: request.primaryDevice,
    ...(request.smokeDevices ? { smokeDevices: request.smokeDevices } : {}),
    ...(request.visualConstraints ? { visualConstraints: request.visualConstraints } : {}),
    acceptanceCriteria: [
      "Render one inspectable SwiftUI screen in the sandbox host.",
      "Match the generated target mockup on the primary device before smoke checks.",
      "Keep generated SwiftUI plain and reviewable."
    ],
    outOfScope: [
      "Production SwiftUI generation.",
      "Real imagegen provider calls.",
      "All-device pixel perfection."
    ]
  };
}

function createImagegenPrompt(request: RuntimeRequest): string {
  return [
      `Create an iOS SwiftUI mockup for: ${request.prompt}`,
      [
        `Primary device: ${request.primaryDevice.name}`,
        request.primaryDevice.os ? `, ${request.primaryDevice.os}.` : "."
      ].join(""),
      request.visualConstraints?.style?.length
        ? `Style: ${request.visualConstraints.style.join(", ")}.`
        : "Style: plain SwiftUI.",
      request.visualConstraints?.layout?.length
        ? `Layout: ${request.visualConstraints.layout.join(", ")}.`
        : "Layout: single screen.",
      request.visualConstraints?.accessibility?.length
        ? `Accessibility: ${request.visualConstraints.accessibility.join(", ")}.`
        : "Accessibility: large tap targets."
    ].join("\n");
}

function validateDimensions(width: number, height: number): void {
  if (!Number.isInteger(width) || width <= 0) {
    throw new Error("--width must be a positive integer");
  }
  if (!Number.isInteger(height) || height <= 0) {
    throw new Error("--height must be a positive integer");
  }
}

async function writeStubPng(
  filePath: string,
  width: number,
  height: number,
  seed: string
): Promise<void> {
  const png = new PNG({ width, height });
  const hash = hashSeed(seed);
  const baseRed = 32 + (hash[0] % 96);
  const baseGreen = 48 + (hash[1] % 96);
  const baseBlue = 80 + (hash[2] % 96);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const shade = Math.floor((x / Math.max(1, width - 1)) * 48);
      const band = Math.floor((y / Math.max(1, height - 1)) * 64);
      png.data[offset] = Math.min(255, baseRed + shade);
      png.data[offset + 1] = Math.min(255, baseGreen + band);
      png.data[offset + 2] = Math.min(255, baseBlue + Math.floor((shade + band) / 2));
      png.data[offset + 3] = 255;
    }
  }

  drawPanel(
    png,
    Math.round(width * 0.08),
    Math.round(height * 0.1),
    Math.round(width * 0.84),
    Math.round(height * 0.72)
  );
  drawPanel(
    png,
    Math.round(width * 0.16),
    Math.round(height * 0.2),
    Math.round(width * 0.68),
    Math.round(height * 0.12)
  );
  drawPanel(
    png,
    Math.round(width * 0.16),
    Math.round(height * 0.38),
    Math.round(width * 0.68),
    Math.round(height * 0.08)
  );
  drawPanel(
    png,
    Math.round(width * 0.16),
    Math.round(height * 0.5),
    Math.round(width * 0.5),
    Math.round(height * 0.08)
  );
  drawPanel(
    png,
    Math.round(width * 0.2),
    Math.round(height * 0.68),
    Math.round(width * 0.6),
    Math.round(height * 0.08)
  );

  await writeFile(filePath, PNG.sync.write(png));
}

function drawPanel(png: PNG, left: number, top: number, width: number, height: number): void {
  const right = Math.min(png.width, left + width);
  const bottom = Math.min(png.height, top + height);
  for (let y = Math.max(0, top); y < bottom; y += 1) {
    for (let x = Math.max(0, left); x < right; x += 1) {
      const offset = (y * png.width + x) * 4;
      png.data[offset] = 244;
      png.data[offset + 1] = 247;
      png.data[offset + 2] = 251;
      png.data[offset + 3] = 255;
    }
  }
}

function hashSeed(seed: string): number[] {
  const values = [17, 41, 73];
  for (let index = 0; index < seed.length; index += 1) {
    const bucket = index % values.length;
    values[bucket] = (values[bucket] * 31 + seed.charCodeAt(index)) % 256;
  }
  return values;
}
