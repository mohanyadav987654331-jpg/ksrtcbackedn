const db = require('./config/database');
async function checkUsers() {
  const [users] = await db.query("SELECT username, role, depot_id FROM users WHERE role = ''depot_admin''");
  console.table(users);
  process.exit(0);
}
checkUsers();
