#!/usr/bin/env bash
# Runs the database schema and its access rules against a throwaway local
# PostgreSQL, using a stand-in for Supabase's auth. Needs PostgreSQL 15+ installed.
set -euo pipefail

cd "$(dirname "$0")/.."
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
if [[ -z "$PGBIN" || ! -x "$PGBIN/initdb" ]]; then
  echo "PostgreSQL server binaries not found; set PGBIN" >&2
  exit 1
fi

DIR="$(mktemp -d)"
PORT=54329
# initdb refuses to run as root, so use the postgres account when we are root.
as_db_user() { if [[ $EUID -eq 0 ]]; then runuser -u postgres -- "$@"; else "$@"; fi; }
if [[ $EUID -eq 0 ]]; then chown postgres "$DIR"; fi

as_db_user "$PGBIN/initdb" -D "$DIR/data" -U postgres -A trust >/dev/null
as_db_user "$PGBIN/pg_ctl" -D "$DIR/data" -o "-k $DIR -p $PORT -c listen_addresses=''" -l "$DIR/log" -w start >/dev/null
trap 'as_db_user "$PGBIN/pg_ctl" -D "$DIR/data" -m fast stop >/dev/null; rm -rf "$DIR"' EXIT

files=(-f supabase/tests/local_auth_stub.sql)
for m in supabase/migrations/*.sql; do files+=(-f "$m"); done
files+=(-f supabase/tests/schema_test.sql)

psql -h "$DIR" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "${files[@]}"
