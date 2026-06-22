import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import pngjs from "pngjs";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const tempDir = await mkdtemp(path.join(tmpdir(), "viewfoundry-cli-smoke-"));
const { PNG } = pngjs;

try {
  await assertJsonCommand(
    "viewfoundry",
    ["packages/runtime/dist/src/cli.js", "--input", "examples/runtime-request.sample.json", "--output", path.join(tempDir, "placeholder")],
    (output) => output.status === "blocked"
  );

  await assertJsonCommand(
    "viewfoundry-mockup",
    ["packages/runtime/dist/src/mockup-cli.js", "--input", "examples/runtime-request.sample.json", "--output", path.join(tempDir, "mockup")],
    (output) => output.imagegenRequest?.provider === "stub"
  );

  await assertJsonCommand(
    "viewfoundry-pipeline",
    ["packages/runtime/dist/src/pipeline-cli.js", "--input", "examples/runtime-request.sample.json", "--output", path.join(tempDir, "pipeline")],
    (output) => output.status === "blocked"
  );

  const target = path.join(tempDir, "target.png");
  const actual = path.join(tempDir, "actual.png");
  const diff = path.join(tempDir, "diff.png");
  const report = path.join(tempDir, "diff-report.json");
  const png = new PNG({ width: 1, height: 1 });
  png.data.fill(255);
  const pngBuffer = PNG.sync.write(png);
  await writeFile(target, pngBuffer);
  await writeFile(actual, pngBuffer);

  await assertJsonCommand(
    "viewfoundry-diff",
    ["packages/runtime/dist/src/diff-cli.js", "--target", target, "--actual", actual, "--diff", diff, "--report", report],
    (output) => output.passed === true
  );
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

async function assertJsonCommand(name, args, predicate) {
  const { stdout } = await execFileAsync(process.execPath, args, { cwd: root });
  const output = JSON.parse(stdout);
  if (!predicate(output)) {
    throw new Error(`${name} smoke output failed validation`);
  }
  process.stdout.write(`${name} smoke passed\n`);
}
