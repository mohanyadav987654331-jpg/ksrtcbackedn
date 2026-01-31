#!/usr/bin/env node

/**
 * Test script that simulates Flutter app making a depot login request
 * and shows if there are any mismatches between what Flutter sends
 * and what the backend expects
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testFlutterDepotLoginFlow() {
  console.log('=== Simulating Flutter Depot Admin Login Flow ===\n');

  // Step 1: Fetch depots (like _fetchDepotSuggestions in Flutter)
  console.log('1️⃣ Fetching depot suggestions (like Flutter app does)...\n');
  try {
    const depotsRes = await axios.get(`${API_BASE}/depots`);
    console.log(`✅ Got ${depotsRes.data.data?.length || 0} depots`);
    if (depotsRes.data.data && depotsRes.data.data.length > 0) {
      console.log('   First depot:', depotsRes.data.data[0]);
    }
  } catch (e) {
    console.log('❌ Error fetching depots:', e.response?.data || e.message);
  }

  console.log('\n2️⃣ User fills form and clicks Login\n');
  console.log('   Form values:');
  console.log('   - Username: admin_bangalore');
  console.log('   - Password: admin123');
  console.log('   - Role: DEPOT (from role_selection_screen.dart)');
  console.log('   - Depot Location: Bangalore (selected from dropdown)\n');

  // Step 2: Call login with exact values from Flutter
  console.log('3️⃣ Making login request...\n');
  try {
    const loginPayload = {
      username: 'admin_bangalore',
      password: 'admin123',
      role: 'DEPOT', // This is what Flutter sends (from roleDepot constant)
      depotLocation: 'Bangalore' // This is what user selected
    };

    console.log('📤 Sending to backend:');
    console.log(JSON.stringify(loginPayload, null, 2));
    console.log('');

    const loginRes = await axios.post(`${API_BASE}/auth/login`, loginPayload);

    if (loginRes.data.success) {
      console.log('✅ Login successful!\n');
      console.log('📥 Backend response:');
      console.log(`   Token: ${loginRes.data.data.token.substring(0, 30)}...`);
      console.log(`   User: ${loginRes.data.data.user.username}`);
      console.log(`   Role: ${loginRes.data.data.user.role}`);
      console.log(`   Depot ID: ${loginRes.data.data.user.depotId}`);
      console.log(`   Depot Name: ${loginRes.data.data.user.depot_name}`);
      console.log(`   Location: ${loginRes.data.data.user.location}`);
    } else {
      console.log('❌ Login failed!');
      console.log('   Error:', loginRes.data.error);
    }
  } catch (e) {
    console.log('❌ Error during login:', e.response?.data || e.message);
  }

  console.log('\n4️⃣ Testing edge cases...\n');

  // Edge case 1: No depot location provided
  console.log('Test 1: What if user forgets to select depot location?\n');
  try {
    const res = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin_bangalore',
      password: 'admin123',
      role: 'DEPOT'
      // No depotLocation
    });
    if (res.data.success) {
      console.log('✅ Login still works without depotLocation');
      console.log('   (Backend finds depot by username)');
    } else {
      console.log('❌ Login fails:', res.data.error);
    }
  } catch (e) {
    console.log('❌ Error:', e.response?.data?.error || e.message);
  }

  // Edge case 2: Wrong location
  console.log('\nTest 2: What if user selects wrong location?\n');
  try {
    const res = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin_bangalore',
      password: 'admin123',
      role: 'DEPOT',
      depotLocation: 'Mysore' // Wrong location for this user
    });
    if (res.data.success) {
      console.log('✅ Login succeeded (backend ignores wrong location)');
    } else {
      console.log('❌ Login failed:', res.data.error);
    }
  } catch (e) {
    console.log('❌ Error:', e.response?.data?.error || e.message);
  }

  // Edge case 3: Case sensitivity
  console.log('\nTest 3: Is case sensitive?\n');
  try {
    const res = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin_bangalore',
      password: 'admin123',
      role: 'depot', // lowercase
      depotLocation: 'bangalore' // lowercase
    });
    if (res.data.success) {
      console.log('✅ Login works with lowercase');
    } else {
      console.log('❌ Login fails:', res.data.error);
    }
  } catch (e) {
    console.log('❌ Error:', e.response?.data?.error || e.message);
  }
}

testFlutterDepotLoginFlow();
