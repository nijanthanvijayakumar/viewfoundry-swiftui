# Testing Strategy

ViewFoundry SwiftUI is still a scaffold. Main currently has no `package.json`,
Swift package, plugin validator, or sandbox project, so these are command
contracts to activate as each surface lands.

## Current Checks

Run these until code targets exist:

```sh
git status --short
test -f README.md
test -f LICENSE
test -f docs/testing-strategy.md
```

## TypeScript Unit Tests

Use Node's built-in test runner for core TypeScript logic.

- Put unit tests beside TypeScript source or under `tests/unit`.
- Keep tests focused on parser, model, generator, and fixture normalization
  behavior.
- Add `npm run test:unit` when `package.json` exists.
- Expected command contract:

```sh
npm run test:unit
```

The script should compile TypeScript first, then run Node tests against emitted
JavaScript, for example:

```sh
tsc -p tsconfig.json
node --test dist/**/*.test.js
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

## Swift Sandbox Tests

The Swift sandbox does not exist yet. When it lands, keep it in an example or
sandbox directory and make the test command stable:

```sh
xcodebuild \
  -project examples/Sandbox/ViewFoundrySandbox.xcodeproj \
  -scheme ViewFoundrySandbox \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  test
```

If the project becomes a Swift package first, use this local check until the
sandbox app exists:

```sh
swift test
```

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

Required CI, once scripts exist:

- `npm run test:unit`
- `npm run test:image`
- `tsc --noEmit`
- Markdown/link checks, if added

Local-only until stabilized:

- Swift sandbox `xcodebuild ... test`
- Simulator screenshot capture
- Simulator screenshot diff updates
- Fixture update mode

Promotion rule: move a local-only check into CI only after it is deterministic,
documented, and does not require manual simulator cleanup.
