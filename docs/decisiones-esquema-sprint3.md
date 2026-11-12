# Decisiones de esquema para el Sprint 3 (HU-41)

Fecha: 2026-11-05 · Propone: Joshua · **Aprueba: Oscar** (con su review del PR) · Estado: **pendiente de aprobación**

El esquema de seis tablas está congelado desde el 2026-10-13 (`docs/api-contrato.md`). Estos tres cambios solo agregan campos opcionales, así que no rompen nada de lo que ya funciona. La migración está lista en `backend/migrations/011_sprint3_notificaciones_y_moneda.sql` y se aplica al fusionar el PR.

| ID | Cambio | Para qué | Recomendación |
|---|---|---|---|
| C-01 | `usuarios.expo_push_token` (varchar 255, nulo) | Guardar el token del teléfono para el push de RF7 | **Aprobar**: sin él no hay aviso de cobro |
| C-02 | `membresias.ultima_notificacion` (date, nulo) | No mandar dos veces el aviso del mismo cobro | **Aprobar**: evita notificaciones repetidas del cron diario |
| X-01 | `gastos.moneda` (default `MXN`), `gastos.monto_original`, `gastos.tipo_cambio` | Guardar en qué moneda se capturó un gasto (RF11) | **Aprobar** porque la HU-23 dio **IR** a RF11. `monto` sigue en MXN, así que reportes y presupuestos no cambian |
| C-03 | `usuarios.reset_token_hash` (varchar 255, nulo), `usuarios.reset_token_expira` (timestamp, nulo) | Guardar el hash del código de recuperación de contraseña y su caducidad de 30 min | **Aprobar**: permite recuperar cuentas sin guardar tokens en claro (migración 014) |
| C-04 | Tabla `ingresos` (`id`, `usuario_id` con `ON DELETE CASCADE`, `monto`, `fecha`, `descripcion`, `fuente`, `created_at`) | Guardar los ingresos del usuario en su cuenta para consultarlos desde cualquier dispositivo (HU-82) | **Aprobar**: tabla nueva e independiente; no modifica presupuestos ni reportes (migración 015) |

No cambian el esquema: RF12 (voz) y RF13 (widget). RF9 usa la columna `usuarios.rol`, que ya existe; falta agregar el rol al token y las rutas de administración.

## Decisiones que necesito de Oscar

1. ¿Aprueba C-01, C-02 y X-01 tal como están? Responder en el PR con aprobar o con los cambios.
2. ¿`tipo_cambio` con 6 decimales basta? (el spike usó una fuente gratuita con 4 a 6).
3. ¿El cron de RF7 corre dentro de la API (`node-cron`) o como tarea aparte? Afecta el hosting; lo más simple para la entrega es dentro de la API.

## Otros temas técnicos del cierre del Sprint 2 para el backlog del Sprint 3

- La fecha de cobro de una membresía no avanza al siguiente ciclo (BUG-01). Decidir: avanzar al leer o con el cron de RF7.
- `GET /tipo-cambio` está sin token y fuera de contrato (spike). Moverlo a `GET /divisas/tipo-cambio` con token cuando se implemente RF11.
- El manejador global de errores del pool de PostgreSQL y la prueba inestable del backend siguen abiertos.

## Cómo comprobar la migración

```bash
cd backend && node src/db/migrate.js   # debe imprimir "OK 011_sprint3_notificaciones_y_moneda.sql"
npm test                               # sigue en verde
```
