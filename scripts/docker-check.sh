#!/bin/sh
set -eu

test -f README.md
test -f LICENSE
test -f docs/testing-strategy.md
test -f docs/release.md
test -f .codex-plugin/plugin.json
test -f skills/viewfoundry/SKILL.md
test -f skills/viewfoundry/references/architecture.md
test -f skills/viewfoundry/references/workflow.md
test -f skills/viewfoundry/assets/swiftui-sandbox-template/ViewFoundrySandboxApp.swift

has_script() {
  node -e 'const pkg = require("./package.json"); process.exit(pkg.scripts && Object.prototype.hasOwnProperty.call(pkg.scripts, process.argv[1]) ? 0 : 1)' "$1"
}

if [ -f package.json ]; then
  if [ -f package-lock.json ]; then
    npm ci
  else
    npm install
  fi

  if has_script typecheck; then
    npm run typecheck
  fi

  if has_script test; then
    npm test
  fi

  if has_script test:unit; then
    npm run test:unit
  fi

  if has_script test:image; then
    npm run test:image
  fi
else
  echo "No package.json yet; ran scaffold checks only."
fi

echo "Docker cannot run Xcode or iOS Simulator checks; run Swift/iOS checks on macOS."
