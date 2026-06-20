#!/usr/bin/env node
import { runMockPipelineFromFile } from "./pipeline.js";
import { RuntimeRequestError } from "./validation.js";

interface CliOptions {
  input?: string;
  output?: string;
  width?: number;
  height?: number;
  actual?: string;
  sandboxOutput?: string;
}

async function main(argv: string[]): Promise<number> {
  const options = parseArgs(argv);
  if (!options.input) {
    writeError(["--input is required"]);
    return 1;
  }

  try {
    const report = await runMockPipelineFromFile(options.input, {
      artifactRoot: options.output,
      width: options.width,
      height: options.height,
      actualScreenshotPath: options.actual,
      sandboxGeneratedFile: options.sandboxOutput
    });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return report.status === "failed" ? 1 : 0;
  } catch (error) {
    if (error instanceof RuntimeRequestError) {
      writeError(error.issues);
      return 1;
    }
    if (error instanceof SyntaxError) {
      writeError(["input must be valid JSON"]);
      return 1;
    }

    const message = error instanceof Error ? error.message : String(error);
    writeError([message]);
    return 1;
  }
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--input" && next) {
      options.input = next;
      index += 1;
      continue;
    }
    if (arg === "--output" && next) {
      options.output = next;
      index += 1;
      continue;
    }
    if (arg === "--width" && next) {
      options.width = Number(next);
      index += 1;
      continue;
    }
    if (arg === "--height" && next) {
      options.height = Number(next);
      index += 1;
      continue;
    }
    if (arg === "--actual" && next) {
      options.actual = next;
      index += 1;
      continue;
    }
    if (arg === "--sandbox-output" && next) {
      options.sandboxOutput = next;
      index += 1;
    }
  }
  return options;
}

function writeError(issues: string[]): void {
  process.stderr.write(
    `${JSON.stringify(
      {
        status: "failed",
        errors: issues.map((message) => ({
          step: "request",
          message,
          retryable: false
        }))
      },
      null,
      2
    )}\n`
  );
}

const exitCode = await main(process.argv.slice(2));
process.exitCode = exitCode;
