const bcrypt = require('bcryptjs');
const db = require('./config/database');

async function updateTestUser() {
  try {
    const password = 'Test@123';
    const hash = await bcrypt.hash(password, 10);
    
    console.log('Generated bcrypt hash:', hash);
    
    const [result] = await db.query(
      'UPDATE users SET password_hash = ? WHERE username = ?',
      [hash, 'testuser']
    );
    
    console.log('✅ Test user password updated successfully!');
    console.log('Updated rows:', result.affectedRows);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateTestUser();
