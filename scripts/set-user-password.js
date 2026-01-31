// Usage: node scripts/set-user-password.js <username> <password>
const bcrypt = require('bcryptjs');
const db = require('../config/database');

async function run() {
  try {
    const [,, username, password] = process.argv;
    if (!username || !password) {
      console.error('Usage: node scripts/set-user-password.js <username> <password>');
      process.exit(1);
    }
    const hash = await bcrypt.hash(password, 10);
    const [res] = await db.query('UPDATE users SET password_hash = ? WHERE username = ?', [hash, username]);
    if (res.affectedRows === 0) {
      console.log('No user updated. Did you create the user first? username =', username);
    } else {
      console.log(`✅ Password updated for ${username}`);
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

run();
