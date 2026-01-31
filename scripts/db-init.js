const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'ksrtc_smart_transport';

  console.log('Initializing database...', { host, port, user, dbName });

  // Connect without database first
  const conn = await mysql.createConnection({ host, port, user, password, multipleStatements: true });

  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`Ensured database exists: ${dbName}`);

    await conn.changeUser({ database: dbName });

    const schemaPath = path.resolve(__dirname, '..', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Applying schema.sql...');
    await conn.query(schemaSql);
    console.log('Schema applied successfully.');

    // Skip external sample_data.sql—backend schema already includes sample data
    console.log('Backend schema includes sample data; skipping external sample_data.sql.');

    console.log('Database initialization complete.');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});
