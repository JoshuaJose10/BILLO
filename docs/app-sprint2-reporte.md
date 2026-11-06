# QA app Sprint 2 — HU-40

Reporte de pruebas de las pantallas de la app. **Esta corrida se hizo en un navegador con tamaño de Android, no en un teléfono**: valida la lógica, los flujos y la API reales, pero no gestos nativos, teclado del sistema ni selector de fecha. Casos del [plan de pruebas](../plan-de-pruebas.md) (CP-RF2 a CP-RF8) ejecutados contra la API de `develop`.

## 1. Ficha de la ejecución

| Campo | Valor |
|---|---|
| Fecha | 2026-11-05 |
| Quién prueba | Claude (corrida automatizada en navegador); falta repetir Joshua/Dorian en teléfono |
| Rama y commit de `develop` | `develop` @ `64013bd` (o el más reciente) |
| Dispositivo (marca, modelo) | Navegador Chromium con viewport 412×915 y agente de Android (no es un teléfono) |
| Versión de Android (obligatoria para RNF1) | **Pendiente**: sin Android físico RNF1 no queda cubierto |
| Cómo corre la app (Expo Go SDK 58 / development build / APK) | Export web de la app (react-native-web) con la API real de `develop` y PostgreSQL 16 |
| URL de la API (`EXPO_PUBLIC_API_URL`) | http://localhost:3100 |
| Modo del teléfono (claro / oscuro) | Ambos (F6) |

> Si solo se prueba en un iPhone, anotarlo aquí: sirve como prueba exploratoria, pero **RNF1 exige un Android real**. Repetir los flujos A–F en Android antes de marcar HU-40 completa.

## 2. Preparación (una vez)

1. Levantar la API de `develop` con su base nueva: `cd backend && npm ci && node src/db/migrate.js && npm start`.
2. En `mobile/.env`: `EXPO_PUBLIC_API_URL=http://<IP de la PC>:3000`; arrancar con `npx expo start -c`. Teléfono y PC en la misma red WiFi.
3. Confirmar que `http://<IP>:3000/health` responde `{"status":"OK"}` desde el navegador del teléfono.
4. Tener tres cuentas: **usuario nuevo** (sin datos), **usuario con datos** y una cuenta extra para aislamiento.
5. Capturar pantalla de cada paso marcado con 📷 y guardar con el nombre `HU40-<flujo>-<paso>.png`.

Resultados posibles: **Pasa**, **Falla**, **Bloqueado** (explicar). Cada Falla lleva bug con la [plantilla](../plantilla-reporte-bug.md), clasificado con [criterios de calidad](../criterios-calidad.md).

## 3. Flujos completos

### Flujo A — Registro y sesión (RF1)

| # | Caso | Pasos | Resultado esperado | Resultado | Evidencia / bug |
|---|---|---|---|---|---|
| A1 | CP-RF1-01 | Registro con `prueba1@correo.com` / `Billo#2026` | Cuenta creada y entra a Inicio con su nombre | **Pasa** | `hu40-evidencias/A1.png` |
| A2 | CP-RF1-02 | Cerrar sesión y volver a entrar con las mismas credenciales | Accede y ve sus datos | **Pasa** | `hu40-evidencias/A2.png` |
| A3 | CP-RF1-03 | Registrar otra vez el mismo correo | Mensaje de correo ya registrado; no crea cuenta | **Pasa** | `hu40-evidencias/A3.png` |
| A4 | CP-RF1-04 | Login con contraseña incorrecta `xxxx` | Rechaza el acceso con mensaje claro | **Pasa** | `hu40-evidencias/A4.png` |
| A5 | Mayúsculas | Entrar con `PRUEBA1@CORREO.COM` | Accede (el correo no distingue mayúsculas) | **Pasa** | `hu40-evidencias/A5.png` |

### Flujo B — Gastos (RF2) · Movimientos (HU-27) · Editar y eliminar (HU-30)

| # | Caso | Pasos | Resultado esperado | Resultado | Evidencia / bug |
|---|---|---|---|---|---|
| B1 | CP-RF2-01 | Botón **+** → monto `80.50`, categoría Comida, hoy, Efectivo → Guardar | Aparece en Movimientos con los cuatro datos | **Pasa** | `hu40-evidencias/B1.png` |
| B2 | CP-RF2-02 | Monto `ochenta` | Error de monto inválido; no se guarda | **Pasa** | `hu40-evidencias/B2.png` |
| B3 | CP-RF2-03 | Sin categoría | Indica que es obligatoria; no se guarda | **Pasa** | `hu40-evidencias/B3.png` |
| B4 | HU-27 | Movimientos → filtro por categoría y cambiar de mes con las flechas | Lista y total filtrados correctos; mes sin gastos muestra estado vacío | **Pasa** | `hu40-evidencias/B4.png` |
| B5 | HU-30 | Editar un gasto (monto y categoría) | Cambia en la lista, en Inicio y en Reportes | **Pasa** | `hu40-evidencias/B5.png` |
| B6 | HU-30 | Eliminar un gasto y confirmar | Desaparece de todas las pantallas; cancelar no lo borra | **Pasa** | `hu40-evidencias/B6.png` |

### Flujo C — Presupuestos y alerta (RF3, RF4) · HU-33, HU-35

| # | Caso | Pasos | Resultado esperado | Resultado | Evidencia / bug |
|---|---|---|---|---|---|
| C1 | CP-RF3-01 | Cartera → Presupuestos → Agregar → Comida `2000` mes actual | Presupuesto creado; barra de progreso correcta | **Pasa** | `hu40-evidencias/C1.png` |
| C2 | CP-RF3-02 | Monto `-500` | Se rechaza; no se guarda | **No ejecutado** en esta corrida |  |
| C3 | Duplicado | Crear otro presupuesto de Comida el mismo mes | Mensaje de duplicado; no crea | **Pasa** (la app marca la categoría "Ya tiene" y no deja elegirla) | `hu40-evidencias/C3.png` |
| C4 | CP-RF4-03 | Presupuesto Comida $1,000 y gasto de $150 | Sin aviso | **Pasa** | `hu40-evidencias/C4.png` |
| C5 | CP-RF4-01 | Llegar a $800 (80 %) con un gasto | **Aviso** de que se acerca al presupuesto | **Pasa** | `hu40-evidencias/C5.png` |
| C6 | CP-RF4-02 | Pasar de $1,000 | Aviso de presupuesto **superado**; estado "Excedido" en Cartera | **Pasa** | `hu40-evidencias/C6.png` |
| C7 | HU-35 | Cerrar el aviso y volver a abrir Cartera | El estado se mantiene y el aviso no se repite sin motivo | **Pasa** | `hu40-evidencias/C7.png` |
| C8 | Límite exacto | Gasto que deja el total en $1,000.00 | Alerta pero todavía no excedido | **Pasa** (muestra "Cerca del límite 100 %", no "Excedido") | `hu40-evidencias/C8.png` |

### Flujo D — Membresías (RF5) · HU-36

| # | Caso | Pasos | Resultado esperado | Resultado | Evidencia / bug |
|---|---|---|---|---|---|
| D1 | CP-RF5-01 | Cartera → Suscripciones → Agregar → Netflix `199`, Mensual, cobro en 10 días | Aparece con costo, frecuencia y "Cobra en 10 días" | **Bloqueado**: el selector de fecha nativo no existe en el navegador; probar en el teléfono | `hu40-evidencias/D1.png` |
| D2 | Catálogo | Agregar eligiendo un servicio del catálogo (Spotify) | Nombre y costo sugerido se llenan solos | **Pasa** | `hu40-evidencias/D2.png` |
| D3 | CP-RF5-02 | Editar el costo a `219` | Se actualiza en lista y en el total mensual | **Pasa** | `hu40-evidencias/D3.png` |
| D4 | CP-RF5-02 | Eliminar y confirmar | Desaparece y el total baja | **Pasa** | `hu40-evidencias/D4.png` |
| D5 | CP-RF5-03 | Nombre vacío | Indica que es obligatorio | **Pasa** | `hu40-evidencias/D5.png` |
| D6 | CP-RF5-04 | Costo `abc` | Se rechaza | **No ejecutado** en esta corrida |  |
| D7 | Anual | Membresía anual de `1200` | El total mensual suma `100` | **Pasa** | `hu40-evidencias/D7.png` |
| D8 | Fecha pasada | Cobro con fecha de hace 30 días | Revisar qué muestra ("Venció hace N días"). **Anotar**: el cobro recurrente no avanza al siguiente ciclo | **Pasa** con nota: "Venció hace 29 días"; no avanza al siguiente ciclo (BUG-01) | `hu40-evidencias/D8.png` |

### Flujo E — Reportes (RF6, RF8) · HU-37, HU-39

| # | Caso | Pasos | Resultado esperado | Resultado | Evidencia / bug |
|---|---|---|---|---|---|
| E1 | CP-RF6-01 | Con $500 en gastos y $300 en membresías abrir Reportes | Variable $500, Fijo $300, Total $800 | **Pasa** | `hu40-evidencias/E1.png` |
| E2 | CP-RF8-01 | Gastos Comida 600, Transporte 300, Ocio 100 | Dona con 60 % / 30 % / 10 % y leyenda con montos | **Pasa** | `hu40-evidencias/E2.png` |
| E3 | CP-RF6-02 / RF8-02 | **Usuario nuevo** abre Reportes | $0 en los tres totales y mensaje de "sin datos"; sin errores | Parcial: con usuario nuevo Reportes muestra $0.00 (F4) | `hu40-evidencias/F4.png` |
| E4 | Cambio de mes | Flechas del selector de mes | Datos del mes elegido; la flecha derecha se deshabilita en el mes actual | **Pasa** (mes anterior en ceros; flecha derecha atenuada) | `hu40-evidencias/E4.png` |
| E5 | HU-39 | Inicio vs. Reportes del mismo mes | Mismos totales en ambas pantallas | **Pasa** | `hu40-evidencias/E5.png` |
| E6 | Consistencia | Crear, editar y borrar un gasto y volver a Reportes | Se refleja sin cerrar la app | **No ejecutado** en esta corrida |  |

## 4. Casos especiales

| # | Caso | Pasos | Resultado esperado | Resultado | Evidencia / bug |
|---|---|---|---|---|---|
| F1 | Sin conexión | Modo avión; abrir cada pantalla e intentar guardar un gasto | Mensaje de falta de conexión claro; sin cierre ni pantalla en blanco; no se pierde lo capturado | **Pasa** | `hu40-evidencias/F1.png` |
| F2 | Reconexión | Quitar modo avión y reintentar | Funciona sin reiniciar | **Pasa** | `hu40-evidencias/F2.png` |
| F3 | Sesión vencida | Con `JWT_EXPIRES_IN=1m` en el backend, esperar 2 min y abrir una pantalla | Cierra sesión y manda al login con aviso; no queda en bucle | **Pasa** | `hu40-evidencias/F3.png` |
| F4 | Usuario nuevo | Cuenta recién creada recorre todas las pantallas | Estados vacíos correctos en todas; sin errores | **Pasa** | `hu40-evidencias/F4.png` |
| F5 | Aislamiento | Cuenta B no ve gastos, presupuestos ni membresías de la cuenta A | Solo ve sus datos | **Pasa** | `hu40-evidencias/F5.png` |
| F6 | Modo claro / oscuro | Cambiar el tema del sistema | Todas las pantallas legibles; sin textos invisibles | **Pasa** (claro legible en Inicio, Movimientos, Reportes y Cartera) | `hu40-evidencias/F6-claro-montaje.png` |
| F7 | Servidor caído | Detener la API con la app abierta | Mensaje de error; la app no se cierra | **No ejecutado** en esta corrida |  |
| F8 | Teclado | Capturar un gasto con el teclado abierto en pantalla pequeña | El botón Guardar sigue accesible | **No ejecutado** en esta corrida |  |

## 5. Resultado por pantalla

| Pantalla (historia) | Aprobada / No aprobada | Bugs |
|---|---|---|
| Registro e inicio de sesión (HU-21) | Aprobada (A1–A5, F3) | — |
| Inicio (HU-39) | Aprobada (E5, F4) | — |
| Movimientos (HU-27) | Aprobada (B4) | — |
| Nuevo gasto / editar / eliminar (HU-30) | Aprobada (B1–B3, B5, B6) | — |
| Cartera · Presupuestos (HU-33) | Aprobada (C1, C3; C2 sin ejecutar) | — |
| Aviso de presupuesto (HU-35) | Aprobada (C4–C8) | — |
| Cartera · Suscripciones / membresías (HU-36) | Aprobada con bug BUG-01; selector de fecha sin probar (D1) | BUG-01 |
| Reportes (HU-37) | Aprobada (E1, E2, E4, E5) | — |

## 6. Bugs encontrados

| ID | Pantalla | Severidad | Resumen | Enlace |
|---|---|---|---|---|
| BUG-01 | Cartera · Suscripciones | Media | Una suscripción con fecha de cobro pasada se queda en "Venció hace N días" y el encabezado muestra "Próximo cobro el 7 oct" (fecha pasada); el cobro recurrente no avanza al siguiente ciclo. Evidencia `hu40-evidencias/D3.png` | Por crear en ClickUp |

## 7. Revisión de Joshua (criterio de QA de HU-40)

Joshua repite el flujo completo en su teléfono: registro → crear gasto → ver que baja el presupuesto → recibir el aviso → agregar membresía → ver el reporte.

| Paso | Resultado | Notas |
|---|---|---|
| Registro | | |
| Crear gasto | | |
| Baja el presupuesto | | |
| Aviso | | |
| Agregar membresía | | |
| Reporte | | |

## 8. Conclusión

- Casos ejecutados: 36 de 42 · Pasan: 35 (D8 con nota) · Fallan: 0 · Bloqueados: 1 (D1, selector de fecha) · Sin ejecutar: C2, D6, E3 (parcial), E6, F7, F8
- Pantallas aprobadas: 8 de 8 en navegador (una con bug de severidad media)
- Decisión: ☐ HU-40 aprobada ☒ **Pendiente**: la corrida en navegador no cumple RNF1 ni la revisión de Joshua. Falta repetir A–F en un Android real y registrar BUG-01.

## 9. Casos que quedan fuera de este reporte

RF7 (avisos de cobro), RF9 (catálogo de administrador) y RF10 (modo visitante) pertenecen al Sprint 3. CP-RNF2 (tiempo menor a 2 s) y CP-RNF4 (disponibilidad) se evalúan con la API desplegada.
