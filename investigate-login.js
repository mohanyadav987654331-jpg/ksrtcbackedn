#!/usr/bin/env node

const axios = require('axios');
const db = require('./config/database');

async function investigateLoginIssue() {
  console.log('='.repeat(80));
  console.log('🔍 COMPREHENSIVE LOGIN DEBUGGING');
  console.log('='.repeat(80));

  try {
    // First, let's check what users exist in the database
    console.log('\n📊 DATABASE CHECK: Checking all depot admin users');
    console.log('-'.repeat(80));

    const [users] = await db.query(
      'SELECT id, username, email, role, depot_id FROM users WHERE role = ?',
      ['depot_admin']
    );

    console.log(`Found ${users.length} depot admin users:`);
    users.forEach((user, idx) => {
      console.log(`  ${idx + 1}. ${user.username} (ID: ${user.id}, Depot: ${user.depot_id})`);
    });


    // Hardcode test users instead
    const testUsers = [
      { username: 'admin_bangalore', password: 'admin123', depot_id: 30 },
      { username: 'admin_mysore', password: 'admin123', depot_id: 31 },
      { username: 'admin_bidadi', password: 'admin123', depot_id: 32 },
    ];
    const testUser = testUsers[0];
    console.log('\n🧪 TESTING LOGIN');
    console.log('-'.repeat(80));
    console.log(`Username: ${testUser.username}`);
    console.log(`Role: depot_admin`);

    // Test 1: Exact username as in database
    console.log('\n✔️  Test 1: Login with exact database username');
    let response = await axios.post('http://localhost:3000/api/auth/login', {
      username: testUser.username,
      password: 'admin123',
      role: 'DEPOT',
      depotLocation: 'Bangalore'
    }, { validateStatus: () => true });

    console.log(`   Status: ${response.status}`);
    console.log(`   Success: ${response.data.success}`);
    if (!response.data.success) {
      console.log(`   Error: ${response.data.error}`);
    } else {
      console.log(`   ✅ Token received: ${response.data.data.token.substring(0, 20)}...`);
    }

    // Test 2: Uppercase username
    console.log('\n✔️  Test 2: Login with UPPERCASE username');
    response = await axios.post('http://localhost:3000/api/auth/login', {
      username: testUser.username.toUpperCase(),
      password: 'admin123',
      role: 'DEPOT',
      depotLocation: 'Bangalore'
    }, { validateStatus: () => true });

    console.log(`   Status: ${response.status}`);
    console.log(`   Success: ${response.data.success}`);
    if (!response.data.success) {
      console.log(`   Error: ${response.data.error}`);
    }

    // Test 3: Lowercase username
    console.log('\n✔️  Test 3: Login with lowercase username');
    response = await axios.post('http://localhost:3000/api/auth/login', {
      username: testUser.username.toLowerCase(),
      password: 'admin123',
      role: 'DEPOT',
      depotLocation: 'Bangalore'
    }, { validateStatus: () => true });

    console.log(`   Status: ${response.status}`);
    console.log(`   Success: ${response.data.success}`);
    if (!response.data.success) {
      console.log(`   Error: ${response.data.error}`);
    }

    // Test 4: Role variations
    console.log('\n✔️  Test 4: Login with role="depot" (lowercase)');
    response = await axios.post('http://localhost:3000/api/auth/login', {
      username: testUser.username,
      password: 'admin123',
      role: 'depot',  // lowercase
      depotLocation: 'Bangalore'
    }, { validateStatus: () => true });

    console.log(`   Status: ${response.status}`);
    console.log(`   Success: ${response.data.success}`);
    if (!response.data.success) {
      console.log(`   Error: ${response.data.error}`);
    }

    // Test 5: With spaces/trim
    console.log('\n✔️  Test 5: Login with spaces in username');
    response = await axios.post('http://localhost:3000/api/auth/login', {
      username: ` ${testUser.username} `,  // with leading/trailing spaces
      password: 'admin123',
      role: 'DEPOT',
      depotLocation: 'Bangalore'
    }, { validateStatus: () => true });

    console.log(`   Status: ${response.status}`);
    console.log(`   Success: ${response.data.success}`);
    if (!response.data.success) {
      console.log(`   Error: ${response.data.error}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('💡 RECOMMENDATION:');
    console.log('  If Test 1 passes but Flutter still fails, the issue might be:');
    console.log('  1. Flutter is sending different credentials than expected');
    console.log('  2. There\'s a network issue or proxy between Flutter and backend');
    console.log('  3. The Flutter app needs to be rebuilt/hot reloaded');
    console.log('  4. Check Flutter console logs for exact request being sent');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  process.exit(0);
}

investigateLoginIssue();
