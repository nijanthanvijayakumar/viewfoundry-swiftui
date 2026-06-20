# Testing Strategy

ViewFoundry SwiftUI is still scaffold-first. Main now has a minimal TypeScript
runtime package, a buildable SwiftUI sandbox project, local screenshot and
visual diff prototypes, and a deterministic mockup stub, but no SwiftUI
generator.

## Current Checks

Run these for the TypeScript runtime:

```sh
npm install
npm run typecheck
npm run build
npm test
npm run mockup:stub -- --input examples/runtime-request.sample.json --output .viewfoundry/runs/sample
npm run diff:image -- --target <target.png> --actual <actual.png> --diff <diff.png> --report <report.json>
npm run sandbox:build
npm run sandbox:screenshot
npm run check
npm run secrets
pre-commit run --all-files
```

Run these scaffold checks:

```sh
git status --short
test -f README.md
test -f LICENSE
test -f AGENTS.md
test -f .github/pull_request_template.md
test -f docs/testing-strategy.md
test -f docs/runtime-contract.md
test -f .gitleaks.toml
test -f .pre-commit-config.yaml
test -f docs/release.md
test -f .codex-plugin/plugin.json
test -f schemas/runtime-contract.schema.json
test -f skills/viewfoundry/SKILL.md
test -f skills/viewfoundry/references/architecture.md
test -f skills/viewfoundry/references/workflow.md
test -f skills/viewfoundry/assets/swiftui-sandbox-template/ViewFoundrySandboxApp.swift
test -f examples/Sandbox/ViewFoundrySandbox.xcodeproj/project.pbxproj
test -f examples/Sandbox/ViewFoundrySandbox.xcodeproj/xcshareddata/xcschemes/ViewFoundrySandbox.xcscheme
test -f examples/Sandbox/ViewFoundrySandbox/ViewFoundrySandboxApp.swift
test -f examples/Sandbox/ViewFoundrySandbox/Generated/ViewFoundryGeneratedView.swift
test -f package.json
test -f package-lock.json
test -f tsconfig.base.json
test -f scripts/gitleaks-check.sh
test -f scripts/capture-sandbox-screenshot.sh
test -f packages/runtime/package.json
test -f packages/runtime/tsconfig.json
test -f packages/runtime/src/index.ts
test -f packages/runtime/src/mockup.ts
test -f packages/runtime/src/mockup-cli.ts
test -f packages/runtime/src/visual-diff.ts
test -f packages/runtime/src/diff-cli.ts
test -f packages/runtime/tests/unit/mockup.test.ts
test -f packages/runtime/tests/unit/visual-diff.test.ts
test -f examples/mockups/mockup.sample.json
grep -q "one issue at a time" AGENTS.md
grep -q "@Codex" AGENTS.md
grep -q "co-author or generated-by" AGENTS.md
grep -q "Create a repo skill" skills/viewfoundry/references/workflow.md
grep -q "Update the skill" skills/viewfoundry/references/workflow.md
grep -q "ViewFoundryGeneratedView" examples/Sandbox/ViewFoundrySandbox/ViewFoundrySandboxApp.swift
grep -q "Summary (Why these changes are required)?" .github/pull_request_template.md
grep -q "What changes are in this PR" .github/pull_request_template.md
grep -q "Testing details" .github/pull_request_template.md
node -e 'for (const file of [".codex-plugin/plugin.json", "schemas/runtime-contract.schema.json"]) JSON.parse(require("fs").readFileSync(file, "utf8"))'
```

The same scaffold checks can run in Docker:

```sh
docker build -t viewfoundry-swiftui-check .
docker run --rm viewfoundry-swiftui-check
```

Docker is limited to portable checks. It can run npm-based TypeScript checks
once `package.json` exists. `npm run sandbox:build` skips honestly when
`xcodebuild` is unavailable, so Docker cannot verify the SwiftUI binary or iOS
Simulator behavior.

Local-only screenshot command:

```sh
VIEWFOUNDRY_RUNTIME_REQUEST=examples/runtime-request.sample.json \
  npm run sandbox:screenshot
```

It writes:

- `.viewfoundry/runs/<run>/screenshots/primary.png`
- `.viewfoundry/runs/<run>/screenshot-runner.json`
- `.viewfoundry/runs/<run>/final-report.json`

On simulator tooling failures, the command exits non-zero and still writes
artifacts with actionable error metadata.

## TypeScript Unit Tests

Use Node's built-in test runner for core TypeScript logic.

- Put unit tests beside TypeScript source or under `tests/unit`.
- Keep tests focused on parser, model, generator, and fixture normalization
  behavior.
- Current command:

```sh
npm run test:unit
```

The script compiles TypeScript first, then runs Node tests against emitted
JavaScript:

```sh
tsc -p tsconfig.json
node --test 'dist/**/*.test.js'
```

Do not add Vitest for core logic. Use Vitest only if a UI or component harness
needs browser-like lifecycle, DOM assertions, or module mocking that Node's
runner cannot cover cleanly.

## Mockup Stub Tests

Use the runtime mockup stub for deterministic imagegen contract coverage. The
stub writes a design brief, imagegen request metadata, mockup artifact JSON, and
a placeholder PNG without credentials or provider calls.

Current command:

```sh
npm run mockup:stub -- \
  --input examples/runtime-request.sample.json \
  --output .viewfoundry/runs/sample
```

Current coverage lives in `packages/runtime/tests/unit/mockup.test.ts` and
covers artifact writing, deterministic output, dimension validation, and CLI
behavior.

Real imagegen provider wiring is future work. CI must keep using the stub so
tests never require provider secrets.

## Image Diff Tests

Use the runtime PNG diff prototype for deterministic same-size PNG comparisons.

Current command:

```sh
npm run diff:image -- \
  --target .viewfoundry/runs/<run>/mockups/target.png \
  --actual .viewfoundry/runs/<run>/screenshots/primary.png \
  --diff .viewfoundry/runs/<run>/diffs/primary-diff.png \
  --report .viewfoundry/runs/<run>/diffs/primary-report.json \
  --threshold 0.98
```

Current coverage lives in `packages/runtime/tests/unit/visual-diff.test.ts` and
covers identical PNGs, different PNGs, dimension mismatch, and CLI report
writing. The prototype:

- Requires PNG inputs with identical dimensions.
- Scores normalized per-channel absolute pixel similarity.
- Writes a runtime-contract `VisualDiffReport` JSON file.
- Writes a simple diff PNG artifact.
- Does not claim semantic, perceptual, or layout-aware visual matching.

Fixture layout for future checked-in examples:

```text
tests/fixtures/images/
  input/
  expected/
  actual/
  diff/
```

Rules:

- Store small, reviewed PNG fixtures in `expected`.
- Generate `actual` and `diff` locally or in CI artifacts.
- Keep tolerance explicit per fixture.
- Fail on missing expected images unless an update flag is passed.
- Never update expected fixtures as a side effect of a normal test run.

## Plugin And Skill Checks

Validate the Codex plugin manifest and bundled skill when the local validator is
available:

```sh
python3 /path/to/plugin-creator/scripts/validate_plugin.py .
```

If that validator is unavailable or lacks dependencies, manually check that the
manifest is valid JSON, points at `./skills/`, has no TODO placeholders, and the
skill has frontmatter with non-empty `name` and `description`.

Validate runtime schema stubs with Node JSON parsing until a schema validator is
added:

```sh
node -e 'JSON.parse(require("fs").readFileSync("schemas/runtime-contract.schema.json", "utf8"))'
```

## Swift Sandbox Tests

The Swift sandbox project lives at `examples/Sandbox/ViewFoundrySandbox.xcodeproj`.
The checked-in skill asset remains a seed template at
`skills/viewfoundry/assets/swiftui-sandbox-template/ViewFoundrySandboxApp.swift`.
The stable local build command is:

```sh
npm run sandbox:build
```

For a concrete primary simulator target, pass the destination from the runtime
request:

```sh
VIEWFOUNDRY_SANDBOX_DESTINATION='platform=iOS Simulator,name=iPhone 17 Pro' \
  npm run sandbox:build
```

Generated SwiftUI enters through
`examples/Sandbox/ViewFoundrySandbox/Generated/ViewFoundryGeneratedView.swift`.
Keep the app shell stable and replace only generated files during future runs.

## Simulator Screenshot And Diff Tests

Screenshot tests should be local-first until the sandbox UI, fixture set, and
simulator runtime are stable.

Planned path:

1. Render fixed ViewFoundry examples in the sandbox app.
2. Capture screenshots from a pinned simulator/device and appearance.
3. Normalize PNGs into `tests/fixtures/images/actual`.
4. Compare against `expected` with `pixelmatch`.
5. Write diff PNGs for inspection.

Current screenshot command:

```sh
npm run sandbox:screenshot
```

The runner builds `VIEWFOUNDRY_BUILD_CONFIGURATION` (`Debug` by default) and
installs the app from the same derived-data configuration directory.

If simctl discovery is unreliable, force a target:

```sh
VIEWFOUNDRY_SIMULATOR_DESTINATION='platform=iOS Simulator,id=<udid>' \
  npm run sandbox:screenshot
```

Current diff command:

```sh
npm run diff:image -- \
  --target .viewfoundry/runs/<run>/mockups/target.png \
  --actual .viewfoundry/runs/<run>/screenshots/primary.png \
  --diff .viewfoundry/runs/<run>/diffs/primary-diff.png \
  --report .viewfoundry/runs/<run>/diffs/primary-report.json
```

The screenshot command may call `xcodebuild` and `xcrun simctl`; keep that out
of required CI until it is fast and reliable on GitHub-hosted macOS runners.
The PNG diff command is covered by unit tests in required CI.

## CI And Local Split

Required CI:

- `npm run test:unit`
- `tsc --noEmit`
- `npm run sandbox:build` with an honest skip on hosts without Xcode
- Gitleaks secret scan
- Optional local pre-commit Gitleaks hook
- Markdown/link checks, if added

Local-only until stabilized:

- Swift sandbox `xcodebuild ... test`
- Simulator screenshot capture
- Simulator screenshot diff updates
- Fixture update mode

Promotion rule: move a local-only check into CI only after it is deterministic,
documented, and does not require manual simulator cleanup.
