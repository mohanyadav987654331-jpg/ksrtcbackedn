const mysql = require('mysql2/promise');

async function checkPasses() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'ksrtc_smart_transport'
    });

    console.log('✅ Connected to database');

    // Count total passes
    const [countResult] = await conn.query('SELECT COUNT(*) as total FROM passes');
    console.log(`\n📊 Total passes in database: ${countResult[0].total}`);

    // Get recent passes
    const [passes] = await conn.query(`
      SELECT p.id, p.user_id, p.pass_type, p.origin, p.destination, 
             p.start_date, p.end_date, p.payment_status, p.is_approved,
             u.full_name
      FROM passes p
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.id DESC 
      LIMIT 3
    `);

    console.log('\n📋 Recent passes:');
    passes.forEach((pass, index) => {
      console.log(`\n${index + 1}. Pass ID: ${pass.id}`);
      console.log(`   User: ${pass.full_name} (ID: ${pass.user_id})`);
      console.log(`   Type: ${pass.pass_type}`);
      console.log(`   Route: ${pass.origin} → ${pass.destination}`);
      console.log(`   Start: ${pass.start_date}`);
      console.log(`   End: ${pass.end_date}`);
      console.log(`   Payment: ${pass.payment_status}`);
      console.log(`   Approved: ${pass.is_approved ? 'Yes' : 'No'}`);
    });

    await conn.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (conn) await conn.end();
    process.exit(1);
  }
}

checkPasses();
