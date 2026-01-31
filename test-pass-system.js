const mysql = require('mysql2/promise');

async function testPassSystem() {
  const pool = await mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'ksrtc'
  });

  try {
    console.log('🧪 Testing Pass System\n');

    // 1. Check passes table exists
    console.log('1️⃣  Checking passes table...');
    const [tables] = await pool.query("SHOW TABLES LIKE 'passes'");
    if (tables.length === 0) {
      console.log('❌ Passes table does not exist!');
      await pool.end();
      return;
    }
    console.log('✅ Passes table exists');

    // 2. Check passes table columns
    console.log('\n2️⃣  Checking passes table columns...');
    const [columns] = await pool.query(
      'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = "passes" AND TABLE_SCHEMA = "ksrtc" ORDER BY ORDINAL_POSITION'
    );
    
    const columnNames = columns.map(c => c.COLUMN_NAME);
    console.log('Columns:', columnNames.join(', '));

    const requiredCols = ['user_id', 'pass_type', 'fare', 'amount', 'start_date', 'end_date', 'payment_status', 'is_approved'];
    const missingCols = requiredCols.filter(col => !columnNames.includes(col));
    
    if (missingCols.length > 0) {
      console.log('❌ Missing columns:', missingCols.join(', '));
    } else {
      console.log('✅ All required columns present');
    }

    // 3. Test INSERT
    console.log('\n3️⃣  Testing INSERT statement...');
    const testInsert = `
      INSERT INTO passes (
        user_id, pass_type, origin, destination, fare, amount,
        start_date, end_date, valid_from, valid_until,
        payment_method, transaction_id, payment_status, is_approved
      ) VALUES (
        1, 'DAILY', 'Bangalore', 'Mysore', 250, 250,
        '2026-01-28', '2026-01-29', '2026-01-28', '2026-01-29',
        'UPI', 'TEST-${Date.now()}', 'completed', 1
      )
    `;

    const [insertResult] = await pool.query(testInsert);
    console.log(`✅ INSERT successful - ID: ${insertResult.insertId}`);

    // 4. Test SELECT with proper columns
    console.log('\n4️⃣  Testing SELECT statement...');
    const [passes] = await pool.query(`
      SELECT id, user_id, pass_type, origin, destination, fare, amount,
             start_date, end_date, payment_status, is_approved
      FROM passes WHERE user_id = 1
      ORDER BY id DESC LIMIT 1
    `);

    if (passes.length > 0) {
      const pass = passes[0];
      console.log('✅ SELECT successful:');
      console.log(`   ID: ${pass.id}`);
      console.log(`   Type: ${pass.pass_type}`);
      console.log(`   Route: ${pass.origin} → ${pass.destination}`);
      console.log(`   Amount: ${pass.amount}`);
      console.log(`   Start: ${pass.start_date}, End: ${pass.end_date}`);
      console.log(`   Status: ${pass.payment_status}`);
      console.log(`   Approved: ${pass.is_approved}`);
    }

    // 5. Test /passes/my endpoint query
    console.log('\n5️⃣  Testing /passes/my endpoint query...');
    const [myPasses] = await pool.query(`
      SELECT id, user_id, pass_type, origin, destination, fare as amount,
             purchase_date, start_date, end_date, valid_from, valid_until,
             payment_status, payment_method, transaction_id, document_type,
             document_number, is_approved FROM passes
      WHERE user_id = 1 ORDER BY purchase_date DESC
    `);

    console.log(`✅ Query returned ${myPasses.length} passes`);
    if (myPasses.length > 0) {
      const pass = myPasses[0];
      console.log('Sample pass from /passes/my:');
      console.log(`   ID: ${pass.id}`);
      console.log(`   Amount: ${pass.amount}`);
      console.log(`   Valid: ${pass.valid_from} to ${pass.valid_until}`);
    }

    // 6. Test active passes filter
    console.log('\n6️⃣  Testing active passes filter...');
    const now = new Date().toISOString().split('T')[0];
    const [activePasses] = await pool.query(`
      SELECT id, pass_type, end_date FROM passes
      WHERE user_id = 1 AND payment_status = 'completed' AND end_date >= ?
      ORDER BY id DESC
    `, [now]);

    console.log(`✅ Found ${activePasses.length} active passes for user`);
    if (activePasses.length > 0) {
      console.log('Active passes:');
      activePasses.forEach(p => {
        console.log(`   - ${p.pass_type}: expires ${p.end_date}`);
      });
    }

    // Cleanup test data
    await pool.query('DELETE FROM passes WHERE transaction_id LIKE "TEST-%"');
    console.log('\n✅ Test data cleaned up');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testPassSystem();
