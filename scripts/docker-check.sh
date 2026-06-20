#!/bin/sh
set -eu

test -f README.md
test -f LICENSE
test -f AGENTS.md
test -f docs/testing-strategy.md
test -f docs/release.md
test -f .github/pull_request_template.md
test -f .codex-plugin/plugin.json
test -f skills/viewfoundry/SKILL.md
test -f skills/viewfoundry/references/architecture.md
test -f skills/viewfoundry/references/workflow.md
test -f skills/viewfoundry/assets/swiftui-sandbox-template/ViewFoundrySandboxApp.swift

grep -q "one issue at a time" AGENTS.md
grep -q "@Codex" AGENTS.md
grep -q "co-author or generated-by" AGENTS.md
grep -q "Create a repo skill" skills/viewfoundry/references/workflow.md
grep -q "Update the skill" skills/viewfoundry/references/workflow.md
grep -q "Summary (Why these changes are required)?" .github/pull_request_template.md
grep -q "What changes are in this PR" .github/pull_request_template.md
grep -q "Testing details" .github/pull_request_template.md

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
