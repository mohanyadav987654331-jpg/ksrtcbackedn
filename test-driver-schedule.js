const axios = require('axios');

// Test credentials - use a driver account
const driverCredentials = {
  username: 'testdriver',
  password: 'Test@123',
  role: 'driver'
};

const API_URL = 'http://localhost:3000/api';
let authToken = '';

async function test() {
  try {
    console.log('🔐 Step 1: Login as driver...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, driverCredentials);
    
    if (!loginRes.data.success) {
      console.error('❌ Login failed:', loginRes.data.error);
      return;
    }
    
    authToken = loginRes.data.data?.token;
    if (!authToken) {
      console.error('❌ No token returned');
      console.log('Full response:', JSON.stringify(loginRes.data, null, 2));
      return;
    }
    console.log(`✅ Logged in successfully. Token: ${authToken.substring(0, 20)}...`);
    
    console.log('\n📋 Step 2: Fetch today\'s schedules...');
    const today = new Date().toISOString().split('T')[0];
    const schedulesRes = await axios.get(`${API_URL}/schedules/my-today`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { date: today }
    });
    
    if (!schedulesRes.data.success) {
      console.error('❌ Failed to fetch schedules:', schedulesRes.data.error);
      return;
    }
    
    const schedules = schedulesRes.data.data;
    console.log(`✅ Fetched ${schedules.length} schedules for today`);
    
    if (schedules.length === 0) {
      console.log('⚠️  No schedules found for today!');
      return;
    }
    
    console.log('\n📌 Sample schedules:');
    schedules.slice(0, 5).forEach((schedule, i) => {
      console.log(`  ${i+1}. ${schedule.departure_time} - ${schedule.origin}→${schedule.destination}`);
      console.log(`     Status: ${schedule.status}, Bus: ${schedule.bus_number}`);
    });
    
    console.log(`\n✅ SUCCESS: Driver can now see ${schedules.length} trips for today!`);
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

test();
