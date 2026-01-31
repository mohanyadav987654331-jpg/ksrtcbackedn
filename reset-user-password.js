const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

(async () => {
  try {
    // Create password hash
    const hash = await bcrypt.hash('user123', 10);
    
    // Connect to database
    const db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'ksrtc_smart_transport'
    });

    // Reset testuser password
    await db.query(
      'UPDATE users SET password_hash = ? WHERE username = "testuser" AND role = "user"',
      [hash]
    );
    
    console.log('✅ Password reset successfully!');
    console.log('');
    console.log('=================================');
    console.log('USER LOGIN CREDENTIALS:');
    console.log('=================================');
    console.log('Username: testuser');
    console.log('Password: user123');
    console.log('Role: USER');
    console.log('=================================');
    console.log('');

    // Show available users
    const [users] = await db.query(
      'SELECT id, username, full_name, email, phone FROM users WHERE role = "user" LIMIT 10'
    );
    
    console.log('Available users in database:');
    users.forEach(user => {
      console.log(`- ${user.username} (${user.full_name || 'No name'}) - Phone: ${user.phone || 'N/A'}`);
    });

    await db.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
