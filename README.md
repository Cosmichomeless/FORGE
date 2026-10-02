<div align="center">

# FORGE

**Un espacio de gestión de proyectos, construido paso a paso.**

![Estado](https://img.shields.io/badge/estado-MVP%20local-blue)
![Java](https://img.shields.io/badge/Java-25-orange)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Licencia](https://img.shields.io/badge/licencia-MIT-green)

</div>

FORGE es un proyecto full stack de portfolio inspirado en Linear/Jira. Incluye registro e inicio de sesión con Spring Security (sesión HttpOnly + CSRF), organizaciones multiusuario con roles (OWNER, ADMIN, MEMBER) e invitaciones con caducidad, proyectos, incidencias numeradas por proyecto (`KEY-N`) con estado, prioridad y asignación, comentarios, historial de actividad, búsqueda y panel personal. **No hay demo pública ni release de producción: el despliegue en Azure está solo documentado (ver [docs/azure.md](docs/azure.md)), no ejecutado.**

## Arquitectura


```mermaid
flowchart LR
  Browser[Navegador] --> UI[Next.js · :3000]
  UI -->|Sesión HttpOnly + CSRF| API[Spring Boot · :8080]
  API --> DB[(PostgreSQL · :5432)]
```

El frontend usa TanStack Query, componentes con convenciones shadcn/ui y formularios de registro/login validados con React Hook Form + Zod. La sesión se resuelve con la API real; las funciones de gestión llegarán en las siguientes issues. Flyway es la única vía para cambiar el esquema; Hibernate solo lo valida.

## Requisitos

- JDK **25** y Maven **3.9+**. Confirma con java -version y mvn -v que Maven usa Java 25.
- Node.js **22.16+ dentro de la rama 22 LTS**, o **24 LTS**, npm **10+** (compatibles con Next.js y las herramientas de pruebas).
- Docker con el daemon activo y Docker Compose v2.
- Git. Puertos locales: frontend 3000, backend 8080 y PostgreSQL 5432.

Los comandos siguientes usan Bash/Zsh. En PowerShell, exporta las mismas variables con $env:VARIABLE y selecciona JAVA_HOME según tu instalación; no uses source.

## Instalación desde cero

1. Clona el repositorio:

```bash
git clone https://github.com/Cosmichomeless/FORGE.git
cd FORGE
```

2. Copia los ejemplos (nunca contienen credenciales reales):

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Edita .env y backend/.env: rellena DB_PASSWORD con una contraseña **local**, igual en ambos archivos. DB_USER también debe coincidir. Si cambias DB_PORT, ajusta el puerto de DB_URL en backend/.env. Configura NEXT_PUBLIC_API_URL con el origen de la API y APP_FRONTEND_ORIGIN con el de la interfaz (sin barra final). Usa localhost consistentemente; mezclarlo con 127.0.0.1 cambia origen y cookies. Cualquier NEXT_PUBLIC_* es visible en el navegador y no debe contener secretos.

Para esta guía local usa una contraseña aleatoria larga con letras, números, guiones y guiones bajos, sin espacios ni caracteres de shell como `$`, comillas o `;`. Así la asignación se interpreta igual en Docker Compose y al cargarla con `source`. Esta recomendación de formato es para el entorno local, no una política de contraseñas de usuarios.

3. Desde la raíz, inicia PostgreSQL:

```bash
docker compose config --quiet
docker compose up -d --wait db
```

Docker Compose lee el .env de la raíz automáticamente. La conexión se publica solo en 127.0.0.1 y los datos persisten en un volumen.

4. En otra terminal, desde la raíz, exporta la configuración e inicia la API:

```bash
set -a
source backend/.env
set +a
# Selecciona JDK 25 si Maven usa otra versión. En macOS:
export JAVA_HOME="$(/usr/libexec/java_home -v 25)"
mvn -v
(cd backend && mvn spring-boot:run)
```

Spring Boot **no carga .env automáticamente**: source exporta las variables para el proceso Maven. Usa solo un archivo local de confianza, ya que source ejecuta instrucciones de shell. La configuración base ya usa variables de entorno; no requiere activar un perfil local. Usa /actuator/health para comprobar la API.

5. En otra terminal, desde la raíz, inicia la interfaz:

```bash
cd frontend
npm ci
npm run dev
```

Abre http://localhost:3000. Desde la página inicial puedes ir a /register y /login. Tras iniciar sesión accedes a /dashboard. Desde /organizations creas una organización y cambias de organización activa con el selector de la barra superior; en /organizations/{id} gestionas ajustes, miembros e invitaciones según tu rol. 

## Verificación

```bash
# Desde la raíz, con Maven usando JDK 25:
(cd backend && mvn clean verify)
(cd frontend && npm run lint && npm run typecheck && npm run test && npm run build)
curl --fail http://localhost:8080/actuator/health
```

El test del backend comprueba la salud con H2; no sustituye una prueba de integración con PostgreSQL. Para comprobar Flyway localmente, arranca la API dos veces con PostgreSQL y consulta desde la raíz:

```bash
docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT version, success FROM flyway_schema_history;"'
```

V1 debe figurar una sola vez con success=true. No modifiques migraciones ya aplicadas: añade una nueva migración versionada.

### Alternativa: todo el stack con Docker Compose

Con `.env` de la raíz rellenado (`DB_USER`, `DB_PASSWORD` son obligatorios), `docker compose up -d --build --wait` construye y levanta PostgreSQL, API y frontend; cada servicio espera a que el anterior esté *healthy*. La API queda en http://127.0.0.1:8080 y la interfaz en http://127.0.0.1:3000 (puertos configurables con `BACKEND_PORT` / `FRONTEND_PORT`). `NEXT_PUBLIC_API_URL` se incrusta al construir la imagen del frontend, así que cambiarla exige `--build`.

## Pruebas

- Backend: 102 tests (`mvn clean verify`), incluidas pruebas contra PostgreSQL real con Testcontainers (se omiten si no hay Docker) y la matriz de roles.
- Frontend: Vitest (`npm run test`).
- E2E: `./scripts/e2e.sh` levanta un PostgreSQL temporal, la API y el frontend, y ejecuta con Playwright el recorrido registro → organización → proyecto → incidencia → asignación → comentario → cambio de estado, con análisis de accesibilidad axe (solo de las pantallas recorridas, no de toda la app).
- CI: GitHub Actions ejecuta lint/typecheck/test/build del frontend y `mvn clean verify` del backend en cada PR (los E2E no se ejecutan en CI).

## Parar los servicios

Detén frontend y backend con Ctrl+C en sus terminales. Desde la raíz, ejecuta docker compose down para detener la base sin eliminar el volumen. **No uses la opción -v si necesitas conservar los datos.**

## Problemas frecuentes

| Síntoma | Qué comprobar |
| --- | --- |
| release version 25 not supported | Maven usa otro JDK. Configura JAVA_HOME y confirma con mvn -v. En macOS: export JAVA_HOME="$(/usr/libexec/java_home -v 25)". |
| Docker no conecta | Abre Docker Desktop o inicia el daemon y verifica docker info. |
| Puerto 5432 ocupado | Cambia DB_PORT, por ejemplo a 55432, y el puerto de DB_URL antes del arranque. |
| DB_PASSWORD ausente o autenticación fallida | Rellena ambos ejemplos copiados y exporta backend/.env. Credenciales nuevas no cambian un volumen PostgreSQL ya inicializado. |
| Frontend en 3000 o API en 8080 ocupados | Detén únicamente el proceso que hayas identificado como propio, o configura un puerto alternativo. |
| Flyway informa de checksum diferente | Restaura la migración original y crea una nueva para cambios adicionales; no borres datos para ocultar el fallo. |

## Estructura

```text
FORGE/
├── backend/       # Spring Boot, tests y migraciones Flyway
├── frontend/      # Next.js App Router, componentes y tests
├── .github/       # Plantillas de issues/PR y workflows de CI
├── docs/          # Arquitectura y operación en Azure
├── scripts/       # e2e.sh
├── compose.yaml   # PostgreSQL, API y frontend
└── CONTRIBUTING.md
```

## Autenticación y seguridad

| Endpoint | Resultado |
| --- | --- |
| GET /api/v1/auth/csrf | Token y nombre de cabecera CSRF; accesible antes de login. |
| POST /api/v1/auth/register | JSON con name/email/password; 201 con id/name/email, 400 por validación o 409 por email duplicado. |
| POST /api/v1/auth/login | JSON con email/password; 200 con usuario y sesión, 401 por credenciales inválidas. |
| GET /api/v1/auth/me | Usuario actual o 401 si no hay sesión válida. |
| POST /api/v1/auth/logout | 204, sesión invalidada y cookie eliminada. |

Todas las operaciones POST requieren CSRF, incluso registro/login/logout. El cliente obtiene el token con credentials: include, envía la cabecera indicada y vuelve a obtenerlo para cada operación. El login cambia el ID de sesión y renueva CSRF. Las respuestas de autenticación no se almacenan en caché. No se guardan contraseñas ni tokens de sesión en localStorage.

La API usa BCrypt (coste 12), email normalizado y único en PostgreSQL, y devuelve DTOs sin hash. Registro admite nombre de 1–100 caracteres, email de hasta 254 y contraseña de 8–72 caracteres sin superar **72 bytes UTF-8**.

La cookie de sesión es HttpOnly y caduca tras 30 minutos de inactividad. COOKIE_SECURE=false y COOKIE_SAME_SITE=lax son solo los valores locales para HTTP. En despliegue HTTPS establece **COOKIE_SECURE=true**. Si frontend y API son cross-site, requiere COOKIE_SAME_SITE=none y HTTPS/Secure; CORS solo admite APP_FRONTEND_ORIGIN. Estas opciones no sustituyen la verificación del despliegue de las futuras issues de release.

El frontend resuelve /me antes de mostrar contenido privado y redirige al login si recibe 401. La autorización real se aplica en la API; el shell cliente no sustituye controles del servidor. Las sesiones viven en memoria del backend y se pierden al reiniciarlo. No hay todavía recuperación de contraseña, OAuth, MFA ni almacenamiento distribuido de sesiones.

### Tests de autenticación con PostgreSQL

La suite normal usa H2 y un servidor embebido para verificar cookies. AuthTests y las pruebas de organizaciones también pueden ejecutarse contra PostgreSQL con AUTH_TEST_DB_URL, AUTH_TEST_DB_USER y AUTH_TEST_DB_PASSWORD. **Usa exclusivamente una base separada y desechable: estas clases eliminan usuarios, organizaciones, membresías e invitaciones entre tests. Nunca apuntes a desarrollo compartido o producción.**

```bash
# Variables exportadas previamente para una base PostgreSQL de pruebas dedicada:
(cd backend && mvn -Dtest='AuthTests,Organization*Tests,InvitationTests,MemberTests' test)
```

## Organizaciones y roles

Todos los endpoints requieren sesión y, en operaciones no seguras, CSRF. Una organización ajena se comporta como inexistente (404); un rol insuficiente devuelve 403.

| Endpoint | Quién | Resultado |
| --- | --- | --- |
| POST /api/v1/organizations | Autenticado | Crea la organización (name, slug único) y al creador como OWNER en la misma transacción. |
| GET /api/v1/organizations | Autenticado | Solo organizaciones donde eres miembro, con tu rol. |
| GET/PUT /api/v1/organizations/{id} | Miembro / OWNER, ADMIN | Consulta y edición de name y slug. |
| GET/POST /api/v1/organizations/{id}/invitations | OWNER, ADMIN | Lista las pendientes y crea una invitación (email, rol ADMIN o MEMBER). |
| DELETE /api/v1/organizations/{id}/invitations/{invitationId} | OWNER, ADMIN | Revoca una invitación pendiente. |
| POST /api/v1/invitations/accept | Usuario invitado | Acepta con el token (body) y crea una única membresía. |
| GET /api/v1/organizations/{id}/members | Miembro | Lista de miembros. |
| PUT/DELETE /api/v1/organizations/{id}/members/{userId} | Ver abajo | Cambia rol o retira miembros. |

Reglas de miembros: OWNER gestiona a todos; ADMIN solo gestiona MEMBER (puede ascenderlo a ADMIN); MEMBER no gestiona a nadie, pero puede salir de la organización. Una organización siempre conserva al menos un OWNER, incluso con peticiones concurrentes (bloqueo de la fila de la organización).

Invitaciones: caducan a los 7 días (APP_INVITATION_TTL, p. ej. 3d o 12h) y solo se guarda el hash SHA-256 del token. **El token se muestra una única vez al crearla** como enlace /invitations/accept#token=… (el fragmento no viaja al servidor). Debe aceptarla un usuario autenticado cuyo email coincide con el invitado; caducadas, usadas o de otro email se rechazan (410, 409, 403). **Limitaciones actuales:** no se envían correos, el creador comparte el enlace manualmente, y si el invitado no tiene sesión el redireccionamiento al login pierde el fragmento (puede pegar el token en /invitations/accept).

## Proyectos e incidencias

Cada organización agrupa sus trabajos en proyectos (`/api/v1/organizations/{organizationId}/projects`):

| Método | Ruta | Rol |
| --- | --- | --- |
| `POST` | `/` | OWNER / ADMIN |
| `GET` | `/?status=ACTIVE\|ARCHIVED\|ALL` (por defecto `ACTIVE`) | cualquier miembro |
| `GET` | `/{projectId}` | cualquier miembro |
| `PUT` | `/{projectId}` (nombre y descripción) | OWNER / ADMIN |
| `POST` | `/{projectId}/archive` y `/restore` (idempotentes) | OWNER / ADMIN |

- La **clave** (2–10 caracteres, mayúsculas y dígitos, empieza por letra) es única por organización, inmutable y se normaliza a mayúsculas. Sigue reservada tras archivar.
- Los proyectos archivados siguen siendo legibles por los miembros, no aparecen en el listado por defecto y no se pueden editar (409).
- Un proyecto de otra organización o un no miembro recibe 404; un rol insuficiente, 403.
- Las **incidencias** se numeran por proyecto (`KEY-1`, `KEY-2`…) con un contador `projects.last_issue_number` que se incrementa bajo bloqueo pesimista de la fila del proyecto, en la misma transacción que el alta. No hay huecos si la transacción falla y nunca se usa `MAX()+1`.
- Las incidencias se gestionan en `/api/v1/organizations/{organizationId}/projects/{projectId}/issues` (alta, listado con filtros, detalle por número, edición, y `PUT` de `assignee`, `status` y `priority`), con comentarios e historial de actividad. La búsqueda por organización está en `/organizations/{id}/issues` y el panel personal en `/me/dashboard`.
- **Estados**: los definidos por el modelo (incluye `DONE`). **Prioridades**: `LOW`, `MEDIUM`, `HIGH`, `URGENT` (elección de diseño de este proyecto, no un estándar).
- En la interfaz, el panel de proyectos está en el detalle de la organización y cada proyecto tiene su página en `/organizations/{id}/projects/{projectId}`.

## Decisiones y limitaciones

- **Numeración sin huecos**: contador por proyecto bajo bloqueo pesimista en lugar de `MAX()+1`; coste: serializa altas concurrentes en un mismo proyecto (probado con 12 altas en 6 hilos).
- **Sesión HttpOnly + CSRF** en vez de JWT en el navegador: evita exponer tokens a JavaScript; exige configurar bien origen, cookies y `SameSite` entre dominios ([docs/azure.md](docs/azure.md)).
- **Flyway como única vía de esquema**; Hibernate solo valida.
- La búsqueda usa `LIKE` (sin índice de texto completo): suficiente para el volumen de demostración.
- Eliminar a un miembro de una organización no limpia sus asignaciones existentes.
- Los análisis axe cubren las pantallas del recorrido E2E, no toda la interfaz.
- La URL de la API del frontend es fija en tiempo de build.

## Despliegue

Arquitectura Azure propuesta (Container Apps + PostgreSQL Flexible Server), configuración de producción, copia/restauración y checks posteriores: [docs/azure.md](docs/azure.md). **Pendiente de ejecutar**; no hay demo pública ni capturas publicadas todavía.

## Roadmap y contribuciones

Las issues de GitHub son la fuente de seguimiento. No se promete ninguna extensión (Redis/WebSockets) en esta base.

Consulta [CONTRIBUTING.md](CONTRIBUTING.md) para ramas cortas, Conventional Commits, comprobaciones y Definition of Done. Las plantillas de issues y PR están en .github/. Los checks de CI se ejecutan en cada PR; ejecútalos también en local antes de solicitar revisión.

## Licencia

[MIT](LICENSE) · David Rodríguez.
