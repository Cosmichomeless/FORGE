# FORGE — ficha de portfolio

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

Proyecto individual: definí el alcance, tomé las decisiones de diseño y llevé el producto
desde el primer commit (25 de septiembre de 2026) hasta la demo pública (7 de octubre),
con unos 54 commits organizados en issues y pull requests. Lo desarrollé con un asistente
de IA (Claude Code) como apoyo para escribir código, y asumí yo la dirección, la revisión
y la verificación de cada entrega.

- **Producto y modelo de datos**: acoté un MVP de gestor de incidencias multiusuario y
  diseñé el modelo (organizaciones, membresías con roles, proyectos, incidencias,
  comentarios, actividad) con nueve migraciones de Flyway.
- **Seguridad**: sesión `HttpOnly` con CSRF en lugar de JWT en el navegador, autorización
  por rol en cada operación y una matriz de pruebas que lo comprueba.
- **Calidad**: pruebas contra PostgreSQL real con Testcontainers (102 en backend), E2E con
  Playwright y comprobaciones de accesibilidad con axe, todo en CI con GitHub Actions.
- **Operación**: ensayé la producción en local (HTTPS, secretos por entorno, rol de BD sin
  privilegios, copia y restauración) y después desplegué una demo real sin coste: Vercel
  para el frontend, Render para la API y Neon para PostgreSQL.
- **Un problema real del despliegue**: con frontend y API en dominios distintos, Safari
  bloquea la cookie de sesión. Lo resolví sirviendo `/api/*` desde el dominio del frontend
  con un `rewrite` de Next.js, de modo que la cookie es de primera parte.
- **Honestidad técnica**: la documentación separa lo verificado de lo no verificado. Antes de
  cerrar cada issue de despliegue comprobé el entorno real (salud, sesión, E2E contra la URL
  pública, migraciones en Neon y un ensayo de `pg_dump`/`pg_restore`) y dejé anotados los
  límites del plan gratuito (arranque en frío, acceso público a la BD, sin alertas).

## Enlaces

- Código y documentación: https://github.com/Cosmichomeless/FORGE
- Demo pública: https://forge-sandy-eta.vercel.app (planes gratuitos; la primera visita puede tardar hasta un minuto)
- Despliegue gratuito: [docs/deploy-free.md](deploy-free.md) · Alternativa Azure (solo documentada): [docs/azure.md](azure.md)
