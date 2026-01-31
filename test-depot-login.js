const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testDepotLogin() {
  try {
    console.log('\n=== Testing Depot Admin Login ===');
    
    // Step 1: Login
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin_bangalore',
      password: 'admin123',
      role: 'depot',
      depotLocation: 'Bangalore'
    });

    console.log('\n✅ Login Response:');
    console.log('Success:', loginResponse.data.success);
    console.log('User:', loginResponse.data.data.user.username);
    console.log('Depot ID:', loginResponse.data.data.user.depotId);
    console.log('Depot Name:', loginResponse.data.data.user.depot_name);
    console.log('Location:', loginResponse.data.data.user.location);
    
    const token = loginResponse.data.data.token;
    const depotId = loginResponse.data.data.user.depotId;

    // Step 2: Test Today's Schedule API
    console.log('\n=== Testing Today\'s Schedule API ===');
    const scheduleResponse = await axios.get(`${BASE_URL}/depot/today-schedule`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        depot_id: depotId,
        assigned_date: new Date().toISOString().slice(0, 10)
      }
    });

    console.log('✅ Schedules:', scheduleResponse.data.count);
    if (scheduleResponse.data.data && scheduleResponse.data.data.length > 0) {
      console.log('First schedule:', scheduleResponse.data.data[0].origin, '→', scheduleResponse.data.data[0].destination);
    }

    // Step 3: Test Drivers API
    console.log('\n=== Testing Drivers API ===');
    const driversResponse = await axios.get(`${BASE_URL}/depot/drivers`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        depot_id: depotId,
        assigned_date: new Date().toISOString().slice(0, 10)
      }
    });

    console.log('✅ Drivers:', driversResponse.data.data.length);
    if (driversResponse.data.data && driversResponse.data.data.length > 0) {
      console.log('First driver:', driversResponse.data.data[0].full_name);
    }

    // Step 4: Test Buses API
    console.log('\n=== Testing Buses API ===');
    const busesResponse = await axios.get(`${BASE_URL}/depot/buses`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        depot_id: depotId,
        assigned_date: new Date().toISOString().slice(0, 10)
      }
    });

    console.log('✅ Buses:', busesResponse.data.data.length);
    if (busesResponse.data.data && busesResponse.data.data.length > 0) {
      console.log('First bus:', busesResponse.data.data[0].bus_number);
    }

    console.log('\n✅ ALL TESTS PASSED!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

testDepotLogin();
