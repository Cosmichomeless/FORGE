#!/usr/bin/env bash
# Runs the Playwright journey from a clean machine: temporary PostgreSQL, built API, then the browser test.
# Needs Docker, JDK 25, Maven and Node. Everything it starts is removed on exit.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
db_port="${E2E_DB_PORT:-55432}"
password="$(openssl rand -hex 16)"
container="forge-e2e-db-$$"
api_pid=""

cleanup() {
  [ -n "$api_pid" ] && kill "$api_pid" 2>/dev/null || true
  docker rm -f "$container" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run -d --name "$container" -e POSTGRES_DB=forge -e POSTGRES_USER=forge -e POSTGRES_PASSWORD="$password" \
  -p "127.0.0.1:$db_port:5432" postgres:17 >/dev/null
until docker exec "$container" pg_isready -U forge -d forge >/dev/null 2>&1; do sleep 1; done

(cd "$root/backend" && mvn -q -DskipTests package)
DB_URL="jdbc:postgresql://localhost:$db_port/forge" DB_USER=forge DB_PASSWORD="$password" \
  java -jar "$root"/backend/target/forge-backend-*.jar >"$root/backend/e2e-api.log" 2>&1 &
api_pid=$!
until curl -fs http://localhost:8080/actuator/health >/dev/null 2>&1 || curl -s -o /dev/null http://localhost:8080/api/v1/auth/csrf; do
  kill -0 "$api_pid" 2>/dev/null || { echo "API failed to start; see backend/e2e-api.log" >&2; exit 1; }
  sleep 1
done

cd "$root/frontend"
[ -n "${E2E_SKIP_INSTALL:-}" ] || npm ci
npx playwright install chromium
npm run e2e
