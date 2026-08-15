#!/usr/bin/env bash
# デモ導線のスモークを走らせる。psql が無い環境では supabase のDBコンテナ経由で実行する。
set -euo pipefail

DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
SQL="$(dirname "$0")/demo_smoke.sql"

if command -v psql >/dev/null 2>&1; then
  exec psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$SQL"
fi

container="$(docker ps --filter name=supabase_db_ --format '{{.Names}}' | head -1)"
if [ -z "$container" ]; then
  echo "psql も supabase のDBコンテナも見つからない。npx supabase start を実行する。" >&2
  exit 1
fi
exec docker exec -i "$container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - <"$SQL"
