const app = require('./app');
const config = require('./config/env');
const { testConnection } = require('./db');
const { iniciarCronAvisoCobros } = require('./jobs/avisoCobros');

app.listen(config.port, async () => {
  console.log(`Servidor corriendo en puerto ${config.port}`);
  await testConnection();
  iniciarCronAvisoCobros();
});
