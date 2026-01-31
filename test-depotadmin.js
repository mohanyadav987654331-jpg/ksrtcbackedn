const db = require('./config/database');

async function test() {
  try {
    const [rows] = await db.query('SELECT id, username, role, password_hash FROM users WHERE username = ?', ['depotadmin']);
    console.log('✅ Depotadmin user found:');
    console.log('  ID:', rows[0].id);
    console.log('  Username:', rows[0].username);
    console.log('  Role:', rows[0].role);
    console.log('  Password hash exists:', !!rows[0].password_hash);
    console.log('  Hash starts with:', rows[0].password_hash.substring(0, 20));
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

test();
