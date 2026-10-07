# FORGE v1.0.0

Primera versión completa del MVP. Demo pública: https://forge-sandy-eta.vercel.app
(Vercel + Render + Neon, planes gratuitos). También se ejecuta en local con `docker compose up`.

## Incluye
- Autenticación, organizaciones, roles e invitaciones.
- Proyectos, incidencias, comentarios, actividad, búsqueda y panel personal.
- 102 tests de backend (con PostgreSQL real), tests de frontend, E2E con axe y CI.
- Imágenes Docker, Compose y ensayo de producción en `deploy/`.
- Despliegue gratuito verificado (salud, sesión, E2E contra la URL pública, migraciones y
  ensayo de copia/restauración en Neon): [docs/deploy-free.md](docs/deploy-free.md).

## Limitaciones conocidas
- La API se duerme tras ~15 min sin tráfico: la primera visita tarda 30–60 s.
- La base de datos de Neon Free es accesible públicamente (TLS y contraseña, sin filtro por IP) y no hay alertas.
- Azure queda solo documentado ([docs/azure.md](docs/azure.md)); no se ha desplegado.
