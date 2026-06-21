# ViewFoundry SwiftUI

ViewFoundry SwiftUI is an early-stage project for exploring how a small,
structured view description could map to SwiftUI.

The repository is currently a scaffold. It has a license, project tracking, a
minimal TypeScript runtime package, and the base Codex plugin and ViewFoundry
skill scaffold that will guide sandbox work before codegen lands.

The future runner contract is documented in
[docs/runtime-contract.md](docs/runtime-contract.md). The current runtime is a
placeholder only; it validates requests and prints deterministic blocked output.
The SwiftUI sandbox project is buildable now, and local screenshot, mockup
stub, and visual diff prototypes exist. SwiftUI generation and real imagegen
provider wiring are still future work.

The first real generator boundary and fixture strategy are defined in
[docs/generator-plan.md](docs/generator-plan.md). The plan keeps provider calls
and production SwiftUI generation out of scope until later issues.

## V1 Scope

- Define the first useful shape of the ViewFoundry SwiftUI API.
- Keep examples small enough to inspect and review.
- Prefer plain SwiftUI output over hidden runtime behavior.
- Use one primary simulator/device target as the V1 pixel gate.
- Treat extra-device checks as smoke checks only.
- Document decisions before adding broad implementation surface.

## Non-Goals

- No production-ready SwiftUI code generation yet.
- No cross-platform renderer yet.
- No design-tool plugin yet.

## Local Setup

```sh
git clone https://github.com/nijanthanvijayakumar/viewfoundry-swiftui.git
cd viewfoundry-swiftui
npm install
```

## Checks

Run the TypeScript and scaffold checks:

```sh
npm run typecheck
npm run build
npm test
npm run mockup:stub -- --input examples/runtime-request.sample.json --output .viewfoundry/runs/sample
npm run pipeline:mock -- --input examples/runtime-request.sample.json --output .viewfoundry/runs/sample
npm run diff:image -- --target <target.png> --actual <actual.png> --diff <diff.png> --report <report.json>
npm run sandbox:build
npm run sandbox:screenshot
npm run check
npm run secrets
pre-commit run --all-files
```

Current scaffold checks:

```sh
git status --short
test -f README.md
test -f LICENSE
test -f docs/testing-strategy.md
test -f docs/generator-plan.md
test -f docs/runtime-contract.md
test -f .gitleaks.toml
test -f .pre-commit-config.yaml
test -f .codex-plugin/plugin.json
test -f skills/viewfoundry/SKILL.md
test -f examples/Sandbox/ViewFoundrySandbox.xcodeproj/project.pbxproj
test -f examples/Sandbox/ViewFoundrySandbox/ViewFoundrySandboxApp.swift
test -f examples/Sandbox/ViewFoundrySandbox/Generated/ViewFoundryGeneratedView.swift
test -f schemas/runtime-contract.schema.json
node -e 'for (const file of [".codex-plugin/plugin.json", "schemas/runtime-contract.schema.json"]) JSON.parse(require("fs").readFileSync(file, "utf8"))'
```

Testing decisions and staged command contracts live in
[docs/testing-strategy.md](docs/testing-strategy.md).

## Releases

Version tags matching `v*.*.*` publish GitHub Releases with generated release
notes. The repo is still scaffold-only, so releases do not publish packages or
binaries yet.

Release steps and limits live in [docs/release.md](docs/release.md).

### Docker Checks

Docker covers portable repo checks only. It uses a small Node image so the same
container can run TypeScript checks after `package.json` and npm scripts exist.

```sh
docker build -t viewfoundry-swiftui-check .
docker run --rm viewfoundry-swiftui-check
```

Current container behavior:

- Verifies core docs plus the plugin manifest, ViewFoundry skill, references,
  and SwiftUI sandbox template.
- Installs npm dependencies.
- Runs `npm run check`.

Docker does not run Xcode, SwiftUI sandbox, or iOS Simulator checks. Run those
on a macOS host with Xcode installed when the Swift/iOS targets exist.

## SwiftUI Sandbox

The runnable sandbox app lives in `examples/Sandbox`.

```text
examples/Sandbox/
  ViewFoundrySandbox.xcodeproj/
  ViewFoundrySandbox/
    ViewFoundrySandboxApp.swift
    Generated/ViewFoundryGeneratedView.swift
    Assets.xcassets/
```

`ViewFoundrySandboxApp.swift` is the stable host entry point. Generated SwiftUI
belongs in `Generated/ViewFoundryGeneratedView.swift` so future runs can replace
that file without touching the app shell.

Build the sandbox:

```sh
npm run sandbox:build
```

To build against a concrete primary simulator from a runtime request, pass an
Xcode destination:

```sh
VIEWFOUNDRY_SANDBOX_DESTINATION='platform=iOS Simulator,name=iPhone 17 Pro' \
  npm run sandbox:build
```

On hosts without Xcode, the command skips with a clear message so portable CI
can keep running TypeScript and scaffold checks.

Capture a primary screenshot from the runtime request:

```sh
VIEWFOUNDRY_RUNTIME_REQUEST=examples/runtime-request.sample.json \
  npm run sandbox:screenshot
```

Optional overrides:

```sh
VIEWFOUNDRY_RUN_DIR=... \
VIEWFOUNDRY_RUN_ID=... \
VIEWFOUNDRY_DEVICE_NAME='iPhone 17 Pro' \
VIEWFOUNDRY_DEVICE_OS='iOS 26' \
VIEWFOUNDRY_APPEARANCE='light' \
VIEWFOUNDRY_SIMULATOR_DESTINATION='platform=iOS Simulator,id=<udid>' \
VIEWFOUNDRY_SIMULATOR_NAME='iPhone 17 Pro' \
VIEWFOUNDRY_SIMULATOR_OS='iOS 26' \
VIEWFOUNDRY_SIMULATOR_UDID='<udid>' \
VIEWFOUNDRY_BUILD_CONFIGURATION=Debug \
VIEWFOUNDRY_SCREENSHOT_SETTLE_SECONDS=2 \
VIEWFOUNDRY_XCODEBUILD=xcodebuild \
VIEWFOUNDRY_XCRUN=xcrun \
  npm run sandbox:screenshot
```

If simulator discovery is unavailable or too noisy, set either
`VIEWFOUNDRY_SIMULATOR_DESTINATION` (preferred) or
`VIEWFOUNDRY_SIMULATOR_UDID` to force a specific simulator target.

Artifacts:

- `.viewfoundry/runs/<run>/screenshots/primary.png`
- `.viewfoundry/runs/<run>/screenshot-runner.json`
- `.viewfoundry/runs/<run>/final-report.json`

Create deterministic mockup artifacts without calling an image provider:

```sh
npm run mockup:stub -- \
  --input examples/runtime-request.sample.json \
  --output .viewfoundry/runs/sample
```

Artifacts:

- `.viewfoundry/runs/<run>/design-brief.json`
- `.viewfoundry/runs/<run>/mockups/imagegen-request.json`
- `.viewfoundry/runs/<run>/mockups/mockup.json`
- `.viewfoundry/runs/<run>/mockups/target.png`

The stub records the future imagegen request contract and writes a deterministic
placeholder PNG. It does not require API keys and does not call a real image
generation provider.

Run the first no-network mocked pipeline:

```sh
npm run pipeline:mock -- \
  --input examples/runtime-request.sample.json \
  --output .viewfoundry/runs/sample
```

Artifacts:

- `.viewfoundry/runs/<run>/request.json`
- `.viewfoundry/runs/<run>/design-brief.json`
- `.viewfoundry/runs/<run>/mockups/target.png`
- `.viewfoundry/runs/<run>/swiftui/Sources/ViewFoundryGeneratedView.swift`
- `.viewfoundry/runs/<run>/swiftui/generation-report.json`
- `.viewfoundry/runs/<run>/final-report.json`

The mocked pipeline writes deterministic SwiftUI for the first generator IR
subset into the sandbox generated view, skips simulator-only steps in CI, and
records completed/skipped steps with reasons in the final report.

Compare a mockup PNG to a captured screenshot PNG:

```sh
npm run diff:image -- \
  --target .viewfoundry/runs/<run>/mockups/target.png \
  --actual .viewfoundry/runs/<run>/screenshots/primary.png \
  --diff .viewfoundry/runs/<run>/diffs/primary-diff.png \
  --report .viewfoundry/runs/<run>/diffs/primary-report.json \
  --threshold 0.98
```

The diff command is a deterministic V1 prototype. It requires equal-size PNG
inputs, scores normalized per-channel pixel similarity, writes a visual diff
PNG, and does not claim semantic or perceptual matching.

## Runtime Placeholder

The runtime package lives at `packages/runtime`. It validates requests, writes
deterministic mockup stub artifacts, writes mocked SwiftUI pipeline output, and
exposes local helper CLIs. It does not call real imagegen providers or generate
production SwiftUI yet.

```sh
npm run build
node packages/runtime/dist/src/cli.js \
  --input examples/runtime-request.sample.json \
  --output .viewfoundry/runs/sample
```

The CLI validates the request and prints a deterministic blocked final report.

## Secret Scanning

Run Gitleaks before publishing changes that touch credentials, workflow files, or
dependency metadata:

```sh
npm run secrets
```

Install the local hook once per checkout:

```sh
pre-commit install
```

CI and pre-commit both run Gitleaks.

## Project Links

- [License](LICENSE)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
- [Code Of Conduct](CODE_OF_CONDUCT.md)
- [Governance](GOVERNANCE.md)
- [Testing Strategy](docs/testing-strategy.md)
- [Runtime Contract](docs/runtime-contract.md)
- [Plugin Manifest](.codex-plugin/plugin.json)
- [ViewFoundry Skill](skills/viewfoundry/SKILL.md)
- [Issues](https://github.com/nijanthanvijayakumar/viewfoundry-swiftui/issues)
