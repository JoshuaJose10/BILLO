const express = require('express');
const authRoutes = require('./routes/auth.routes');
const categoriasRoutes = require('./routes/categorias.routes');
const gastosRoutes = require('./routes/gastos.routes');
const presupuestosRoutes = require('./routes/presupuestos.routes');
const catalogoRoutes = require('./routes/catalogo.routes');
const membresiasRoutes = require('./routes/membresias.routes');
const reportesRoutes = require('./routes/reportes.routes');
const notificacionesRoutes = require('./routes/notificaciones.routes');
const tipoCambioRoutes = require('./routes/tipoCambio.routes');
const ingresosRoutes = require('./routes/ingresos.routes');

const app = express();

// Soporte CORS para clientes web (Expo Web / navegadores)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  );
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.use('/auth', authRoutes);
app.use('/categorias', categoriasRoutes);
app.use('/gastos', gastosRoutes);
app.use('/presupuestos', presupuestosRoutes);
app.use('/catalogo', catalogoRoutes);
app.use('/membresias', membresiasRoutes);
app.use('/reportes', reportesRoutes);
app.use('/notificaciones', notificacionesRoutes);
app.use('/divisas', tipoCambioRoutes);
app.use('/ingresos', ingresosRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'RUTA_NO_ENCONTRADA',
      message: 'La ruta solicitada no existe',
    },
  });
});

app.use((err, req, res, next) => {
  void next;
  if (
    err instanceof SyntaxError &&
    (err.status === 400 || err.statusCode === 400) &&
    'body' in err
  ) {
    return res.status(400).json({
      error: {
        code: 'JSON_INVALIDO',
        message: 'El cuerpo de la petición no es un JSON válido',
      },
    });
  }

  console.error('Error no controlado:', err.message);
  return res.status(500).json({
    error: {
      code: 'ERROR_SERVIDOR',
      message: 'Ocurrió un error inesperado en el servidor',
    },
  });
});

module.exports = app;
