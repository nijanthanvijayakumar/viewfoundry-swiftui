# Testing Strategy

ViewFoundry SwiftUI is still scaffold-first. Main now has a minimal TypeScript
runtime package and a buildable SwiftUI sandbox project, but no generator or
simulator automation.

## Current Checks

Run these for the TypeScript runtime:

```sh
npm install
npm run typecheck
npm run build
npm test
npm run sandbox:build
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
test -f packages/runtime/package.json
test -f packages/runtime/tsconfig.json
test -f packages/runtime/src/index.ts
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

## Image Fixtures

Use `pixelmatch` and `pngjs` for deterministic PNG diffs.

Planned layout:

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

Expected command contract:

```sh
npm run test:image
```

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

Expected local command contract:

```sh
npm run test:screenshots
```

This command may call `xcodebuild`, `xcrun simctl`, and the image diff runner.
Keep it out of required CI until it is fast and reliable on GitHub-hosted macOS
runners.

## CI And Local Split

Required CI:

- `npm run test:unit`
- `tsc --noEmit`
- `npm run sandbox:build` with an honest skip on hosts without Xcode
- Gitleaks secret scan
- Optional local pre-commit Gitleaks hook
- Markdown/link checks, if added

Required later, once image fixtures exist:

- `npm run test:image`

Local-only until stabilized:

- Swift sandbox `xcodebuild ... test`
- Simulator screenshot capture
- Simulator screenshot diff updates
- Fixture update mode

Promotion rule: move a local-only check into CI only after it is deterministic,
documented, and does not require manual simulator cleanup.
