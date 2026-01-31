const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testUpcomingBuses() {
  console.log('=== Testing Upcoming Buses Feature ===\n');

  try {
    // Step 1: Login as a user
    console.log('1️⃣ Logging in as user...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'testuser',
      password: 'Test@123',
      role: 'user'
    });

    if (!loginResponse.data.success) {
      console.log('❌ Login failed:', loginResponse.data);
      return;
    }

    const token = loginResponse.data.data.token;
    console.log('✅ Login successful');
    console.log('   Token:', token.substring(0, 20) + '...\n');

    // Step 2: Get upcoming buses (next 3 hours)
    console.log('2️⃣ Fetching upcoming buses (next 3 hours)...');
    const upcomingResponse = await axios.get(`${API_BASE}/schedules/upcoming`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        location: 'Bangalore',
        hoursAhead: 3
      }
    });

    if (!upcomingResponse.data.success) {
      console.log('❌ Failed to fetch upcoming buses:', upcomingResponse.data);
      return;
    }

    const buses = upcomingResponse.data.data;
    console.log('✅ Found', buses.length, 'upcoming buses');
    console.log('   Current time:', upcomingResponse.data.currentTime);
    console.log('   Looking ahead:', upcomingResponse.data.hoursAhead, 'hours\n');

    // Step 3: Display upcoming buses with details
    if (buses.length > 0) {
      console.log('3️⃣ Upcoming Buses Details:\n');
      buses.forEach((bus, index) => {
        const status = bus.time_status === 'boarding' ? '🔴' : 
                      bus.time_status === 'soon' ? '🟠' : '🟢';
        console.log(`${status} Bus ${index + 1}:`);
        console.log(`   Route: ${bus.origin} → ${bus.destination}`);
        console.log(`   Bus Number: ${bus.bus_number} (${bus.bus_type})`);
        console.log(`   Driver: ${bus.driver_name || 'Unassigned'}`);
        console.log(`   Departure: ${bus.departure_time}`);
        console.log(`   Status: ${bus.time_status.toUpperCase()}`);
        console.log(`   Departs in: ${bus.minutes_until_departure} minutes`);
        console.log('');
      });
    } else {
      console.log('ℹ️ No buses departing in the next 3 hours');
      console.log('   This might be normal if testing outside schedule times\n');
    }

    // Step 4: Test with all schedules (not just upcoming)
    console.log('4️⃣ Fetching all schedules for comparison...');
    const allResponse = await axios.get(`${API_BASE}/schedules`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        location: 'Bangalore',
        assigned_date: new Date().toISOString().split('T')[0]
      }
    });

    if (allResponse.data.success) {
      const allSchedules = allResponse.data.data;
      console.log('✅ Total schedules for today:', allSchedules.length);
      console.log('   Upcoming (next 3hrs):', buses.length);
      console.log('   Difference:', allSchedules.length - buses.length, 'buses already departed or departing later\n');

      // Show time status breakdown
      const statusCounts = {
        departed: 0,
        boarding: 0,
        soon: 0,
        upcoming: 0,
        scheduled: 0
      };

      allSchedules.forEach(s => {
        const status = s.time_status || 'scheduled';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      console.log('📊 Status Breakdown (All Schedules):');
      Object.entries(statusCounts).forEach(([status, count]) => {
        if (count > 0) {
          console.log(`   ${status}: ${count}`);
        }
      });
    }

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testUpcomingBuses();
