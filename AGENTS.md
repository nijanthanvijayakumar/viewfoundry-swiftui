# Agent Guidance

## Scope

- Use `skills/viewfoundry/SKILL.md` for repo work.
- Work one issue at a time in a child worktree.
- Do not start the next issue while the current PR is unmerged.
- Treat `origin/main` and live GitHub PR/issue state as source of truth.
- Stop if local `main` cannot sync to `origin/main`; do not start issue work
  from a stale baseline.
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
5. Ask `@Codex` for review once checks pass.
6. If review is only an eyes reaction, wait; do not merge.
7. If review feedback appears, verify it against current code before changing
   files.
8. Fix every valid actionable item.
9. Rerun relevant checks serially.
10. Re-request `@Codex` review once after fixes.
11. Resolve addressed review threads; minimize stale/outdated threads when the
    PR surface is noisy.
12. Run Gitleaks on local history/current tree and inspect remote PR diff/state
    for leaks.
13. If a secret reaches remote Git, stop and remove it from branch history
    before merge.
14. Merge only after latest-head clean review, green checks, and secret scan.
15. Squash merge only.
16. Verify issue closure; comment with PR link and close manually if needed.
17. Delete branch, clean child worktree, and archive/handoff.

## Review Lessons

- Use `skills/viewfoundry/references/review-learnings.md` before PR fixes,
  release/CI edits, screenshot-runner edits, report/schema edits, or mocked
  pipeline changes.
- Do not blindly implement reviewer text. Confirm the finding is still present
  on the current PR head and not an outdated thread.
- Keep `package.json` and `package-lock.json` metadata in sync, including `bin`
  entries.
- Keep runtime reports and `schemas/runtime-contract.schema.json` in sync.
- Screenshot-only or simulator-skipped paths must not report `passed`.
- Do not run `npm run check` in parallel with scripts that run `npm ci` or
  mutate `node_modules`.
- If `@Codex` returns an explicit usage-limit or setup error, report the
  blocker and do not merge.

## GitHub Auth

- Never run `gh auth refresh` unless the user explicitly asks in the current turn.
- If GitHub auth lacks a scope, report the missing scope and stop; do not start device-login polling.

## Child Threads

- Stop child work before the orchestrator edits the same worktree.
- Do not let child threads keep polling when the orchestrator is active.
