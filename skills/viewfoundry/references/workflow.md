# Workflow Reference

## Issue And PR Loop

1. Start one child worktree from current `origin/main`.
2. Implement only the GitHub issue in scope.
3. Run relevant local checks and Docker checks when available.
4. Open a PR with summary, change checklist, and testing details.
5. Ask `@Codex` for review and wait.
6. Fix all actionable feedback, then rerun checks.
7. Run Gitleaks against local history/current tree and remote PR state.
8. If a secret reaches remote Git, stop and remove it from branch history before merge.
9. Squash merge only after clean review, checks, and secret scan.
10. Verify the issue closed; if not, add the PR link and close it.
11. Delete the branch and clean/archive the child worktree.

Do not start the next issue while the current PR is unmerged.

## Secret And Auth Guardrails

- Use `npm run secrets` for local Gitleaks checks.
- Use `pre-commit install` to enable the local Gitleaks hook when pre-commit is available.
- Use `gitleaks detect --source . --config .gitleaks.toml --log-opts=--all --redact --verbose` after fetching remote refs.
- Inspect PR diff state before merge; a clean Gitleaks scan means no history rewrite is needed.
- Never run `gh auth refresh` unless the user explicitly asks in the current turn.
- If a child thread is still editing or polling, stop it before orchestrator edits the same worktree.

## Skill Updates

- Create a repo skill when repeat work needs local rules, assets, or workflow memory.
- Update the skill when reviewed work changes architecture, verification, PR flow, or scope.
- Keep durable detail in `references/`; keep the skill entrypoint short.
- Never add co-author or generated-by attribution.

## Mockup To Sandbox Loop

1. Create a runtime request matching `docs/runtime-contract.md`.
2. Capture or generate the visual target.
3. Identify the primary device target and appearance.
4. Create or update a SwiftUI sandbox view from `assets/swiftui-sandbox-template/`.
   Generated SwiftUI lands in
   `examples/Sandbox/ViewFoundrySandbox/Generated/ViewFoundryGeneratedView.swift`;
   keep the app shell stable.
5. Run the sandbox on the primary simulator/device with `npm run sandbox:build`
   or a concrete `VIEWFOUNDRY_SANDBOX_DESTINATION`.
6. Capture a screenshot.
7. Compare layout, spacing, typography, color, and visible state against the target.
8. Iterate until the primary target is close enough for review.
9. Run extra-device smoke checks only after the primary target is stable.
10. Record artifact paths and final status in the run report.

## Verification Notes

- Prefer simulator screenshots over source inspection for visual acceptance.
- Record primary device, OS/runtime, appearance, and screenshot path in PR notes.
- Store run artifacts under `.viewfoundry/runs/<run-id>/` when the runner exists.
- Keep expected/actual/diff image updates explicit when image fixtures exist.
- Treat Docker checks as portable scaffold checks only; Docker cannot verify SwiftUI simulator output.

## Future Generator Boundary

Keep runtime parser/model/generator tests separate from screenshot verification. A passing TypeScript unit test is not a visual acceptance result.
