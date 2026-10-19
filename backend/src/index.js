const express = require('express');
const config = require('./config/env');
const authRoutes = require('./routes/auth.routes');
const categoriasRoutes = require('./routes/categorias.routes');
const gastosRoutes = require('./routes/gastos.routes');
const { testConnection } = require('./db');

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/categorias', categoriasRoutes);
app.use('/gastos', gastosRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

app.listen(config.port, async () => {
  console.log(`Servidor corriendo en puerto ${config.port}`);
  await testConnection();
});