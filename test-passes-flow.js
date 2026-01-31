const mysql = require('mysql2/promise');
const http = require('http');

async function testPassFlow() {
  // Test data
  const testUserId = 1;  // testuser
  const passData = {
    passType: 'DAILY',
    origin: 'Bangalore',
    destination: 'Mysore',
    amount: 250,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paymentMethod: 'UPI',
    transactionId: `TEST-${Date.now()}`,
    govtIdType: 'AADHAR',
    govtIdLast4: '1234'
  };

  try {
    console.log('🧪 Testing Pass Purchase Flow...\n');

    // 1. Check if passes table exists and has data before purchase
    console.log('1️⃣  Checking database schema...');
    const pool = await mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'ksrtc'
    });

    const [tables] = await pool.query("SHOW TABLES LIKE 'passes'");
    if (tables.length === 0) {
      console.log('❌ Passes table does not exist!');
      await pool.end();
      return;
    }
    console.log('✅ Passes table exists');

    // 2. Check passes before
    const [passesBefore] = await pool.query(
      'SELECT COUNT(*) as count FROM passes WHERE user_id = ?',
      [testUserId]
    );
    console.log(`✅ User has ${passesBefore[0].count} passes before test\n`);

    // 3. Simulate API call to purchase pass (POST request)
    console.log('2️⃣  Simulating pass purchase via API...');
    const postData = JSON.stringify(passData);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/passes',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
        'Authorization': 'Bearer dummy-token'  // Will be handled by auth middleware
      }
    };

    const response = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            data: data ? JSON.parse(data) : null
          });
        });
      });
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    console.log(`API Response: ${response.statusCode}`);
    if (response.data?.success) {
      console.log('✅ Pass purchase request successful');
      console.log(`   Pass ID: ${response.data.data?.id}`);
      console.log(`   Status: ${response.data.data?.payment_status}`);
    } else {
      console.log('❌ Pass purchase failed:', response.data?.error);
    }

    // 4. Check passes after in database
    await new Promise(r => setTimeout(r, 1000));  // Wait a bit for DB to commit
    const [passesAfter] = await pool.query(
      'SELECT id, pass_type, origin, destination, payment_status, valid_from, valid_until FROM passes WHERE user_id = ? ORDER BY id DESC LIMIT 1',
      [testUserId]
    );

    if (passesAfter.length > 0) {
      console.log(`\n3️⃣  Checking database after purchase...`);
      console.log('✅ Pass found in database:');
      console.log(`   ID: ${passesAfter[0].id}`);
      console.log(`   Type: ${passesAfter[0].pass_type}`);
      console.log(`   Route: ${passesAfter[0].origin} → ${passesAfter[0].destination}`);
      console.log(`   Status: ${passesAfter[0].payment_status}`);
      console.log(`   Valid: ${passesAfter[0].valid_from} to ${passesAfter[0].valid_until}`);
    } else {
      console.log('❌ No passes found for user after purchase!');
    }

    // 5. Test /passes/my endpoint
    console.log(`\n4️⃣  Testing GET /passes/my endpoint...`);
    const getOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/passes/my',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer dummy-token'
      }
    };

    const getResponse = await new Promise((resolve, reject) => {
      const req = http.request(getOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            data: data ? JSON.parse(data) : null
          });
        });
      });
      req.on('error', reject);
      req.end();
    });

    if (getResponse.data?.success && getResponse.data?.data?.length > 0) {
      console.log(`✅ /passes/my endpoint returned ${getResponse.data.data.length} passes`);
      const lastPass = getResponse.data.data[0];
      console.log(`   Last pass: ${lastPass.pass_type} - ${lastPass.origin} → ${lastPass.destination}`);
    } else {
      console.log(`⚠️  /passes/my endpoint returned no passes or error:`, getResponse.data?.error);
    }

    await pool.end();
    console.log('\n✅ All tests complete!');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testPassFlow();
