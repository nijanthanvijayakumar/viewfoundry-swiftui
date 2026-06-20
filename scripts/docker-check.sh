#!/bin/sh
set -eu

test -f README.md
test -f LICENSE
test -f AGENTS.md
test -f CONTRIBUTING.md
test -f SECURITY.md
test -f CODE_OF_CONDUCT.md
test -f GOVERNANCE.md
test -f docs/testing-strategy.md
test -f docs/generator-plan.md
test -f docs/release.md
test -f .github/pull_request_template.md
test -f .codex-plugin/plugin.json
test -f schemas/runtime-contract.schema.json
test -f skills/viewfoundry/SKILL.md
test -f skills/viewfoundry/references/architecture.md
test -f skills/viewfoundry/references/workflow.md
test -f skills/viewfoundry/references/review-learnings.md
test -f skills/viewfoundry/assets/swiftui-sandbox-template/ViewFoundrySandboxApp.swift
test -f examples/Sandbox/ViewFoundrySandbox.xcodeproj/project.pbxproj
test -f examples/Sandbox/ViewFoundrySandbox.xcodeproj/xcshareddata/xcschemes/ViewFoundrySandbox.xcscheme
test -f examples/Sandbox/ViewFoundrySandbox/ViewFoundrySandboxApp.swift
test -f examples/Sandbox/ViewFoundrySandbox/Generated/ViewFoundryGeneratedView.swift
test -f examples/Sandbox/ViewFoundrySandbox/Assets.xcassets/Contents.json
test -f docs/runtime-contract.md
test -f package.json
test -f package-lock.json
test -f tsconfig.base.json
test -f .gitleaks.toml
test -f .pre-commit-config.yaml
test -f scripts/gitleaks-check.sh
test -f packages/runtime/package.json
test -f packages/runtime/tsconfig.json
test -f packages/runtime/src/index.ts
test -f packages/runtime/src/mockup.ts
test -f packages/runtime/src/mockup-cli.ts
test -f packages/runtime/src/pipeline.ts
test -f packages/runtime/src/pipeline-cli.ts
test -f packages/runtime/src/visual-diff.ts
test -f packages/runtime/src/diff-cli.ts
test -f packages/runtime/tests/unit/mockup.test.ts
test -f packages/runtime/tests/unit/pipeline.test.ts
test -f packages/runtime/tests/unit/visual-diff.test.ts
test -f examples/mockups/mockup.sample.json

grep -q "one issue at a time" AGENTS.md
grep -q "@Codex" AGENTS.md
grep -q "co-author or generated-by" AGENTS.md
grep -q "@Codex" CONTRIBUTING.md
grep -q "one pull request per issue" CONTRIBUTING.md
grep -q "private vulnerability" SECURITY.md
grep -q "squash merges" GOVERNANCE.md
grep -q "Create a repo skill" skills/viewfoundry/references/workflow.md
grep -q "Update the skill" skills/viewfoundry/references/workflow.md
grep -q "Review Handling" skills/viewfoundry/references/review-learnings.md
grep -q "VIEWFOUNDRY_BUILD_CONFIGURATION" skills/viewfoundry/references/review-learnings.md
grep -q "Generator Plan And Fixtures" docs/generator-plan.md
grep -q "packages/runtime/tests/fixtures/generator" docs/generator-plan.md
grep -q "ViewFoundryGeneratedView" examples/Sandbox/ViewFoundrySandbox/ViewFoundrySandboxApp.swift
grep -q "ViewFoundry Sandbox" examples/Sandbox/ViewFoundrySandbox/Generated/ViewFoundryGeneratedView.swift
grep -q "Summary (Why these changes are required)?" .github/pull_request_template.md
grep -q "What changes are in this PR" .github/pull_request_template.md
grep -q "Testing details" .github/pull_request_template.md

node -e 'for (const file of [".codex-plugin/plugin.json", "schemas/runtime-contract.schema.json"]) JSON.parse(require("fs").readFileSync(file, "utf8"))'

has_script() {
  node -e 'const pkg = require("./package.json"); process.exit(pkg.scripts && Object.prototype.hasOwnProperty.call(pkg.scripts, process.argv[1]) ? 0 : 1)' "$1"
}

if [ -f package.json ]; then
  if [ -f package-lock.json ]; then
    npm ci
  else
    npm install
  fi

  if has_script check; then
    npm run check
  else
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
  fi
else
  echo "No package.json yet; ran scaffold checks only."
fi

echo "Docker cannot run Xcode or iOS Simulator checks; run Swift/iOS checks on macOS."
