#!/bin/sh
set -eu

if ! command -v ruby >/dev/null 2>&1; then
  echo "ruby is required for workflow YAML parsing." >&2
  exit 1
fi

ruby -e 'require "yaml"; Dir[".github/workflows/*.yml"].sort.each { |file| YAML.load_file(file); puts "parsed #{file}" }'

test -f .github/workflows/ci.yml
test -f .github/workflows/release.yml

grep -Eq '^  pull_request:' .github/workflows/ci.yml
grep -Eq '^  push:' .github/workflows/ci.yml
grep -Eq '^  workflow_dispatch:' .github/workflows/ci.yml
grep -Eq '^concurrency:' .github/workflows/ci.yml
grep -q 'cancel-in-progress:' .github/workflows/ci.yml
grep -q 'npm run typecheck' .github/workflows/ci.yml
grep -q 'npm test' .github/workflows/ci.yml
grep -q 'npm run check' .github/workflows/ci.yml
grep -q 'npm run secrets' .github/workflows/ci.yml
grep -q 'pre-commit run --all-files' .github/workflows/ci.yml
grep -q 'sh scripts/docker-check.sh' .github/workflows/ci.yml
grep -q 'npm run smoke:cli' .github/workflows/ci.yml
grep -q 'npm run pack:dry-run' .github/workflows/ci.yml

grep -q 'v\*\.\*\.\*' .github/workflows/release.yml
grep -q -- '--verify-tag' .github/workflows/release.yml
grep -q -- '--generate-notes' .github/workflows/release.yml
