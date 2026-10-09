const fs = require('fs');
const path = require('path');
const { pool } = require('./index');

async function migrate() {
  const dir = path.join(__dirname, '../../migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    await pool.query(sql);
    console.log(`OK ${file}`);
  }

  await pool.end();
}

migrate().catch(async (err) => {
  console.error('Error en migración:', err.message);
  await pool.end();
  process.exit(1);
});