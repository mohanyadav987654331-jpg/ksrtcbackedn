const bcrypt = require('bcryptjs');
const db = require('./config/database');

async function resetPassword() {
  const password = 'admin123';
  const username = 'admin_bangalore';
  
  try {
    const hash = await bcrypt.hash(password, 10);
    console.log(`Generated hash for "${password}": ${hash}`);
    
    const [result] = await db.query(
      'UPDATE users SET password_hash = ? WHERE username = ?',
      [hash, username]
    );
    
    console.log(`✅ Password updated for user "${username}"`);
    console.log(`Hash: ${hash}`);
    
    // Verify the update
    const [users] = await db.query('SELECT id, username, password_hash FROM users WHERE username = ?', [username]);
    if (users.length > 0) {
      console.log(`✅ Verified: User hash is now: ${users[0].password_hash}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

resetPassword();
