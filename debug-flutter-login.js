#!/usr/bin/env node

const http = require('http');
const https = require('https');

// Add comprehensive backend logging
const axios = require('axios');

async function testFlutterLogin() {
  const API_BASE = 'http://localhost:3000/api';
  
  // Credentials to test
  const testUsers = [
    {
      username: 'admin_bangalore',
      password: 'admin123',
      role: 'DEPOT',  // Flutter sends uppercase
      depotLocation: 'Bangalore'
    }
  ];

  console.log('='.repeat(70));
  console.log('🔍 DEBUG: Simulating Flutter Login Request');
  console.log('='.repeat(70));

  for (const user of testUsers) {
    try {
      console.log('\n📋 Request Details:');
      console.log('  Endpoint: POST /api/auth/login');
      console.log('  Username:', user.username);
      console.log('  Role:', user.role);
      console.log('  Depot Location:', user.depotLocation);
      console.log('  Password: [hidden]');

      // Make request with EXACTLY what Flutter sends
      const response = await axios.post(`${API_BASE}/auth/login`, {
        username: user.username,
        password: user.password,
        role: user.role,
        depotLocation: user.depotLocation
      }, {
        headers: {
          'Content-Type': 'application/json',
          // NO Authorization header on login!
        },
        validateStatus: () => true  // Don't throw on any status
      });

      console.log('\n📤 Response Status:', response.status);
      console.log('📥 Response Data:', JSON.stringify(response.data, null, 2));

      if (response.status === 200 && response.data.success) {
        console.log('✅ LOGIN SUCCESSFUL');
      } else {
        console.log('❌ LOGIN FAILED');
        console.log('   Status:', response.status);
        console.log('   Error:', response.data.error || 'Unknown error');
      }

    } catch (error) {
      console.error('❌ Request Error:', error.message);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('Now let\'s check what the backend is logging...');
  console.log('(Check terminal where backend is running)');
  console.log('='.repeat(70));
}

testFlutterLogin().catch(console.error);
