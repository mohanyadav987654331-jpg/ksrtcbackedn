const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'ksrtc_smart_transport'
};

async function debug() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    const driverId = 135; // testdriver
    const today = new Date().toISOString().slice(0, 10);
    
    console.log(`Driver ID: ${driverId}`);
    console.log(`Date: ${today}`);
    
    // Check assignments
    const [assignments] = await connection.query(
      'SELECT * FROM driver_assignments WHERE driver_id = ? AND assigned_date = ?',
      [driverId, today]
    );
    
    console.log(`\nAssignments found: ${assignments.length}`);
    assignments.forEach(a => {
      console.log(`  - Schedule ${a.schedule_id}, Bus ${a.bus_id}, Status: ${a.status}`);
    });
    
    if (assignments.length > 0) {
      const scheduleId = assignments[0].schedule_id;
      console.log(`\nFetching schedule ${scheduleId}...`);
      
      const [schedule] = await connection.query(
        `SELECT s.*, r.origin, r.destination, r.distance, r.route_name,
                b.bus_number, b.number_plate, b.bus_type, b.current_lat, b.current_lng
         FROM schedules s
         LEFT JOIN routes r ON s.route_id = r.id
         LEFT JOIN buses b ON s.bus_id = b.id
         WHERE s.id = ?`,
        [scheduleId]
      );
      
      if (schedule.length > 0) {
        console.log(`✅ Schedule found:`);
        console.log(JSON.stringify(schedule[0], null, 2));
      } else {
        console.log(`❌ Schedule not found in database`);
      }
    }
    
    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debug();
