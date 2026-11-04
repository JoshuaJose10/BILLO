const express = require('express');
const authRoutes = require('./routes/auth.routes');
const categoriasRoutes = require('./routes/categorias.routes');
const gastosRoutes = require('./routes/gastos.routes');
const presupuestosRoutes = require('./routes/presupuestos.routes');
const catalogoRoutes = require('./routes/catalogo.routes');
const membresiasRoutes = require('./routes/membresias.routes');
const reportesRoutes = require('./routes/reportes.routes');
const tipoCambioRoutes = require('./routes/tipoCambio.routes');

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/categorias', categoriasRoutes);
app.use('/gastos', gastosRoutes);
app.use('/presupuestos', presupuestosRoutes);
app.use('/catalogo', catalogoRoutes);
app.use('/membresias', membresiasRoutes);
app.use('/reportes', reportesRoutes);
// EXPERIMENTAL (HU-23, spike RF11): ver docs/spike-rf11-rf13.md
app.use('/tipo-cambio', tipoCambioRoutes);

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
