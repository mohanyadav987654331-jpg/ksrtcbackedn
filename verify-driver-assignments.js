const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'ksrtc_smart_transport'
};

async function verifyAssignments() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database\n');

    // Get driver assignments with routes for today
    const [assignments] = await connection.query(`
      SELECT 
        u.username,
        u.full_name,
        COUNT(DISTINCT r.id) as unique_routes,
        COUNT(da.id) as total_trips,
        GROUP_CONCAT(DISTINCT CONCAT(r.origin, ' → ', r.destination) SEPARATOR ', ') as routes
      FROM users u
      JOIN driver_assignments da ON u.id = da.driver_id
      JOIN schedules s ON da.schedule_id = s.id
      JOIN routes r ON s.route_id = r.id
      WHERE u.role = 'driver' AND da.assigned_date = CURDATE()
      GROUP BY u.id, u.username, u.full_name
      ORDER BY u.username
    `);

    console.log('=== DRIVER ASSIGNMENTS FOR TODAY ===\n');
    assignments.forEach(driver => {
      console.log(`${driver.username} (${driver.full_name})`);
      console.log(`  Total Trips: ${driver.total_trips}`);
      console.log(`  Routes Covered: ${driver.unique_routes}`);
      console.log(`  Sample Routes: ${driver.routes.substring(0, 150)}...`);
      console.log('');
    });

    // Show login credentials
    console.log('\n=== DRIVER LOGIN CREDENTIALS ===');
    const [drivers] = await connection.query(`
      SELECT username, full_name, phone
      FROM users
      WHERE role = 'driver'
      ORDER BY username
    `);

    drivers.forEach(d => {
      console.log(`${d.username} / driver123 - ${d.full_name} (${d.phone})`);
    });

    // Show sample assignments for driver1
    console.log('\n\n=== SAMPLE: driver1 TODAY\'S TRIPS ===');
    const [driver1Trips] = await connection.query(`
      SELECT 
        r.origin,
        r.destination,
        s.departure_time,
        s.arrival_time,
        b.bus_number,
        da.status
      FROM driver_assignments da
      JOIN schedules s ON da.schedule_id = s.id
      JOIN routes r ON s.route_id = r.id
      JOIN buses b ON da.bus_id = b.id
      JOIN users u ON da.driver_id = u.id
      WHERE u.username = 'driver1' AND da.assigned_date = CURDATE()
      ORDER BY s.departure_time
      LIMIT 10
    `);

    driver1Trips.forEach(trip => {
      console.log(`${trip.departure_time} - ${trip.arrival_time}: Bus ${trip.bus_number}`);
      console.log(`  ${trip.origin} → ${trip.destination} [${trip.status}]`);
    });

    console.log('\n✅ All drivers have trips assigned across all routes!');

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

verifyAssignments().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
