# ViewFoundry SwiftUI

ViewFoundry SwiftUI is an early-stage project for exploring how a small,
structured view description could map to SwiftUI.

The repository is currently a scaffold. It has a license and project tracking,
but no Swift package, app target, generator, or runtime code yet.
It now includes the base Codex plugin and ViewFoundry skill scaffold that will
guide sandbox work before codegen lands.

## V1 Scope

- Define the first useful shape of the ViewFoundry SwiftUI API.
- Keep examples small enough to inspect and review.
- Prefer plain SwiftUI output over hidden runtime behavior.
- Document decisions before adding broad implementation surface.

## Non-Goals

- No TypeScript implementation in this repository.
- No production-ready SwiftUI code generation yet.
- No cross-platform renderer yet.
- No design-tool plugin yet.

## Local Setup

```sh
git clone https://github.com/nijanthanvijayakumar/viewfoundry-swiftui.git
cd viewfoundry-swiftui
```

## Checks

There is no build or test target yet. Current repo checks are documentation and
scaffold checks:

```sh
git status --short
test -f README.md
test -f LICENSE
test -f docs/testing-strategy.md
test -f .codex-plugin/plugin.json
test -f skills/viewfoundry/SKILL.md
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
- If `package.json` exists, installs npm dependencies.
- Runs `npm run typecheck`, `npm test`, `npm run test:unit`, and
  `npm run test:image` when those scripts exist.

Docker does not run Xcode, SwiftUI sandbox, or iOS Simulator checks. Run those
on a macOS host with Xcode installed when the Swift/iOS targets exist.

## Project Links

- [License](LICENSE)
- [Testing Strategy](docs/testing-strategy.md)
- [Plugin Manifest](.codex-plugin/plugin.json)
- [ViewFoundry Skill](skills/viewfoundry/SKILL.md)
- [Issues](https://github.com/nijanthanvijayakumar/viewfoundry-swiftui/issues)

Contributing docs are not added yet. Until then, use GitHub issues and small
pull requests.
