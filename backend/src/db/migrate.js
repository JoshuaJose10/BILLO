const fs = require('fs');
const path = require('path');
const { pool } = require('./index');

async function migrate({ closePool = true } = {}) {
  const client = await pool.connect();
  try {
    // 1. Crear tabla schema_migrations si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 2. Si la tabla schema_migrations está vacía pero ya existen tablas previas (ej. usuarios),
    // registrar 001 a 007 como aplicadas para bases de datos existentes.
    const countRes = await client.query('SELECT COUNT(*) FROM schema_migrations');
    const migrationsCount = parseInt(countRes.rows[0].count, 10);

    if (migrationsCount === 0) {
      const dbCheck = await client.query(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'usuarios'"
      );
      if (dbCheck.rows.length > 0) {
        const legacyMigrations = [
          '001_usuarios.sql',
          '002_categorias.sql',
          '003_gastos.sql',
          '004_presupuestos.sql',
          '005_catalogo_servicios.sql',
          '006_membresias.sql',
          '007_seed_categorias.sql',
        ];
        for (const legacy of legacyMigrations) {
          await client.query(
            'INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
            [legacy]
          );
        }
        console.log(
          'Base de datos existente detectada: migraciones 001 a 007 registradas como aplicadas.'
        );
      }
    }

    // 3. Consultar migraciones ya aplicadas
    const appliedRes = await client.query('SELECT name FROM schema_migrations');
    const applied = new Set(appliedRes.rows.map((r) => r.name));

    // 4. Leer archivos de migración y ejecutar solo los no aplicados en orden
    const dir = path.join(__dirname, '../../migrations');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

    let executedCount = 0;
    for (const file of files) {
      if (applied.has(file)) {
        continue;
      }

      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        executedCount++;
        console.log(`OK ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Error en ${file}: ${err.message}`, { cause: err });
      }
    }

    if (executedCount === 0) {
      console.log('No hay migraciones pendientes.');
    } else {
      console.log(`Migraciones completadas: ${executedCount} archivo(s) aplicado(s).`);
    }
  } finally {
    client.release();
    if (closePool) {
      await pool.end();
    }
  }
}

if (require.main === module) {
  migrate().catch(async (err) => {
    console.error('Error en migración:', err.message);
    await pool.end();
    process.exit(1);
  });
}

module.exports = { migrate };
