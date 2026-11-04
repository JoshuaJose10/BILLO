# Review QA — Reporte Resumen Mensual (RF6)

Fecha: 2026-11-03. Rama revisada: `feature/reporte-resumen`.

**Resultado: Aceptado (Pasa).**

Se ejecutaron 13 verificaciones contra la API Express y PostgreSQL temporales y aisladas: 13 correctas y 0 fallidas. La base de datos temporal fue destruida al finalizar la ejecución.

| Criterio | Resultado |
| --- | --- |
| CP-RF6-01: gastos por 500 y membresías por 300 al mes | Cumple en API; devuelve 500, 300 y 800 |
| CP-RF6-02: usuario nuevo sin gastos ni membresías | Cumple en API; devuelve ceros (0, 0, 0) sin errores |
| Aporte anual: membresía anual de 1,200 | Cumple en API; aporta 100 (1,200 ÷ 12) al gasto fijo mensual |
| Cálculo y redondeo: totales coinciden con suma manual | Cumple en API; suma exacta redondeada a 2 decimales |
| Aislamiento: usuario A no suma datos de usuario B | Cumple en API; aislamiento estricto por `usuario_id` |
| Validación `mes`: obligatorio y formato YYYY-MM | Cumple en API; 400 `MES_INVALIDO` si se omite o está mal formado |
| Seguridad: autenticación con JWT | Cumple en API; 401 `NO_AUTORIZADO` sin token o con token inválido |

## Detalle de Casos de Prueba (Luis Dorian)

1. **CP-RF6-01**: Con gastos registrados por $500 (despensa $300 + gasolina $200) y membresía mensual de $300 (Gimnasio), la consulta `GET /reportes/resumen?mes=2026-10` devuelve `gasto_variable: 500`, `gasto_fijo: 300` y `total: 800`.
2. **CP-RF6-02**: Para un usuario recién registrado sin gastos ni membresías, la consulta responde status 200 con `gasto_variable: 0`, `gasto_fijo: 0` y `total: 0`.
3. **Membresías anuales**: Una membresía de $1,200 anual aporta exactamente $100 al gasto fijo mensual. Membresías con costos no múltiplos de 12 se redondean correctamente a 2 decimales.
4. **Filtro temporal**: Gastos de meses anteriores o posteriores no alteran el gasto variable del mes consultado.
5. **Aislamiento multiusuario**: Los gastos y membresías de un usuario B no alteran en lo absoluto los totales de un usuario A.

## Ejecución

Reproducir desde la carpeta `backend` con:
```bash
npm run qa:reportes
```
O correr la suite de pruebas de integración completa con:
```bash
npm test
```

Archivo de evidencia generado: [reporte-resumen-resultados.json](reporte-resumen-resultados.json).

