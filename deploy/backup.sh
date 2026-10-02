#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"; mkdir -p backups
out="backups/forge-$(date +%Y%m%d-%H%M%S).dump"
docker compose --env-file .env -f compose.yaml exec -T db pg_dump -U forge_admin -Fc forge > "$out"
echo "Copia: $out"
