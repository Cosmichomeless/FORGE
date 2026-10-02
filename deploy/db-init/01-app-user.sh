#!/bin/sh
# Runs once on first start. Separates the administrator (operations only) from the
# application role used by the backend, and makes the app role owner of the schema
# so that Flyway can migrate without superuser rights.
set -e
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<SQL
CREATE ROLE forge_app LOGIN PASSWORD '${APP_DB_PASSWORD}' NOSUPERUSER NOCREATEDB NOCREATEROLE;
ALTER DATABASE ${POSTGRES_DB} OWNER TO forge_app;
ALTER SCHEMA public OWNER TO forge_app;
REVOKE ALL ON DATABASE ${POSTGRES_DB} FROM PUBLIC;
GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO forge_app;
SQL
