const { describe, before, after } = require('node:test');
const { createDatabase } = require('./helpers/database.cjs');
const { createFixtures } = require('./helpers/fixtures.cjs');

describe('QA presupuestos: API real + PostgreSQL temporal', { timeout: 55000 }, () => {
  let database;
  let context;
  before(async () => {
    database = await createDatabase();
    context = await createFixtures(database);
  });
  after(async () => { if (database) await database.close(); });
  require('./suites/presupuestos.cjs')(() => context);
});
