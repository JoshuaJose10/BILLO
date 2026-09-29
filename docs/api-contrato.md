# Contrato de API — Billo (preliminar)

## Formato estándar de errores
Todas las respuestas de error usan:
{ "error": { "codigo": "CODIGO_ERROR", "mensaje": "Descripción legible" } }

## Autenticación

### POST /auth/register  (público)
Body: { "nombre": "Ana", "email": "ana@correo.com", "password": "Segura123" }
- 201 → { "usuario": { "id": 7, "nombre": "Ana", "email": "ana@correo.com" } }
- 400 → EMAIL_INVALIDO, PASSWORD_MUY_CORTA (mínimo 8 caracteres)
- 409 → EMAIL_DUPLICADO

### POST /auth/login  (público)
Body: { "email": "ana@correo.com", "password": "Segura123" }
- 200 → { "token": "...", "usuario": { "id": 7, "nombre": "Ana" } }
- 401 → CREDENCIALES_INVALIDAS (mismo mensaje si el correo no existe o la contraseña es incorrecta)

### GET /auth/perfil  (requiere token)
- 200 → { "id": 7, "nombre": "Ana", "email": "ana@correo.com" }
- 401 → NO_AUTORIZADO (falta token, token inválido o vencido)

## Gastos (todas requieren token)

### POST /gastos
Body: { "monto": 85.50, "categoria_id": 3, "fecha": "2026-10-05", "metodo_pago": "efectivo" }
- 201 → { "gasto": { "id": 41, "monto": 85.50, "categoria_id": 3, "fecha": "2026-10-05" } }
- 400 → MONTO_INVALIDO, CATEGORIA_INEXISTENTE, FECHA_INVALIDA

### GET /gastos?mes=2026-10&categoria_id=3
- 200 → [ { "id": 41, "monto": 85.50, ... }, ... ]

### PUT /gastos/:id
Body: igual que POST
- 200 → gasto actualizado
- 404 → GASTO_NO_ENCONTRADO (no existe o no pertenece al usuario)

### DELETE /gastos/:id
- 200 → { "eliminado": true }
- 404 → GASTO_NO_ENCONTRADO

## Registro de cambios
- 2026-09-30 — v0.1 — Primera versión (auth + gastos). Autor: Joshua.
