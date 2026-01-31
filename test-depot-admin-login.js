const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testDepotAdminLogin() {
  console.log('=== Testing Depot Admin Login ===\n');

  const testCredentials = [
    { username: 'admin_bangalore', password: 'admin123', location: 'Bangalore', depot_id: 30 },
    { username: 'admin_mysore', password: 'admin123', location: 'Mysore', depot_id: 33 },
    { username: 'admin_harohalli', password: 'admin123', location: 'Harohalli', depot_id: 43 }
  ];

  for (const cred of testCredentials) {
    try {
      console.log(`🔐 Testing: ${cred.username} (${cred.location})`);
      
      const response = await axios.post(`${API_BASE}/auth/login`, {
        username: cred.username,
        password: cred.password,
        role: 'depot',
        depotLocation: cred.location
      });

      if (response.data.success) {
        console.log('✅ Login successful');
        console.log(`   Token: ${response.data.data.token.substring(0, 30)}...`);
        const user = response.data.data.user;
        console.log(`   User: ${user.username}`);
        console.log(`   Depot ID: ${user.depotId}`);
        console.log(`   Depot Name: ${user.depot_name}`);
        console.log(`   Location: ${user.location}`);
      } else {
        console.log('❌ Login failed:', response.data.error || response.data.message);
      }
    } catch (error) {
      console.log('❌ Error:', error.response?.data || error.message);
    }
    console.log('');
  }

  // Also test with role variations
  console.log('🔍 Testing role variations...\n');
  
  const roleTests = [
    { role: 'depot', desc: 'role: "depot"' },
    { role: 'depot_admin', desc: 'role: "depot_admin"' },
    { role: 'DEPOT', desc: 'role: "DEPOT"' },
  ];

  for (const roleTest of roleTests) {
    try {
      console.log(`Testing ${roleTest.desc}`);
      const response = await axios.post(`${API_BASE}/auth/login`, {
        username: 'admin_bangalore',
        password: 'admin123',
        role: roleTest.role,
        depotLocation: 'Bangalore'
      });

      if (response.data.success) {
        console.log(`✅ Success with role "${roleTest.role}"`);
      } else {
        console.log(`❌ Failed: ${response.data.error}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.response?.data?.error || error.message}`);
    }
  }
}

testDepotAdminLogin();
