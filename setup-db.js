const mysql = require('mysql2/promise');
const fs = require('fs');

async function setupDatabase() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root'
  });

  try {
    // Create database
    await conn.query('CREATE DATABASE IF NOT EXISTS ksrtc');
    console.log('✅ Database ksrtc created/exists');

    // Switch to database
    await conn.query('USE ksrtc');

    // Read and execute schema
    const schema = fs.readFileSync('./schema.sql', 'utf8');
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        await conn.query(statement);
      } catch (err) {
        // Ignore DROP TABLE IF EXISTS errors
        if (!err.message.includes('DROP') && !err.message.includes('already exists')) {
          console.error('Statement error:', statement.substring(0, 50), err.message);
        }
      }
    }

    console.log('✅ Schema executed successfully');

    // Verify passes table
    const [tables] = await conn.query('SHOW TABLES LIKE "passes"');
    if (tables.length > 0) {
      console.log('✅ Passes table exists');
      const [columns] = await conn.query('SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = "passes" AND TABLE_SCHEMA = "ksrtc"');
      const columnNames = columns.map(c => c.COLUMN_NAME).join(', ');
      console.log('✅ Columns:', columnNames);
    } else {
      console.log('❌ Passes table not found');
    }

  } catch (error) {
    console.error('Setup error:', error.message);
  } finally {
    await conn.end();
  }
}

setupDatabase();
