const mysql = require('mysql2/promise');

async function testPassSchema() {
  try {
    console.log('🧪 Testing Pass Schema and Sample Data...\n');

    const pool = await mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'ksrtc'
    });

    // 1. Check passes table structure
    console.log('1️⃣  Checking passes table structure...');
    const [columns] = await pool.query(
      'SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = "passes" AND TABLE_SCHEMA = "ksrtc" ORDER BY ORDINAL_POSITION'
    );
    
    const requiredCols = {
      'payment_status': 'required',
      'amount': 'required',
      'start_date': 'required',
      'end_date': 'required',
      'document_type': 'optional',
      'is_approved': 'required'
    };

    const foundCols = {};
    columns.forEach(col => {
      foundCols[col.COLUMN_NAME] = true;
    });

    let allOk = true;
    for (const [col, type] of Object.entries(requiredCols)) {
      if (foundCols[col]) {
        console.log(`   ✅ ${col}`);
      } else {
        console.log(`   ❌ ${col} (${type})`);
        allOk = false;
      }
    }

    if (!allOk) {
      console.log('\n❌ Some required columns are missing! Full columns:');
      columns.forEach(col => {
        console.log(`   - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE}`);
      });
      await pool.end();
      return;
    }

    console.log(`\n✅ All ${columns.length} columns present in passes table\n`);

    // 2. Test INSERT query (dry run, just validate syntax)
    console.log('2️⃣  Testing INSERT statement...');
    const testInsert = `
      INSERT INTO passes (
        user_id, pass_type, origin, destination, fare, amount,
        start_date, end_date, valid_from, valid_until,
        payment_method, transaction_id, payment_status, is_approved
      ) VALUES (
        1, 'DAILY', 'Bangalore', 'Mysore', 250, 250,
        '2026-01-27', '2026-01-28', '2026-01-27', '2026-01-28',
        'UPI', 'TEST-123', 'completed', 1
      )
    `;

    try {
      await pool.query(testInsert);
      const [result] = await pool.query('SELECT COUNT(*) as count FROM passes WHERE transaction_id = "TEST-123"');
      if (result[0].count > 0) {
        console.log('✅ INSERT statement successful');
        // Cleanup
        await pool.query('DELETE FROM passes WHERE transaction_id = "TEST-123"');
      } else {
        console.log('❌ INSERT returned no rows affected');
      }
    } catch (err) {
      console.log('❌ INSERT error:', err.message);
      await pool.end();
      return;
    }

    // 3. Test SELECT query
    console.log('\n3️⃣  Testing SELECT statement...');
    const testSelect = `
      SELECT id, pass_type, origin, destination, fare as amount,
             start_date, end_date, payment_status, is_approved
      FROM passes WHERE user_id = 1 LIMIT 5
    `;

    try {
      const [rows] = await pool.query(testSelect);
      console.log(`✅ SELECT statement successful (${rows.length} rows found)`);
      if (rows.length > 0) {
        console.log('   Sample row:');
        const row = rows[0];
        console.log(`   - Pass: ${row.pass_type} (${row.origin} → ${row.destination})`);
        console.log(`   - Amount: ${row.amount}`);
        console.log(`   - Dates: ${row.start_date} to ${row.end_date}`);
        console.log(`   - Status: ${row.payment_status}, Approved: ${row.is_approved}`);
      }
    } catch (err) {
      console.log('❌ SELECT error:', err.message);
    }

    // 4. Check users table (required for FK)
    console.log('\n4️⃣  Checking dependent tables...');
    const [usersTable] = await pool.query('SHOW TABLES LIKE "users"');
    if (usersTable.length > 0) {
      const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
      console.log(`✅ Users table exists (${users[0].count} users)`);
    } else {
      console.log('❌ Users table not found');
    }

    await pool.end();
    console.log('\n✅ Schema validation complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testPassSchema();
