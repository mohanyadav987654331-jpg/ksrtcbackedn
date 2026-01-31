const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'ksrtc_smart_transport'
};

async function fixSchema() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');

    await connection.query('ALTER TABLE driver_assignments MODIFY depot_id INT NULL');
    console.log('✅ Made depot_id nullable');

    console.log('Done!');

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixSchema().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
