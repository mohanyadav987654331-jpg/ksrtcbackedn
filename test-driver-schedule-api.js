const jwt = require('jsonwebtoken');
const http = require('http');

// Generate a valid JWT token for driver 102
const token = jwt.sign(
  { id: 102, username: 'driver2', role: 'driver' },
  'ksrtc_dev_secret_2024_change_in_production',
  { expiresIn: '7d' }
);

console.log('Generated JWT Token:', token);
console.log('\n📡 Testing GET /api/schedules/my-today?date=2026-01-29');

// Make HTTP request
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/schedules/my-today?date=2026-01-29',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response Status:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log('Response:', JSON.stringify(parsed, null, 2));
      if (parsed.success && parsed.data) {
        console.log(`\n✅ Success! Found ${parsed.data.length} assignments`);
        if (parsed.data.length > 0) {
          console.log('\nFirst 3 assignments:');
          parsed.data.slice(0, 3).forEach((trip, i) => {
            console.log(`  ${i+1}. ${trip.origin} → ${trip.destination} at ${trip.departure_time}`);
          });
        }
      }
    } catch (e) {
      console.log('Raw Response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Request Error:', e.message);
});

req.end();
