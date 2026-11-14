# [RF9] El administrador no puede crear la categoría exigida por CP-RF9-01

- Caso(s): CP-RF9-01.
- Historia / tarea: validación RF7/RF9/RF10 sobre HU-53; sin ID externo disponible.
- Severidad: **Alta**, propuesta: el alta de categorías exigida por el caso no está disponible; el CRUD de servicios no permite completarla.
- Estado: Abierto, reproducido en API local; ejecución del APK y alta en ClickUp pendientes.
- Responsable: Por asignar; revisión del alcance con Joshua y coordinación con backend/frontend sugeridas, sin asignación acordada.
- Fecha de reporte: 2026-11-12, America/Mexico_City.
- Fecha de corrección: Por acordar.

## Ambiente

- Rama y commit: `develop`, `0b84c0bb8b02fd850930abd8b446858e25227235`.
- API / ambiente: Express y PostgreSQL temporal, migraciones 001–018; base eliminada al terminar.
- Sistema: Windows, Node v22.15.0; Supertest del proyecto.
- Versión de app: código local 1.0.0 / Expo `~58.0.25`; APK HU-53 no ejecutado.
- La reproducción es HTTP; no acredita una prueba en Android.

## Precondiciones

Preparar la API local siguiendo `backend/README.md`, en una BD de QA aislada.
Usar una cuenta admin promovida mediante `npm run seed:admin` y obtener su JWT
con login. Comprobar que la categoría `Mascotas` no existe. No usar la base
compartida de producción ni publicar credenciales.

La evidencia se obtuvo con `createDatabase` y `createFixtures` de
`backend/test/helpers/`: cuenta descartable con rol admin en BD y JWT admin
firmado para esa base temporal.

## Pasos para reproducir

1. Con JWT admin válido, consultar `GET /categorias` y guardar la lista inicial.
2. Intentar crear la categoría con `POST /categorias`, `Authorization: Bearer <JWT QA>` y cuerpo:

   ```json
   {"nombre":"Mascotas","tipo":"gasto","es_predefinida":true}
   ```

3. Consultar de nuevo `GET /categorias` con el mismo JWT y buscar `Mascotas`.
4. Revisar `mobile/src/screens/AdminCatalogoScreen.js`: sus formularios gestionan servicios de `/catalogo`; no hay un alta alternativa de categorías que complete el caso.

## Resultado esperado

Según [CP-RF9-01 del plan](../../plan-de-pruebas.md), el administrador agrega
`Mascotas` y esta aparece en el catálogo de categorías disponible a los usuarios.
El plan no fija un código HTTP de alta; el contrato actual solo define lectura
de categorías. Hace falta resolver esa brecha de implementación/contrato o
acordar y documentar un cambio de alcance con el PO antes de aprobar el RF.

## Resultado obtenido

`GET /categorias` responde 200 antes y después. `POST /categorias` responde 404:

```json
{"error":{"code":"RUTA_NO_ENCONTRADA","message":"La ruta solicitada no existe"}}
```

No se crea `Mascotas` y la lista permanece idéntica. El router local solo declara
GET; las pruebas existentes de administración cubren servicios. No se declara
el mismo resultado para el APK sin probarlo.

## Evidencia

- [CP-RF9-01-api.json](../entrega-rf7-rf9-rf10-evidencias/CP-RF9-01-api.json): petición, rol, HTTP, cuerpo y comparación de datos, sin JWT ni contraseña.
- [Router de categorías](../../../backend/src/routes/categorias.routes.js).
- [Pantalla de administración](../../../mobile/src/screens/AdminCatalogoScreen.js).
- [Reporte de entrega](../entrega-rf7-rf9-rf10-reporte.md).

## Comunicación

Aviso al responsable el mismo día: **pendiente, no enviado**. La búsqueda de
integración ClickUp no devolvió un plugin disponible; falta un canal accesible y
destinatario confirmado. El texto preparado y el registro de comunicación están
en el reporte de entrega. Registrar la fecha real del envío, sin retroactividad.

## Reprueba

- Commit corregido: Pendiente.
- Fecha y quién probó: Pendiente.
- Resultado: Pendiente.
- Evidencia: Pendiente; repetir alta/consulta, permisos de usuario normal y flujo Android conforme al alcance aprobado.
