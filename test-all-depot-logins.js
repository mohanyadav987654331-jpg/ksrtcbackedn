const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testDepotLoginScenarios() {
  console.log('=== Testing Depot Login Scenarios ===\n');

  // Scenario 1: With depot location
  console.log('1️⃣ Login WITH depot location\n');
  try {
    const res1 = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin_bangalore',
      password: 'admin123',
      role: 'DEPOT',
      depotLocation: 'Bangalore'
    });
    
    if (res1.data.success) {
      console.log('✅ Success');
      console.log(`   Token: ${res1.data.data.token.substring(0, 20)}...`);
      console.log(`   User: ${res1.data.data.user.username}`);
      console.log(`   Depot: ${res1.data.data.user.depot_name}`);
    } else {
      console.log('❌ Failed:', res1.data.error);
    }
  } catch (e) {
    console.log('❌ Error:', e.response?.data || e.message);
  }

  console.log('\n2️⃣ Login WITHOUT depot location (just username/password)\n');
  try {
    const res2 = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin_bangalore',
      password: 'admin123',
      role: 'DEPOT'
    });
    
    if (res2.data.success) {
      console.log('✅ Success');
      console.log(`   Token: ${res2.data.data.token.substring(0, 20)}...`);
      console.log(`   User: ${res2.data.data.user.username}`);
      console.log(`   Depot: ${res2.data.data.user.depot_name}`);
    } else {
      console.log('❌ Failed:', res2.data.error);
    }
  } catch (e) {
    console.log('❌ Error:', e.response?.data || e.message);
  }

  console.log('\n3️⃣ Login with WRONG password\n');
  try {
    const res3 = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin_bangalore',
      password: 'wrongpassword',
      role: 'DEPOT',
      depotLocation: 'Bangalore'
    });
    
    if (res3.data.success) {
      console.log('❌ Should have failed but succeeded!');
    } else {
      console.log('✅ Correctly rejected:', res3.data.error);
    }
  } catch (e) {
    console.log('✅ Correctly rejected:', e.response?.data?.error || e.message);
  }

  console.log('\n4️⃣ Login with NONEXISTENT user\n');
  try {
    const res4 = await axios.post(`${API_BASE}/auth/login`, {
      username: 'nonexistent_user',
      password: 'admin123',
      role: 'DEPOT',
      depotLocation: 'Bangalore'
    });
    
    if (res4.data.success) {
      console.log('❌ Should have failed but succeeded!');
    } else {
      console.log('✅ Correctly rejected:', res4.data.error);
    }
  } catch (e) {
    console.log('✅ Correctly rejected:', e.response?.data?.error || e.message);
  }

  console.log('\n5️⃣ Test all depot admins\n');
  const depots = [
    { username: 'admin_bangalore', location: 'Bangalore' },
    { username: 'admin_mysore', location: 'Mysore' },
    { username: 'admin_bidadi', location: 'Bidadi' },
    { username: 'admin_ramanagara', location: 'Ramanagara' },
    { username: 'admin_kolar', location: 'Kolar' },
    { username: 'admin_hosur', location: 'Hosur' },
    { username: 'admin_kollegal', location: 'Kollegal' },
    { username: 'admin_maddur', location: 'Maddur' },
    { username: 'admin_srirangapatna', location: 'Srirangapatna' },
    { username: 'admin_malavalli', location: 'Malavalli' },
    { username: 'admin_kanakapura', location: 'Kanakapura' },
    { username: 'admin_harohalli', location: 'Harohalli' },
  ];

  let successCount = 0;
  for (const depot of depots) {
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, {
        username: depot.username,
        password: 'admin123',
        role: 'DEPOT',
        depotLocation: depot.location
      });
      
      if (res.data.success) {
        console.log(`✅ ${depot.username}: Success`);
        successCount++;
      } else {
        console.log(`❌ ${depot.username}: ${res.data.error}`);
      }
    } catch (e) {
      console.log(`❌ ${depot.username}: ${e.response?.data?.error || e.message}`);
    }
  }
  
  console.log(`\n📊 Result: ${successCount}/${depots.length} depot admins can login`);
}

testDepotLoginScenarios();
