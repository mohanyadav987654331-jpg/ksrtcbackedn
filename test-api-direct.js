const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function test() {
  try {
    // Login
    console.log('🔐 Logging in...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      username: 'testdriver',
      password: 'Test@123',
      role: 'driver'
    });
    
    const token = loginRes.data.data.token;
    console.log(`✅ Token: ${token.substring(0, 30)}...`);
    
    // Try to fetch schedules
    const today = new Date().toISOString().split('T')[0];
    console.log(`\n📋 Fetching schedules for ${today}...`);
    
    try {
      const schedulesRes = await axios.get(`${API_URL}/schedules/my-today`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { date: today }
      });
      
      console.log(`✅ Response: ${JSON.stringify(schedulesRes.data, null, 2)}`);
    } catch (error) {
      console.log(`❌ Error Response:`);
      console.log(JSON.stringify(error.response?.data, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    console.error('Stack:', error.stack);
  }
}

test();
