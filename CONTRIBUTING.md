# Cómo contribuir a Billo

## Ramas
- `main` — solo código estable. Nadie hace push directo ni abre PR contra ella.
- `develop` — rama de integración. Aquí llega el trabajo de todos durante el sprint.

Todas las ramas de trabajo se crean desde `develop` y siguen el formato `<tipo>/<tema>`:

| Tipo | Para qué | Ejemplo |
|------|----------|---------|
| `feature` | Nueva funcionalidad | `feature/rf2-crud-gastos` |
| `fix` | Corrección de un bug | `fix/login-token-vencido` |
| `chore` | Configuración, dependencias, CI | `chore/ci-github-actions` |
| `test` | Pruebas automatizadas | `test/backend-auth` |
| `spike` | Investigación o prototipo que no se fusiona tal cual | `spike/graficas-movimientos` |

## Commits
Formato: `tipo: descripción corta en presente`

- `feat:` — nueva funcionalidad (`feat: agrega endpoint para crear gastos`)
- `fix:` — corrección de bug (`fix: corrige validación de monto negativo`)
- `docs:` — documentación (`docs: agrega esquema de base de datos`)
- `chore:` — configuración o mantenimiento (`chore: agrega CI de lint en GitHub Actions`)
- `test:` — pruebas (`test: agrega pruebas de registro de usuario`)

## Revisión de código
- Todo PR a `develop` necesita:
  - el CI en verde (`Backend (lint)` y `Mobile (lint)`), y
  - al menos **una aprobación de alguien distinto al autor**.
- El revisor responde en **menos de 24 horas**.
- Parejas de revisión:

| Autor | Revisa |
|-------|--------|
| Oscar | Iker |
| Iker | Oscar |
| Joshua | Fernando |
| Fernando | Joshua |
| PR de pruebas (`test/…`) | Luis y Oscar |

## Quién fusiona
- **A `develop`:** el autor del PR, cuando ya tiene la aprobación y el CI en verde.
- **A `main`:** solo Joshua fusiona `develop` → `main`, al cierre de cada sprint.

## Cuándo una tarea está completa
Una tarea solo pasa a **"completa"** en ClickUp cuando **Luis Dorian la aprueba en QA**. Fusionar el PR no basta.

## Flujo para entregar una tarea
1. Crea tu rama desde `develop` con el formato `<tipo>/<tema>`.
2. Programa y prueba localmente.
3. Corre `npm run lint` — debe pasar sin errores.
4. Haz commit y push de tu rama.
5. Abre un Pull Request **hacia `develop`** usando la plantilla (se llena sola).
6. Pide revisión a tu pareja de revisión.
7. Avisa a QA (Luis Dorian) en #qa-bugs para que pruebe.
8. Cuando hay aprobación y el CI está en verde, fusionas tu PR a `develop`.
9. La tarea pasa a "completa" cuando QA la aprueba.

## Reglas
- Nunca subas el archivo `.env` (ya está en `.gitignore`).
- Nunca subas contraseñas, tokens o llaves en el código.
- Cada PR debe incluir el enlace a su tarea de ClickUp.
