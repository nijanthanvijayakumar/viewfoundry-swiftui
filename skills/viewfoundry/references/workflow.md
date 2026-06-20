# Workflow Reference

## Issue And PR Loop

1. Start one child worktree from current `origin/main`.
2. Implement only the GitHub issue in scope.
3. Run relevant local checks and Docker checks when available.
4. Open a PR with summary, change checklist, and testing details.
5. Ask `@Codex` for review and wait.
6. Fix all actionable feedback, then rerun checks.
7. Merge only after clean review and checks.
8. Verify the issue closed; if not, add the PR link and close it.
9. Delete the branch and clean/archive the child worktree.

Do not start the next issue while the current PR is unmerged.

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
5. Run the sandbox on the primary simulator/device.
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
