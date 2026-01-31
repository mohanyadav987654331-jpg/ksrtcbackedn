const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'ksrtc_smart_transport'
};

async function fixTodayAssignments() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');

    const today = new Date().toISOString().slice(0, 10);
    console.log(`Fixing assignments for today: ${today}`);

    // Update today's assignments to ASSIGNED status
    const [result] = await connection.query(
      'UPDATE driver_assignments SET status = ? WHERE assigned_date = ?',
      ['ASSIGNED', today]
    );

    console.log(`✅ Updated ${result.affectedRows} assignments to ASSIGNED status`);

    // Show count of today's trips
    const [trips] = await connection.query(
      'SELECT COUNT(*) as count FROM driver_assignments WHERE assigned_date = ?',
      [today]
    );

    console.log(`📋 Total trips for today (${today}): ${trips[0].count}`);

    // Show sample trips
    const [samples] = await connection.query(
      `SELECT da.id, u.full_name as driver, s.departure_time, r.origin, r.destination, da.status
       FROM driver_assignments da
       JOIN users u ON da.driver_id = u.id
       JOIN schedules s ON da.schedule_id = s.id
       JOIN routes r ON s.route_id = r.id
       WHERE da.assigned_date = ?
       LIMIT 5`,
      [today]
    );

    console.log('\n📌 Sample of today\'s trips:');
    samples.forEach((trip, i) => {
      console.log(`  ${i+1}. ${trip.driver}: ${trip.departure_time} - ${trip.origin}→${trip.destination} [${trip.status}]`);
    });

    await connection.end();
    console.log('\n✅ Fix completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixTodayAssignments();
