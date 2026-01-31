const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function quickTest() {
  try {
    console.log('🔐 Testing Driver Login & Schedules...\n');
    
    // Login as test driver
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      username: 'testdriver',
      password: 'Test@123',
      role: 'driver'
    });
    
    if (!loginRes.data.success) {
      console.log('❌ Login failed');
      return;
    }
    
    const token = loginRes.data.data.token;
    console.log('✅ Login successful');
    console.log(`   Driver: ${loginRes.data.data.user.username}`);
    console.log(`   Name: ${loginRes.data.data.user.full_name || 'Test Driver'}\n`);
    
    // Fetch today's schedules
    const today = new Date().toISOString().split('T')[0];
    const schedulesRes = await axios.get(`${API_URL}/schedules/my-today`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { date: today }
    });
    
    if (!schedulesRes.data.success) {
      console.log('❌ Failed to fetch schedules');
      return;
    }
    
    const schedules = schedulesRes.data.data;
    console.log(`📋 Today's Schedules (${today}):`);
    console.log(`   Total Trips: ${schedules.length}\n`);
    
    if (schedules.length === 0) {
      console.log('⚠️  No schedules found for today!');
      console.log('   This means the driver has no assigned trips.\n');
      return;
    }
    
    console.log('📌 Trip Details:\n');
    schedules.forEach((trip, i) => {
      console.log(`${i + 1}. ${trip.departure_time} → ${trip.arrival_time || 'N/A'}`);
      console.log(`   Route: ${trip.origin} → ${trip.destination}`);
      console.log(`   Bus: ${trip.bus_number} (${trip.bus_type})`);
      console.log(`   Status: ${trip.status}`);
      console.log(`   Distance: ${trip.distance} km\n`);
    });
    
    console.log('✅ SUCCESS: Driver can see schedules!');
    console.log('\n📱 IN FLUTTER APP, YOU SHOULD SEE:');
    console.log(`   - "Today's Schedule" tab with ${schedules.length} trips`);
    console.log('   - Each trip showing departure time, route, and bus number');
    console.log('   - "Start Trip" button for each ASSIGNED trip');
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Backend server is not running!');
      console.log('   Start it with: cd d:/SRP/backend && node server.js');
    } else if (error.response) {
      console.log('❌ API Error:', error.response.status);
      console.log('   Message:', error.response.data);
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

quickTest();
