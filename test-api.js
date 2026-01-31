const db = require('./config/database');

async function testAPIs() {
  try {
    // Test depot admin users
    console.log('\n=== Testing Depot Admin Users ===');
    const [admins] = await db.query(`
      SELECT username, role, depot_id
      FROM users
      WHERE role = 'depot_admin'
      LIMIT 5
    `);
    console.log(`Found ${admins.length} depot admins`);
    console.table(admins);

    // Test depot 30 schedules
    console.log('\n=== Testing Depot 30 Schedules ===');
    const [schedules] = await db.query(`
      SELECT s.id, s.departure_time, r.origin, r.destination
      FROM schedules s
      JOIN routes r ON s.route_id = r.id
      WHERE s.depot_id = 30
      LIMIT 5
    `);
    console.log(`Found ${schedules.length} schedules for depot 30`);
    console.table(schedules);

    // Test depot 30 drivers
    console.log('\n=== Testing Depot 30 Drivers ===');
    const [drivers] = await db.query(`
      SELECT id, username, full_name, depot_id
      FROM users
      WHERE depot_id = 30 AND role = 'driver'
      LIMIT 5
    `);
    console.log(`Found ${drivers.length} drivers for depot 30`);
    console.table(drivers);

    // Test depot 30 buses
    console.log('\n=== Testing Depot 30 Buses ===');
    const [buses] = await db.query(`
      SELECT id, bus_number, bus_type, depot_id
      FROM buses
      WHERE depot_id = 30
      LIMIT 5
    `);
    console.log(`Found ${buses.length} buses for depot 30`);
    console.table(buses);

    process.exit(0);
  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }
}

testAPIs();
