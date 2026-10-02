#!/usr/bin/env bash
# Rehearsal of a production release: generate secrets once, back up, build, start, verify, roll back on failure.
set -euo pipefail
cd "$(dirname "$0")"
dc() { docker compose --env-file .env -f compose.yaml "$@"; }

if [ ! -f .env ]; then
  umask 077
  printf 'DB_ADMIN_PASSWORD=%s\nDB_APP_PASSWORD=%s\n' "$(openssl rand -hex 16)" "$(openssl rand -hex 16)" > .env
  echo "Secretos generados en deploy/.env (ignorado por Git)."
fi

if dc ps --status running --services 2>/dev/null | grep -q '^db$'; then
  echo "Copia previa al despliegue..."
  ./backup.sh
fi

dc up -d --build --wait
if ./smoke.sh; then
  echo "Despliegue verificado."
else
  echo "Smoke test fallido: reversión. Restaura la última copia de deploy/backups con ./restore.sh <archivo> si hubo migraciones destructivas." >&2
  dc logs --tail 50 backend >&2
  exit 1
fi
