const bcrypt = require('bcryptjs');
const db = require('./config/database');

async function test() {
  try {
    const [rows] = await db.query('SELECT password_hash FROM users WHERE username = ?', ['depotadmin']);
    const storedHash = rows[0].password_hash;
    const passwordToTest = 'Depot@123';
    
    console.log('Testing bcrypt.compare...');
    console.log('Stored hash:', storedHash.substring(0, 30) + '...');
    console.log('Password:', passwordToTest);
    
    const result = await bcrypt.compare(passwordToTest, storedHash);
    console.log('✅ bcrypt.compare result:', result);
    
    if (result) {
      console.log('✅ Password matches! Login should work.');
    } else {
      console.log('❌ Password does not match.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

test();
