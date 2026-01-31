const http = require('http');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const secret = 'ksrtc_dev_secret_2024_change_in_production';
const token = jwt.sign(
  { id: 102, username: 'driver2', role: 'driver' },
  secret,
  { expiresIn: '7d' }
);

console.log('Generated token:', token);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/schedules/my-today?date=2026-01-29',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const output = [];
output.push(`Testing API endpoint...`);
output.push(`URL: http://localhost:3000/api/schedules/my-today?date=2026-01-29`);
output.push(`Token: ${token}`);

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    output.push(`\nResponse Status: ${res.statusCode}`);
    output.push(`Response Headers: ${JSON.stringify(res.headers)}`);
    try {
      const parsed = JSON.parse(data);
      output.push(`\nParsed Response: ${JSON.stringify(parsed, null, 2)}`);
      output.push(`\nData Count: ${parsed.data ? parsed.data.length : 'N/A'}`);
    } catch (e) {
      output.push(`\nRaw Response: ${data}`);
    }
    
    fs.writeFileSync('test-output.txt', output.join('\n'));
    console.log('Test completed. Results written to test-output.txt');
    process.exit(0);
  });
});

req.on('error', (e) => {
  output.push(`Error: ${e.message}`);
  fs.writeFileSync('test-output.txt', output.join('\n'));
  console.log('Test failed. Results written to test-output.txt');
  process.exit(1);
});

req.end();

// Timeout after 5 seconds
setTimeout(() => {
  output.push('Timeout - no response after 5 seconds');
  fs.writeFileSync('test-output.txt', output.join('\n'));
  process.exit(1);
}, 5000);
