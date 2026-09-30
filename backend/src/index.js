const express = require('express');
const config = require('./config/env');
const { testConnection } = require('./db');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

app.listen(config.port, async () => {
  console.log(`Servidor corriendo en puerto ${config.port}`);
  await testConnection();
});