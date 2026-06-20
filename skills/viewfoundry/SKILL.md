---
name: viewfoundry
description: Guide ViewFoundry SwiftUI work before generator implementation. Use when Codex needs to plan or execute imagegen mockup to SwiftUI sandbox iterations, inspect simulator screenshots, verify primary-device pixels, update ViewFoundry references/templates, or keep future TypeScript-to-SwiftUI generation work inside the staged project contract.
---

# ViewFoundry

Use this skill for ViewFoundry SwiftUI repo work that turns a visual target into a reviewed SwiftUI sandbox iteration. Keep the workflow plugin-first and TypeScript-first later; do not create a TypeScript-to-SwiftUI generator until that issue is explicitly in scope.

## Workflow

1. Read `../../AGENTS.md` before issue work, PRs, reviews, merges, or skill updates.
2. Read `references/architecture.md` before changing project scope, plugin shape, generator boundaries, simulator policy, or App Intents assumptions.
3. Read `references/workflow.md` before implementing a mockup-to-SwiftUI iteration, verification pass, or sandbox template update.
4. Read `references/review-learnings.md` before fixing Codex review feedback or changing workflow, CI, release, screenshot, report, schema, or mocked-pipeline behavior.
5. Use `assets/swiftui-sandbox-template/` as the starting point for sandbox files when a SwiftUI host app or example target is requested.
6. Prefer one primary device target for pixel verification in V1, then add extra-device smoke checks only after the primary pass is stable.
7. Treat `ios-app-intents` as optional and relevant only for Siri, Shortcuts, Spotlight, widgets, or Control Center actions.

## Guardrails

- Keep generated SwiftUI plain and inspectable.
- Keep references and templates small enough to review in pull requests.
- Work one GitHub issue at a time.
- Update this skill or `references/` when reviewed repo process changes.
- Ask `@Codex` for PR review and wait for clean feedback before merge.
- Verify review feedback against the latest PR head before patching; stale or
  outdated review threads should be resolved or minimized, not blindly coded
  around.
- Run Gitleaks before merge; include local history/current tree and remote PR state.
- Run npm and Docker-style checks serially when either command may install or
  mutate `node_modules`.
- Squash merge only.
- Do not promise all-device pixel perfection.
- Do not introduce hidden runtime behavior while the repo is scaffold-only.
- Do not implement TypeScript parsing, SwiftUI generation, or image diff scripts unless the current issue explicitly asks for them.
- Do not add co-author or generated-by attribution.
- Do not run `gh auth refresh` unless the user explicitly asks in the current turn.
