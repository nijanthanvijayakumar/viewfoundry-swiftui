# Agent Guidance

## Scope

- Use `skills/viewfoundry/SKILL.md` for repo work.
- Work one issue at a time in a child worktree.
- Do not start the next issue while the current PR is unmerged.
- Keep docs and learnings concise, reusable, and repo-specific.
- Never add co-author or generated-by attribution.

## Skill Process

- Create a repo skill when repeat work needs local rules, assets, or workflow memory.
- Update a repo skill when a reviewed PR changes workflow, architecture, checks, or scope.
- Prefer updating `references/` over long notes in the skill entrypoint.
- Keep skills plugin-first and TypeScript-first later.
- Treat `ios-app-intents` as optional unless Siri, Shortcuts, Spotlight, widgets, or Control Center actions are in scope.

## PR Flow

1. Branch from current `origin/main`.
2. Implement only the issue in scope.
3. Run local checks and Docker checks when available.
4. Open a PR with required body sections.
5. Ask `@Codex` for review.
6. Fix all actionable feedback.
7. Rerun checks.
8. Run Gitleaks on local history/current tree and inspect remote PR state for leaks.
9. If a secret reaches remote Git, stop and remove it from branch history before merge.
10. Merge only after clean review, checks, and secret scan.
11. Squash merge only.
12. Verify issue closure; comment with PR link and close manually if needed.
13. Delete branch, clean child worktree, and archive/handoff.

## GitHub Auth

- Never run `gh auth refresh` unless the user explicitly asks in the current turn.
- If GitHub auth lacks a scope, report the missing scope and stop; do not start device-login polling.

## Child Threads

- Stop child work before the orchestrator edits the same worktree.
- Do not let child threads keep polling when the orchestrator is active.
