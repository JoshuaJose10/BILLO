const express = require('express');
const authRoutes = require('./routes/auth.routes');
const categoriasRoutes = require('./routes/categorias.routes');
const gastosRoutes = require('./routes/gastos.routes');

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/categorias', categoriasRoutes);
app.use('/gastos', gastosRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

module.exports = app;

