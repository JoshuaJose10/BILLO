const express = require('express');
const authRoutes = require('./routes/auth.routes');
const categoriasRoutes = require('./routes/categorias.routes');
const gastosRoutes = require('./routes/gastos.routes');
const tipoCambioRoutes = require('./routes/tipoCambio.routes');

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/categorias', categoriasRoutes);
app.use('/gastos', gastosRoutes);
// EXPERIMENTAL (HU-23, spike RF11): ver docs/spike-rf11-rf13.md
app.use('/tipo-cambio', tipoCambioRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

module.exports = app;

