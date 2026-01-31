const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateTestUser() {
  try {
    const password = 'Test@123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log(`Generated bcrypt hash for password "${password}":`);
    console.log(hashedPassword);
    
    // Update the database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    await connection.execute(
      'UPDATE users SET password_hash = ? WHERE email = ?',
      [hashedPassword, 'testuser@example.com']
    );
    
    console.log('\n✅ Test user password updated successfully!');
    console.log(`Email: testuser@example.com`);
    console.log(`Password: ${password}`);
    
    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

updateTestUser();
