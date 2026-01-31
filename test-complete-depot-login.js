const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function fullDepotLoginTest() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     COMPLETE DEPOT ADMIN LOGIN FLOW TEST                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Test all depot admins
  const depotAdmins = [
    { username: 'admin_bangalore', password: 'admin123', location: 'Bangalore' },
    { username: 'admin_mysore', password: 'admin123', location: 'Mysore' },
    { username: 'admin_bidadi', password: 'admin123', location: 'Bidadi' },
    { username: 'admin_ramanagara', password: 'admin123', location: 'Ramanagara' },
    { username: 'admin_kolar', password: 'admin123', location: 'Kolar' },
    { username: 'admin_hosur', password: 'admin123', location: 'Hosur' },
    { username: 'admin_kollegal', password: 'admin123', location: 'Kollegal' },
    { username: 'admin_maddur', password: 'admin123', location: 'Maddur' },
    { username: 'admin_srirangapatna', password: 'admin123', location: 'Srirangapatna' },
    { username: 'admin_malavalli', password: 'admin123', location: 'Malavalli' },
    { username: 'admin_kanakapura', password: 'admin123', location: 'Kanakapura' },
    { username: 'admin_harohalli', password: 'admin123', location: 'Harohalli' },
  ];

  console.log('🏢 DEPOT SUGGESTIONS LOAD\n');
  try {
    const res = await axios.get(`${API_BASE}/depots`);
    console.log(`✅ Got ${res.data.data.length} depots for dropdown selection`);
    console.log(`   Available locations: ${res.data.data.map(d => d.location).join(', ')}\n`);
  } catch (e) {
    console.log(`❌ Failed to fetch depots: ${e.response?.data?.error || e.message}\n`);
    return;
  }

  console.log('🔐 DEPOT ADMIN LOGINS\n');
  
  let successCount = 0;
  const results = [];

  for (const admin of depotAdmins) {
    process.stdout.write(`Testing ${admin.username}... `);
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, {
        username: admin.username,
        password: admin.password,
        role: 'DEPOT',
        depotLocation: admin.location
      });

      if (res.data.success) {
        const user = res.data.data.user;
        console.log('✅');
        results.push({
          status: '✅',
          username: admin.username,
          depot: user.depot_name,
          location: user.location,
          token: res.data.data.token.substring(0, 20) + '...'
        });
        successCount++;
      } else {
        console.log(`❌ - ${res.data.error}`);
        results.push({
          status: '❌',
          username: admin.username,
          error: res.data.error
        });
      }
    } catch (e) {
      console.log(`❌ - ${e.response?.data?.error || e.message}`);
      results.push({
        status: '❌',
        username: admin.username,
        error: e.response?.data?.error || e.message
      });
    }
  }

  console.log('\n📊 LOGIN RESULTS\n');
  console.table(results);

  console.log(`\n🎯 Summary: ${successCount}/${depotAdmins.length} depot admins can login`);
  
  if (successCount === depotAdmins.length) {
    console.log('\n✅ ALL TESTS PASSED - Depot login is working!');
    console.log('\n💡 Flutter app can now:');
    console.log('   1. Load depot suggestions from /api/depots');
    console.log('   2. User selects location from dropdown');
    console.log('   3. Enters credentials (username/password)');
    console.log('   4. Clicks login - sends role="DEPOT" + location');
    console.log('   5. Backend authenticates and returns token + depot data');
    console.log('   6. Flutter app navigates to DepotLocationDashboard');
  } else {
    console.log('\n⚠️ Some logins failed - check above for details');
  }
}

fullDepotLoginTest();
