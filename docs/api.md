# API y seguridad

Referencia de los endpoints, roles y decisiones de seguridad. Base: `/api/v1`.

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
