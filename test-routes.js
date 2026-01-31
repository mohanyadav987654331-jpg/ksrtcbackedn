const mysql = require('mysql2/promise');

async function testRoutes() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'ksrtc_smart_transport'
  });

  console.log('🔍 Testing route-specific buses:\n');

  // Test 1: Bangalore to Mysore
  console.log('1. Bangalore → Mysore:');
  const [buses1] = await conn.query(`
    SELECT DISTINCT b.bus_number, b.bus_type, s.departure_time
    FROM schedules s
    JOIN routes r ON s.route_id = r.id
    JOIN buses b ON s.bus_id = b.id
    WHERE r.origin = 'Bangalore' AND r.destination = 'Mysore'
    ORDER BY s.departure_time
    LIMIT 5
  `);
  buses1.forEach(b => console.log(`   ${b.bus_number} (${b.bus_type}) - ${b.departure_time}`));

  // Test 2: Bangalore to Hosur
  console.log('\n2. Bangalore → Hosur:');
  const [buses2] = await conn.query(`
    SELECT DISTINCT b.bus_number, b.bus_type, s.departure_time
    FROM schedules s
    JOIN routes r ON s.route_id = r.id
    JOIN buses b ON s.bus_id = b.id
    WHERE r.origin = 'Bangalore' AND r.destination = 'Hosur'
    ORDER BY s.departure_time
    LIMIT 5
  `);
  buses2.forEach(b => console.log(`   ${b.bus_number} (${b.bus_type}) - ${b.departure_time}`));

  // Test 3: Mysore to Bangalore
  console.log('\n3. Mysore → Bangalore:');
  const [buses3] = await conn.query(`
    SELECT DISTINCT b.bus_number, b.bus_type, s.departure_time
    FROM schedules s
    JOIN routes r ON s.route_id = r.id
    JOIN buses b ON s.bus_id = b.id
    WHERE r.origin = 'Mysore' AND r.destination = 'Bangalore'
    ORDER BY s.departure_time
    LIMIT 5
  `);
  buses3.forEach(b => console.log(`   ${b.bus_number} (${b.bus_type}) - ${b.departure_time}`));

  await conn.end();
}

testRoutes().catch(console.error);
