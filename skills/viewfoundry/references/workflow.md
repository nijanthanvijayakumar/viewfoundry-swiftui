# Workflow Reference

## Issue And PR Loop

1. Start one child worktree from current `origin/main`.
2. Implement only the GitHub issue in scope.
3. Run relevant local checks and Docker checks when available.
4. Open a PR with summary, change checklist, and testing details.
5. Ask `@Codex` for review and wait.
6. Treat an eyes reaction as acknowledgement only, not a review.
7. Verify feedback against the latest PR head before changing code.
8. Fix all valid actionable feedback, then rerun checks.
9. Re-request `@Codex` review once after fixes.
10. Resolve addressed review threads; minimize stale/outdated review threads
    when they obscure current state.
11. Run Gitleaks against local history/current tree and remote PR state.
12. Inspect the GitHub PR diff for secret-like additions before merge.
13. If a secret reaches remote Git, stop and remove it from branch history before merge.
14. Squash merge only after latest-head clean review, checks, and secret scan.
15. Verify the issue closed; if not, add the PR link and close it.
16. Delete the branch and clean/archive the child worktree.

Do not start the next issue while the current PR is unmerged.

## Secret And Auth Guardrails

- Use `npm run secrets` for local Gitleaks checks.
- Use `pre-commit install` to enable the local Gitleaks hook when pre-commit is available.
- Use `gitleaks git . --config .gitleaks.toml --log-opts=--all --redact --verbose` after fetching remote refs.
- Use `gitleaks dir . --config .gitleaks.toml --redact --verbose` for the current tree.
- Inspect PR diff state before merge, for example with
  `gh pr diff <number> | gitleaks stdin --config .gitleaks.toml --redact --verbose`.
  A clean Gitleaks scan means no history rewrite is needed.
- Never run `gh auth refresh` unless the user explicitly asks in the current turn.
- If GitHub auth lacks a required scope, report the missing scope and stop.
- If a child thread is still editing or polling, stop it before orchestrator edits the same worktree.

## Skill Updates

- Create a repo skill when repeat work needs local rules, assets, or workflow memory.
- Update the skill when reviewed work changes architecture, verification, PR flow, or scope.
- Keep durable detail in `references/`; keep the skill entrypoint short.
- Never add co-author or generated-by attribution.

## Mockup To Sandbox Loop

1. Create a runtime request matching `docs/runtime-contract.md`.
2. Create a design brief and imagegen request metadata with `npm run mockup:stub`.
3. Use the deterministic stub PNG until a real imagegen provider is in scope.
4. Identify the primary device target and appearance.
5. Create or update a SwiftUI sandbox view from `assets/swiftui-sandbox-template/`.
   Generated SwiftUI lands in
   `examples/Sandbox/ViewFoundrySandbox/Generated/ViewFoundryGeneratedView.swift`;
   keep the app shell stable.
6. Run the sandbox on the primary simulator/device with `npm run sandbox:build`
   or a concrete `VIEWFOUNDRY_SANDBOX_DESTINATION`.
7. Capture a screenshot.
8. Run `npm run diff:image` against the target mockup PNG and primary
   screenshot PNG to produce `diffs/primary-report.json` and
   `diffs/primary-diff.png`.
9. Iterate until the primary target is close enough for review.
10. Run extra-device smoke checks only after the primary target is stable.
11. Record artifact paths and final status in the run report.

Current mocked command:

```sh
npm run pipeline:mock -- --input examples/runtime-request.sample.json --output .viewfoundry/runs/sample
```

It uses the local mockup stub, lowers the request to the supported generator IR
subset, writes deterministic SwiftUI into the generated sandbox view, skips
simulator-only steps unless later commands provide those artifacts, and records
completed/skipped steps in `final-report.json`.

## Verification Notes

- Prefer simulator screenshots over source inspection for visual acceptance.
- Record primary device, OS/runtime, appearance, and screenshot path in PR notes.
- Store run artifacts under `.viewfoundry/runs/<run-id>/` when the runner exists.
- Keep real imagegen provider credentials out of CI; use the deterministic
  mockup stub for contract and unit tests.
- Keep expected/actual/diff image updates explicit when image fixtures exist.
- Treat the current PNG diff score as a deterministic prototype only; it is not
  semantic or perceptual visual matching.
- Treat Docker checks as portable scaffold checks only; Docker cannot verify SwiftUI simulator output.
- Run `npm run check` and `sh scripts/docker-check.sh` serially. The Docker
  check may run `npm ci`; running it in parallel with TypeScript checks can
  remove `node_modules/.bin/tsc` mid-run and create false failures.
- If Docker Hub metadata times out before repo checks run, record it as an
  external Docker registry blocker and keep local `scripts/docker-check.sh`
  evidence separate.

## Future Generator Boundary

Keep runtime parser/model/generator tests separate from screenshot verification. A passing TypeScript unit test is not a visual acceptance result.

Generator implementation issues should start from `docs/generator-plan.md`.
Keep fixture tests deterministic, update expected SwiftUI only through an
explicit fixture refresh path, and keep provider calls, schema expansion,
screenshot runner rewrites, and visual diff algorithm changes in separate
issues unless the issue scope explicitly combines them.
