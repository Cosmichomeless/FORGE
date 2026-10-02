#!/usr/bin/env bash
# Restores a dump into a NEW database (forge_restore) so the live one is never overwritten.
set -euo pipefail
cd "$(dirname "$0")"
[ -f "${1:-}" ] || { echo "uso: $0 <archivo.dump>" >&2; exit 2; }
dc() { docker compose --env-file .env -f compose.yaml "$@"; }
dc exec -T db psql -U forge_admin -d postgres -qc "DROP DATABASE IF EXISTS forge_restore" -c "CREATE DATABASE forge_restore"
dc exec -T db pg_restore -U forge_admin -d forge_restore --no-owner < "$1"
echo "Restaurada en la base forge_restore. Comprueba y, si procede, renómbrala."
