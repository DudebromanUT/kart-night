#!/bin/bash
# Claude Code cloud sessions: install npm packages so lint, tests and builds
# work from the first command. Safe to run repeatedly; does nothing locally.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
npm install --no-audit --no-fund

# The database tests (npm run test:db) need PostgreSQL's server tools.
if ! ls -d /usr/lib/postgresql/*/bin/initdb >/dev/null 2>&1; then
  echo "Note: PostgreSQL server tools not found; npm run test:db will be unavailable." >&2
fi
