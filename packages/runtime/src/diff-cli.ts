#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { comparePngImages, VisualDiffError } from "./visual-diff.js";

interface CliOptions {
  target?: string;
  actual?: string;
  diff?: string;
  report?: string;
  threshold?: number;
}

type RequiredCliOptions = Required<Pick<CliOptions, "target" | "actual" | "diff" | "report">> &
  CliOptions;

async function main(argv: string[]): Promise<number> {
  const options = parseArgs(argv);
  const missing = requiredMissing(options);
  if (missing.length > 0) {
    writeError(missing.map((name) => `${name} is required`));
    return 1;
  }
  const required = options as RequiredCliOptions;

  try {
    const report = await comparePngImages({
      targetPath: required.target,
      actualPath: required.actual,
      diffPath: required.diff,
      threshold: options.threshold
    });

    await mkdir(path.dirname(required.report), { recursive: true });
    await writeFile(required.report, `${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return report.passed ? 0 : 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeError([message]);
    return error instanceof VisualDiffError ? 1 : 2;
  }
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--target" && next) {
      options.target = next;
      index += 1;
      continue;
    }

    if (arg === "--actual" && next) {
      options.actual = next;
      index += 1;
      continue;
    }

    if (arg === "--diff" && next) {
      options.diff = next;
      index += 1;
      continue;
    }

    if (arg === "--report" && next) {
      options.report = next;
      index += 1;
      continue;
    }

    if (arg === "--threshold" && next) {
      options.threshold = Number(next);
      index += 1;
    }
  }

  return options;
}

function requiredMissing(options: CliOptions): string[] {
  const missing: string[] = [];
  if (!options.target) missing.push("--target");
  if (!options.actual) missing.push("--actual");
  if (!options.diff) missing.push("--diff");
  if (!options.report) missing.push("--report");
  return missing;
}

function writeError(issues: string[]): void {
  process.stderr.write(
    `${JSON.stringify(
      {
        status: "failed",
        errors: issues.map((message) => ({
          step: "diff",
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
