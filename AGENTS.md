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
8. Merge only after clean review and checks.
9. Verify issue closure; comment with PR link and close manually if needed.
10. Delete branch, clean child worktree, and archive/handoff.
