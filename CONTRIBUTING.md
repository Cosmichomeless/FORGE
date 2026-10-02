# Contribuir a FORGE

## Flujo de trabajo

1. Selecciona una issue y acuerda su alcance antes de añadir funcionalidad.
2. Crea una rama corta desde main: `git switch -c feat/9-users` (o fix/, docs/, chore/).
3. Mantén cada PR pequeña, enfocada y relacionada con una issue.
4. Ejecuta las comprobaciones de abajo y abre una PR usando la plantilla.
5. Solicita revisión y fusiona solo cuando los criterios y comprobaciones se cumplan.

Usamos Conventional Commits: `feat(auth): add registration`,
`fix(db): prevent duplicate emails`, `docs: explain local setup`.
No publiques credenciales, archivos .env ni datos personales en commits o issues.

## Comprobaciones

Desde frontend/: `npm run lint && npm run typecheck && npm run test && npm run build`.
Desde backend/, con JAVA_HOME apuntando a JDK 25: `mvn clean verify`.
Para cambios de infraestructura: `docker compose config --quiet` después de configurar .env.
Los mismos checks se ejecutan en GitHub Actions en cada PR (`.github/workflows/frontend.yml` y `backend.yml`, filtrados por ruta). Un fallo marca la comprobación como fallida.

## De rama a merge

1. Rama corta desde `main` con prefijo `feat/`, `fix/`, `docs/` o `chore/`.
2. Commits con Conventional Commits; referencia la issue en el cuerpo o la PR (`Closes #N`).
3. Abre una PR pequeña con la plantilla y espera los checks: **Frontend / lint, typecheck, test, build** y **Backend / compile, test, package**.
4. Fusiona solo con los checks en verde y los criterios de la issue cumplidos.
5. Recomendado: en *Settings → Branches* protege `main` exigiendo esos dos checks y una PR antes de fusionar (es un ajuste del repositorio, no vive en el código).

## Definition of Done

- Criterios de aceptación de la issue satisfechos y evidencia registrada.
- Pruebas relevantes añadidas o actualizadas; todos los checks aplicables pasan.
- Cambios de configuración y migraciones documentados.
- Sin secretos ni artefactos de build; ejemplos seguros mantenidos.
- README actualizado cuando cambian los pasos de instalación o uso.
- PR revisada, vinculada a la issue y con riesgos o limitaciones indicados.
- Cerrar la issue solo cuando su implementación esté publicada y verificada.
