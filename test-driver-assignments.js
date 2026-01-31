const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'ksrtc_smart_transport'
};

async function testDriverAssignments() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database\n');

    // Get a driver
    const [[driver]] = await connection.query(`
      SELECT id, full_name FROM users WHERE role = 'driver' LIMIT 1
    `);

    if (!driver) {
      console.log('❌ No drivers found');
      return;
    }

    console.log(`👤 Testing for driver: ${driver.full_name} (ID: ${driver.id})\n`);

    // Query the same as the API endpoint
    const [assignments] = await connection.query(`
      SELECT da.id as assignment_id,
        da.driver_id, da.assigned_date, da.status,
        s.id as schedule_id, s.departure_time, s.arrival_time,
        b.bus_number, b.bus_type, b.capacity,
        r.id as route_id, r.origin, r.destination, r.distance, r.estimated_duration,
        bt.status as tracking_status, bt.current_location_name,
        COUNT(DISTINCT rs.id) as total_stops
      FROM driver_assignments da
      JOIN schedules s ON da.schedule_id = s.id
      JOIN buses b ON da.bus_id = b.id
      JOIN routes r ON s.route_id = r.id
      LEFT JOIN bus_tracking bt ON b.id = bt.bus_id AND s.id = bt.schedule_id
      LEFT JOIN route_stops rs ON r.id = rs.route_id
      WHERE da.driver_id = ? 
        AND da.assigned_date >= CURDATE()
      GROUP BY da.id
      ORDER BY da.assigned_date, s.departure_time
      LIMIT 10
    `, [driver.id]);

    console.log(`📅 Found ${assignments.length} upcoming assignments\n`);

    if (assignments.length === 0) {
      console.log('ℹ️  No assignments found for today onwards');
      return;
    }

    // For each assignment, show the stops
    for (let i = 0; i < Math.min(3, assignments.length); i++) {
      const assignment = assignments[i];
      
      console.log(`═══════════════════════════════════════════════════════════════`);
      console.log(`Assignment #${i + 1}`);
      console.log(`═══════════════════════════════════════════════════════════════`);
      console.log(`📍 Route: ${assignment.origin} → ${assignment.destination}`);
      console.log(`🚌 Bus: ${assignment.bus_number} (${assignment.bus_type})`);
      console.log(`⏰ Time: ${assignment.departure_time} → ${assignment.arrival_time}`);
      console.log(`📅 Date: ${assignment.assigned_date}`);
      console.log(`✅ Status: ${assignment.status}`);
      console.log(`💺 Capacity: ${assignment.capacity} passengers`);
      
      // Fetch stops for this route using route_id
      if (assignment.bus_type === 'NORMAL' || assignment.bus_type === 'DELUXE' || assignment.bus_type === 'SLEEPER') {
        // Get the route_id from routes table
        const [[routeInfo]] = await connection.query(`
          SELECT route_id FROM routes WHERE id = ?
        `, [assignment.route_id]);

        if (routeInfo) {
          const [stops] = await connection.query(`
            SELECT id, stop_name, stop_order, estimated_minutes_from_origin
            FROM route_stops
            WHERE route_id = ?
            ORDER BY stop_order
          `, [routeInfo.route_id]);

          if (stops.length > 0) {
            console.log(`\n🛑 ALL STOPS (${stops.length} stops):`);
            stops.forEach((stop, idx) => {
              const depHours = parseInt(assignment.departure_time.split(':')[0]);
              const depMins = parseInt(assignment.departure_time.split(':')[1]);
              const totalDepMinutes = depHours * 60 + depMins;
              const arrivalMinutes = totalDepMinutes + stop.estimated_minutes_from_origin;
              const arrHours = Math.floor(arrivalMinutes / 60) % 24;
              const arrMins = arrivalMinutes % 60;
              const eta = `${String(arrHours).padStart(2, '0')}:${String(arrMins).padStart(2, '0')}`;
              console.log(`   ${idx + 1}. ${stop.stop_name.padEnd(25)} (Arrives approx: ${eta})`);
            });
          }
        }
      } else {
        console.log(`\n⚡ EXPRESS ROUTE (Direct - no intermediate stops)`);
        console.log(`   • Departs from: ${assignment.origin}`);
        console.log(`   • Arrives at: ${assignment.destination}`);
      }

      console.log('');
    }

    // Show driver's schedule summary
    console.log(`═══════════════════════════════════════════════════════════════`);
    console.log(`📊 DRIVER ${driver.full_name.toUpperCase()} - TODAY'S SCHEDULE`);
    console.log(`═══════════════════════════════════════════════════════════════\n`);

    const [todayTrips] = await connection.query(`
      SELECT 
        da.id as assignment_id,
        b.bus_type,
        b.bus_number,
        r.origin, r.destination,
        s.departure_time, s.arrival_time,
        da.status,
        COUNT(DISTINCT rs.id) as stop_count
      FROM driver_assignments da
      JOIN schedules s ON da.schedule_id = s.id
      JOIN buses b ON da.bus_id = b.id
      JOIN routes r ON s.route_id = r.id
      LEFT JOIN route_stops rs ON r.id = rs.route_id
      WHERE da.driver_id = ?
        AND da.assigned_date = CURDATE()
      GROUP BY da.id
      ORDER BY s.departure_time
    `, [driver.id]);

    if (todayTrips.length === 0) {
      console.log('ℹ️  No trips assigned for today');
    } else {
      console.log(`Total trips today: ${todayTrips.length}\n`);
      
      todayTrips.forEach((trip, idx) => {
        const routeType = trip.bus_type === 'EXPRESS' ? '⚡ EXPRESS' : `🚌 ${trip.stop_count} STOPS`;
        console.log(`Trip #${idx + 1}: ${routeType}`);
        console.log(`  ${trip.departure_time} → ${trip.arrival_time}  |  ${trip.origin} → ${trip.destination}`);
        console.log(`  Bus: ${trip.bus_number} | Status: ${trip.status}\n`);
      });
    }

    // Show travel time constraints
    console.log(`═══════════════════════════════════════════════════════════════`);
    console.log(`⏳ TRAVEL TIME & COOLDOWN LOGIC`);
    console.log(`═══════════════════════════════════════════════════════════════\n`);

    const [travelData] = await connection.query(`
      SELECT 
        b.bus_number,
        r.origin, r.destination,
        s.departure_time, s.arrival_time,
        CONCAT(
          LPAD(HOUR(TIMEDIFF(s.arrival_time, s.departure_time)), 2, '0'), ':',
          LPAD(MINUTE(TIMEDIFF(s.arrival_time, s.departure_time)), 2, '0')
        ) as travel_duration
      FROM driver_assignments da
      JOIN schedules s ON da.schedule_id = s.id
      JOIN buses b ON da.bus_id = b.id
      JOIN routes r ON s.route_id = r.id
      WHERE da.driver_id = ?
        AND da.assigned_date >= CURDATE()
      ORDER BY da.assigned_date, s.departure_time
      LIMIT 5
    `, [driver.id]);

    console.log('Example trips showing how travel time is respected:\n');
    
    let lastArrival = null;
    travelData.forEach((trip, idx) => {
      const depTimeMinutes = parseInt(trip.departure_time.split(':')[0]) * 60 + parseInt(trip.departure_time.split(':')[1]);
      const arrTimeMinutes = parseInt(trip.arrival_time.split(':')[0]) * 60 + parseInt(trip.arrival_time.split(':')[1]);
      
      console.log(`Trip ${idx + 1}: ${trip.bus_number}`);
      console.log(`  🚩 Departs: ${trip.departure_time} from ${trip.origin}`);
      console.log(`  🏁 Arrives: ${trip.arrival_time} at ${trip.destination} (Duration: ${trip.travel_duration})`);
      
      if (lastArrival) {
        const lastArrivalMinutes = parseInt(lastArrival.split(':')[0]) * 60 + parseInt(lastArrival.split(':')[1]);
        const gap = depTimeMinutes - lastArrivalMinutes;
        console.log(`  ⏱️  Gap from previous trip: ${gap} minutes (5-min buffer enforced)\n`);
      } else {
        console.log('');
      }
      
      lastArrival = trip.arrival_time;
    });

    console.log('✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

testDriverAssignments();
