# FORGE — ficha de portfolio

> Borrador. La sección «Mi aportación» es un punto de partida: ajústala a lo que
> realmente hiciste tú.

## Problema

Los equipos pequeños necesitan seguir trabajo (incidencias, responsables, estados)
sin la complejidad de Jira. FORGE es un gestor de proyectos multiusuario inspirado en
Linear/Jira, construido como ejercicio de ingeniería full stack de extremo a extremo.

## Solución

- Organizaciones con roles (OWNER, ADMIN, MEMBER) e invitaciones con caducidad.
- Proyectos con clave única, incidencias numeradas sin huecos (`CORE-1`), estado,
  prioridad, asignación, comentarios e historial de actividad.
- Búsqueda y filtros, y panel personal de incidencias asignadas.

## Stack

Java 25 · Spring Boot 4 · Spring Security · PostgreSQL + Flyway · Next.js 16 · React 19 ·
TanStack Query · Docker/Compose · GitHub Actions · Playwright + axe · Testcontainers.

## Decisiones destacables

- Numeración de incidencias con bloqueo pesimista, probada con altas concurrentes.
- Sesión HttpOnly + CSRF en lugar de JWT en el navegador.
- Pruebas contra PostgreSQL real, matriz de roles y E2E con accesibilidad.
- Producción ensayada en local con HTTPS, secretos por entorno, rol de BD sin
  privilegios y smoke test (`deploy/`).

## Mi aportación

_(Completa con tu rol: diseño del modelo, seguridad, pruebas, CI, operación…)_

## Enlaces

- Código y documentación: https://github.com/Cosmichomeless/FORGE
- Demo pública: **no disponible** (ver `docs/azure.md`).
