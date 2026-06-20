#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { parseRuntimeRequest, RuntimeRequestError } from "./validation.js";
import { runViewFoundryPlaceholder } from "./placeholder.js";

interface CliOptions {
  input?: string;
  output?: string;
}

async function main(argv: string[]): Promise<number> {
  const options = parseArgs(argv);

  if (!options.input) {
    writeError(["--input is required"]);
    return 1;
  }

  try {
    const raw = await readFile(options.input, "utf8");
    const request = parseRuntimeRequest(JSON.parse(raw));
    const report = runViewFoundryPlaceholder(request, options.output);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return 0;
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
