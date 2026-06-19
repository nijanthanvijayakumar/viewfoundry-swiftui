# ViewFoundry SwiftUI

ViewFoundry SwiftUI is an early-stage project for exploring how a small,
structured view description could map to SwiftUI.

The repository is currently a scaffold. It has a license and project tracking,
but no Swift package, app target, generator, or runtime code yet.

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
```

## Project Links

- [License](LICENSE)
- [Issues](https://github.com/nijanthanvijayakumar/viewfoundry-swiftui/issues)

Contributing docs are not added yet. Until then, use GitHub issues and small
pull requests.
