const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'ksrtc_smart_transport'
};

async function assignTripsToTestDriver() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    const testDriverId = 135; // From previous script
    const today = new Date().toISOString().slice(0, 10);
    
    // Get existing depot
    const [depots] = await connection.query('SELECT id FROM depots LIMIT 1');
    const depotId = depots[0].id;
    
    // Get some schedules for today
    const [schedules] = await connection.query(
      `SELECT s.id, COALESCE(s.bus_id, b.id) as bus_id, s.departure_time
       FROM schedules s
       LEFT JOIN buses b ON b.route_id = s.route_id
       LIMIT 5`
    );
    
    if (schedules.length === 0) {
      console.log('No schedules found!');
      return;
    }
    
    console.log(`Creating ${schedules.length} trip assignments for test driver...`);
    
    for (const schedule of schedules) {
      if (!schedule.bus_id) {
        console.log(`  ⚠️  No bus for schedule ${schedule.id}`);
        continue;
      }
      
      const status = 'ASSIGNED';
      
      try {
        const [result] = await connection.query(
          `INSERT INTO driver_assignments 
           (driver_id, schedule_id, bus_id, depot_id, assigned_date, status) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [testDriverId, schedule.id, schedule.bus_id, depotId, today, status]
        );
        console.log(`  ✅ ${schedule.departure_time}: Schedule ${schedule.id}`);
      } catch (error) {
        // Skip duplicates
        if (error.code !== 'ER_DUP_ENTRY') {
          throw error;
        }
      }
    }
    
    // Count total
    const [count] = await connection.query(
      'SELECT COUNT(*) as count FROM driver_assignments WHERE driver_id = ? AND assigned_date = ?',
      [testDriverId, today]
    );
    
    console.log(`\n✅ Total trips assigned: ${count[0].count}`);
    
    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

assignTripsToTestDriver();
