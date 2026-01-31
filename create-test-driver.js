const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'ksrtc_smart_transport'
};

async function createTestDriver() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    const testUsername = 'testdriver';
    const testPassword = 'Test@123';
    const testEmail = `${testUsername}@test.com`;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    
    // Delete if exists
    await connection.query('DELETE FROM users WHERE username = ?', [testUsername]);
    
    // Insert test driver
    const [result] = await connection.query(
      `INSERT INTO users (username, email, password_hash, full_name, phone, role) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [testUsername, testEmail, hashedPassword, 'Test Driver', '9876543210', 'driver']
    );
    
    console.log(`✅ Created test driver:`);
    console.log(`   Username: ${testUsername}`);
    console.log(`   Password: ${testPassword}`);
    console.log(`   ID: ${result.insertId}`);
    
    // Check if driver has assignments
    const [assignments] = await connection.query(
      `SELECT COUNT(*) as count FROM driver_assignments 
       WHERE driver_id = ? AND assigned_date = ?`,
      [result.insertId, new Date().toISOString().slice(0, 10)]
    );
    
    console.log(`\n📋 Today's trips: ${assignments[0].count}`);
    
    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createTestDriver();
