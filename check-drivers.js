const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'ksrtc_smart_transport'
};

async function checkDrivers() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    // Get first 5 drivers
    const [drivers] = await connection.query(
      'SELECT id, username, full_name, role FROM users WHERE role = ? LIMIT 5',
      ['driver']
    );
    
    console.log('Drivers in database:');
    drivers.forEach(d => {
      console.log(`  - ${d.username} (${d.full_name})`);
    });
    
    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkDrivers();
