const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function testLogin() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'ksrtc_smart_transport'
    });

    console.log('\n🔐 Testing Login Credentials\n');

    // Test cases
    const testCases = [
      { username: 'superadmin', password: 'admin123', role: 'super_admin' },
      { username: 'driver1', password: 'driver123', role: 'driver' },
      { username: 'admin_bangalore', password: 'depot123', role: 'depot_admin' },
      { username: 'testuser', password: 'user123', role: 'user' },
    ];

    for (const test of testCases) {
      console.log(`Testing: ${test.username} (${test.role})`);
      
      // Query user
      const [users] = await connection.execute(
        'SELECT username, role, password_hash FROM users WHERE username = ? AND role = ?',
        [test.username, test.role]
      );

      if (users.length === 0) {
        console.log(`  ❌ User not found in database`);
      } else {
        const user = users[0];
        const passwordMatch = await bcrypt.compare(test.password, user.password_hash);
        
        if (passwordMatch) {
          console.log(`  ✅ Password correct`);
        } else {
          console.log(`  ❌ Password incorrect`);
          console.log(`     Expected: ${test.password}`);
          console.log(`     Hash in DB: ${user.password_hash.substring(0, 20)}...`);
        }
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

testLogin();
