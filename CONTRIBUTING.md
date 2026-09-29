# Cómo contribuir a Billo

## Ramas
- `main` — solo código estable. Nadie hace push directo ni abre PR contra ella.
- `develop` — rama de integración. Aquí llega el trabajo de todos durante el sprint.
- `feature/<rf>-<tema>` — nueva funcionalidad, creada desde `develop` (ej. `feature/rf2-crud-gastos`).
- `fix/<tema>` — corrección de un bug, creada desde `develop` (ej. `fix/login-token-vencido`).

Solo el líder de proyecto fusiona `develop` → `main`, al cierre de cada sprint.

## Commits
Formato: `tipo: descripción corta en presente`

- `feat:` — nueva funcionalidad (`feat: agrega endpoint para crear gastos`)
- `fix:` — corrección de bug (`fix: corrige validación de monto negativo`)
- `docs:` — documentación (`docs: agrega esquema de base de datos`)

## Flujo para entregar una tarea
1. Crea tu rama desde `develop`.
2. Programa y prueba localmente.
3. Corre `npm run lint` — debe pasar sin errores.
4. Haz commit y push de tu rama.
5. Abre un Pull Request **hacia `develop`** usando la plantilla (se llena sola).
6. Pide revisión a otro desarrollador — debe aprobar en menos de 24 h.
7. Avisa a QA (Luis Dorian) en #qa-bugs para que pruebe.
8. Cuando QA aprueba, el líder fusiona el PR a `develop`.

## Reglas
- Nunca subas el archivo `.env` (ya está en `.gitignore`).
- Nunca subas contraseñas, tokens o llaves en el código.
- Cada PR debe incluir el enlace a su tarea de ClickUp.
