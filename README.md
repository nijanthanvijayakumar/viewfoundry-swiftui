# ViewFoundry SwiftUI

ViewFoundry SwiftUI is an early-stage project for exploring how a small,
structured view description could map to SwiftUI.

The repository is currently a scaffold. It has a license, project tracking, a
minimal TypeScript runtime package, and the base Codex plugin and ViewFoundry
skill scaffold that will guide sandbox work before codegen lands.

The future runner contract is documented in
[docs/runtime-contract.md](docs/runtime-contract.md). The current runtime is a
placeholder only; it validates requests and prints deterministic blocked output.

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
test -f docs/runtime-contract.md
test -f .gitleaks.toml
test -f .pre-commit-config.yaml
test -f .codex-plugin/plugin.json
test -f skills/viewfoundry/SKILL.md
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

## Runtime Placeholder

The runtime package lives at `packages/runtime`. It does not call imagegen,
generate SwiftUI, or run simulators yet.

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
- [Testing Strategy](docs/testing-strategy.md)
- [Runtime Contract](docs/runtime-contract.md)
- [Plugin Manifest](.codex-plugin/plugin.json)
- [ViewFoundry Skill](skills/viewfoundry/SKILL.md)
- [Issues](https://github.com/nijanthanvijayakumar/viewfoundry-swiftui/issues)

Contributing docs are not added yet. Until then, use GitHub issues and small
pull requests.
