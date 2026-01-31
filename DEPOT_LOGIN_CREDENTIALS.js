/**
 * DEPOT ADMIN LOGIN CREDENTIALS
 * 
 * All depot admins have password: admin123
 * All depots are configured and ready
 * 
 * Available credentials:
 */

const DEPOT_CREDENTIALS = [
  { username: 'admin_bangalore', depot: 'Bangalore Central Depot', location: 'Bangalore' },
  { username: 'admin_mysore', depot: 'Mysore Central Depot', location: 'Mysore' },
  { username: 'admin_bidadi', depot: 'Bidadi Depot', location: 'Bidadi' },
  { username: 'admin_ramanagara', depot: 'Ramanagara Depot', location: 'Ramanagara' },
  { username: 'admin_kolar', depot: 'Kolar Depot', location: 'Kolar' },
  { username: 'admin_hosur', depot: 'Hosur Depot', location: 'Hosur' },
  { username: 'admin_kollegal', depot: 'Kollegal Depot', location: 'Kollegal' },
  { username: 'admin_maddur', depot: 'Maddur Depot', location: 'Maddur' },
  { username: 'admin_srirangapatna', depot: 'Srirangapatna Depot', location: 'Srirangapatna' },
  { username: 'admin_malavalli', depot: 'Malavalli Depot', location: 'Malavalli' },
  { username: 'admin_kanakapura', depot: 'Kanakapura Depot', location: 'Kanakapura' },
  { username: 'admin_harohalli', depot: 'Harohalli Depot', location: 'Harohalli' },
];

/**
 * HOW TO LOGIN IN FLUTTER APP
 * 
 * 1. Open the app on Windows
 * 2. Select "Depot Admin" role
 * 3. In login form:
 *    - Username: admin_bangalore (or any above)
 *    - Password: admin123
 *    - Depot Location: Bangalore (must select from dropdown matching username's location)
 * 4. Click Login
 * 
 * EXPECTED RESULT:
 * - Login succeeds
 * - Shows "DepotLocationDashboard" with:
 *   - Schedules for today
 *   - Drivers assigned
 *   - Available buses
 *   - Upcoming buses (within next 3 hours)
 * 
 * FEATURES AVAILABLE:
 * ✅ Toggle "Show Upcoming Buses Only"
 * ✅ Real-time countdown timers (updates every minute)
 * ✅ Bus status: "BOARDING" (red), "SOON" (orange), "UPCOMING" (green)
 * ✅ All 12 depot locations working
 * ✅ Time-based bus filtering
 * ✅ Driver and bus assignments shown
 */

module.exports = { DEPOT_CREDENTIALS };

// QUICK TEST SCRIPT
const axios = require('axios');

async function testAllDepots() {
  console.log('Testing all depot logins...\n');
  
  const API = 'http://localhost:3000/api';
  let passed = 0;
  
  for (const cred of DEPOT_CREDENTIALS) {
    try {
      const res = await axios.post(`${API}/auth/login`, {
        username: cred.username,
        password: 'admin123',
        role: 'DEPOT',
        depotLocation: cred.location
      });
      
      if (res.data.success) {
        console.log(`✅ ${cred.username.padEnd(25)} -> ${cred.depot}`);
        passed++;
      } else {
        console.log(`❌ ${cred.username} - ${res.data.error}`);
      }
    } catch (e) {
      console.log(`❌ ${cred.username} - Connection error`);
    }
  }
  
  console.log(`\n✅ Passed ${passed}/${DEPOT_CREDENTIALS.length}`);
}

if (require.main === module) {
  testAllDepots();
}
