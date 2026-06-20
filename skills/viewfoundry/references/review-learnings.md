# Review Learnings

Use this reference before fixing Codex review feedback or changing workflow,
CI, release, screenshot, report, schema, or mocked-pipeline behavior.

## Review Handling

- Verify the finding against the latest PR head before editing.
- Treat an eyes reaction as acknowledgement only.
- If Codex returns an explicit usage-limit or setup error, report the blocker
  and do not merge.
- Re-request review once after fixes; avoid duplicate review spam.
- Resolve addressed inline threads. Minimize stale/outdated threads when they
  obscure current state.
- Reply in review threads for inline feedback when a reply is needed.
- Do not start the next issue while the current PR is unmerged.

## PR Hygiene

- Keep PR bodies in the template shape; do not leave literal `\n` escape text
  in rendered markdown.
- Use concise branch names with standard prefixes.
- Keep one issue per branch and PR.
- Verify issue closure after squash merge; comment with the PR link and close
  manually if auto-close does not happen.
- Delete remote/local branches and remove child worktrees after merge.

## GitHub And Auth

- Use live GitHub state and `origin/main` as source of truth.
- If local `main` cannot sync to `origin/main`, stop issue work.
- Never run `gh auth refresh` unless explicitly asked in the current turn.
- If a workflow edit requires missing `workflow` scope, report the missing
  scope and stop.

## Checks

- Run `npm run check`, `npm run secrets`, `pre-commit run --all-files`, and
  `sh scripts/docker-check.sh` when relevant.
- Run npm checks and Docker-style checks serially. Docker checks may run
  `npm ci`, which can remove `node_modules/.bin/tsc` during a parallel
  TypeScript check.
- Treat Docker Hub metadata timeouts as external registry blockers when local
  portable checks already pass.
- Before merge, run Gitleaks on local history/current tree and inspect the PR
  diff for secret-like additions.
- Prefer explicit Gitleaks commands: `gitleaks git . --log-opts=--all` for
  local history, `gitleaks dir .` for the current tree, and `gitleaks stdin`
  for PR diffs.

## Manifest And Package Metadata

- `.codex-plugin/plugin.json` must match the plugin schema; for this plugin,
  `interface.defaultPrompt` is an array.
- Keep `package.json` and `package-lock.json` workspace metadata in sync,
  including `bin` entries.

## Runtime Reports And Schemas

- Keep final report fields aligned with `schemas/runtime-contract.schema.json`.
- Do not add report fields without updating the contract docs and schema.
- If a step fails, mark the step failed and include an actionable
  `RuntimeError`.
- Screenshot-only, simulator-skipped, or mocked paths must not report final
  `passed`; use `blocked` or `failed` until real screenshot metadata exists.

## Screenshot Runner

- Preserve selector stderr in artifacts and final reports so simulator failures
  keep actionable device/runtime hints.
- Default run IDs must be unique enough for near-simultaneous captures.
- Name-only `VIEWFOUNDRY_SANDBOX_DESTINATION` values are build destinations,
  not screenshot simulator overrides. Screenshot override mode requires an
  explicit simulator id.
- Use the same `VIEWFOUNDRY_BUILD_CONFIGURATION` for `xcodebuild` and the app
  path lookup.

## Mocked Pipeline

- Optional successful diff comparisons do not make the full mocked pipeline
  passed while simulator capture is skipped.
- Below-threshold diffs must mark the diff step failed and explain the score
  and threshold.
- Generated Swift text must use Swift string literal escaping, not raw JSON
  string escaping.
