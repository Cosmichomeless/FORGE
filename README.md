1. FORGE — Project Management SaaS
   Será mi proyecto Full Stack principal y el proyecto insignia del portfolio.
Objetivo:
Crear una aplicación colaborativa de gestión de proyectos inspirada en herramientas como Linear/Jira, pero con alcance controlado.
Stack previsto:
- Next.js
- React
- TypeScript
- Java
- Spring Boot
- PostgreSQL
- Docker
- Azure
- GitHub Actions
Posibles extensiones:
- Redis
- WebSockets
Funcionalidades:
- Registro e inicio de sesión
- Organizaciones/equipos
- Roles y permisos
- Proyectos
- Issues/tickets
- Estados y prioridades
- Asignación de usuarios
- Comentarios
- Notificaciones
- Activity log
- Búsqueda y filtros
- Dashboard
- API REST documentada
- Tests
- Docker
- CI/CD
- Despliegue real
Conceptos académicos que quiero aprender:
- Diseño y normalización de bases de datos
- Arquitectura frontend/backend
- APIs REST
- Autenticación y autorización
- RBAC
- Patrones de diseño
- Validación
- Testing
- Seguridad
- Transacciones
- Concurrencia
- CI/CD
- Cloud y deployment

## Local PostgreSQL

Set `DB_USER` and `DB_PASSWORD` in your shell to local-only credentials (do not commit them). Start the database with `docker compose up -d db`; Compose publishes PostgreSQL only on `127.0.0.1:5432` and persists data in the `postgres_data` volume. If port 5432 is occupied, set `DB_PORT` (for example, `55432`) before running Compose. Set `DB_URL=jdbc:postgresql://localhost:5432/forge` in the backend environment (substitute your `DB_PORT` if set) alongside the same `DB_USER` and `DB_PASSWORD`, then run the backend from `backend/` with `mvn spring-boot:run`. Flyway applies migrations on startup; Hibernate validates mappings but does not create tables.

Stop the service with `docker compose down` (leave out `-v` to preserve database data). Changing local credentials after the volume is initialized does not update the existing PostgreSQL role; use the original credentials or explicitly reset your local database if its data is expendable.
