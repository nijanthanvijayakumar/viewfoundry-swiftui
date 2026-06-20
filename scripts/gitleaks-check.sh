#!/bin/sh
set -eu

if command -v gitleaks >/dev/null 2>&1; then
  gitleaks detect --source . --config .gitleaks.toml --redact --verbose
  gitleaks dir . --config .gitleaks.toml --redact --verbose
  exit 0
fi

echo "gitleaks is required for secret scanning." >&2
exit 127
