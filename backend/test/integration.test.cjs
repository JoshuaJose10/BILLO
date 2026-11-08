const { describe, before, after } = require('node:test');
const { createDatabase } = require('./helpers/database.cjs');
const { createFixtures } = require('./helpers/fixtures.cjs');

describe('API real + PostgreSQL temporal', { timeout: 55000 }, () => {
  let database;
  let context;
  before(async () => {
    database = await createDatabase();
    context = await createFixtures(database);
  });
  after(async () => {
    if (database) await database.close();
  });

  // Cada módulo registra casos independientes; el beforeEach reinicia sus datos.
  require('./suites/auth.cjs')(() => context);
  require('./suites/gastos.cjs')(() => context);
  require('./suites/presupuestos.cjs')(() => context);
  require('./suites/reportes.cjs')(() => context);
  require('./suites/membresias-reportes.cjs')(() => context);
  require('./suites/notificaciones.cjs')(() => context);
  require('./suites/mobile.cjs')(() => context);
});
