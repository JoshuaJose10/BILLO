# Backend de Billo

API REST de Billo (Node.js, Express y PostgreSQL).

## Requisitos

- Node.js (versión LTS)
- PostgreSQL con una base de datos creada (por ejemplo `billo_dev`)

## Configuración

1. Copia `.env.example` a `.env` y llena tus datos de conexión.
2. Instala las dependencias:

```bash
cd backend
npm install
```

## Crear las tablas

Con PostgreSQL corriendo y el archivo `.env` configurado:

```bash
cd backend
npm install
npm run migrate
```

Esto crea las seis tablas (`usuarios`, `categorias`, `gastos`,
`presupuestos`, `catalogo_servicios`, `membresias`) en la base de datos
indicada en `.env`. Se puede ejecutar varias veces sin errores.