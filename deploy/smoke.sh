#!/usr/bin/env bash
# Post-deploy checks (docs/azure.md). Uses the local CA of the simulated ingress, hence -k.
set -uo pipefail
cd "$(dirname "$0")"
API=https://api.forge.localhost:8443
APP=https://app.forge.localhost:8443
fail=0
for _ in $(seq 30); do curl -fsk "$APP/login" -o /dev/null && curl -fsk "$API/actuator/health" -o /dev/null && break; sleep 1; done
check() { if eval "$2" >/dev/null 2>&1; then echo "OK   $1"; else echo "FAIL $1"; fail=1; fi; }

check "API health UP" "curl -fsk $API/actuator/health | grep -q '\"status\":\"UP\"'"
check "Health sin detalles" "! curl -fsk $API/actuator/health | grep -qi 'components\|diskSpace\|jdbc'"
check "Otros endpoints de actuator cerrados" "[ \$(curl -sk -o /dev/null -w %{http_code} $API/actuator/env) != 200 ]"
check "Frontend /login 200 por HTTPS" "[ \$(curl -sk -o /dev/null -w %{http_code} $APP/login) = 200 ]"
check "Cookie de sesión con Secure y HttpOnly" "curl -sk -D - -o /dev/null $API/api/v1/auth/csrf | grep -i '^set-cookie' | grep -qi 'secure' && curl -sk -D - -o /dev/null $API/api/v1/auth/csrf | grep -i '^set-cookie' | grep -qi 'httponly'"
check "CORS: origen ajeno rechazado" "! curl -sk -D - -o /dev/null -H 'Origin: https://evil.example' $API/api/v1/auth/csrf | grep -i 'access-control-allow-origin: https://evil'"
check "CORS: origen del frontend permitido" "curl -sk -D - -o /dev/null -X OPTIONS -H 'Origin: https://app.forge.localhost:8443' -H 'Access-Control-Request-Method: POST' $API/api/v1/auth/login | grep -qi 'access-control-allow-origin: https://app.forge.localhost:8443'"
check "Flyway sin migraciones fallidas" "[ \"\$(docker compose --env-file .env -f compose.yaml exec -T db psql -U forge_admin -d forge -tAc 'select count(*) from flyway_schema_history where not success')\" = 0 ]"
check "Backend usa rol no administrador" "[ \"\$(docker compose --env-file .env -f compose.yaml exec -T db psql -U forge_admin -d forge -tAc \"select rolsuper from pg_roles where rolname='forge_app'\")\" = f ]"
check "BD no publicada en el host" "! docker compose --env-file .env -f compose.yaml port db 5432 | grep -q ':[1-9]'"
check "Sin errores ERROR en logs del backend" "[ \$(docker compose --env-file .env -f compose.yaml logs backend 2>&1 | grep -c ' ERROR ') = 0 ]"
exit $fail
