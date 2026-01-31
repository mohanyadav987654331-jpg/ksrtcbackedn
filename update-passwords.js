const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function updatePasswords() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'ksrtc_smart_transport'
    });

    console.log('\n🔐 Updating passwords for test users...\n');

    // Update super admin
    const adminPassword = await bcrypt.hash('admin123', 10);
    await connection.execute(
      'UPDATE users SET password_hash = ? WHERE username = ? AND role = ?',
      [adminPassword, 'superadmin', 'super_admin']
    );
    console.log('✅ Updated superadmin password to: admin123');

    // Update all drivers
    const driverPassword = await bcrypt.hash('driver123', 10);
    const result1 = await connection.execute(
      'UPDATE users SET password_hash = ? WHERE role = ?',
      [driverPassword, 'driver']
    );
    console.log(`✅ Updated ${result1[0].affectedRows} driver passwords to: driver123`);

    // Update regular user
    const userPassword = await bcrypt.hash('user123', 10);
    await connection.execute(
      'UPDATE users SET password_hash = ? WHERE username = ? AND role = ?',
      [userPassword, 'testuser', 'user']
    );
    console.log('✅ Updated testuser password to: user123');

    // Depot admins already have correct password (depot123)
    console.log('ℹ️  Depot admin passwords already correct: depot123');

    console.log('\n✅ All passwords updated successfully!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

updatePasswords();
