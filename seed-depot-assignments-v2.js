const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'ksrtc_smart_transport'
};

async function seedDepotBasedAssignmentsV2() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database\n');

    // Get all depots
    const [depots] = await connection.query('SELECT id, depot_name FROM depots ORDER BY id');
    console.log(`🏢 Found ${depots.length} depots\n`);

    // Get all routes (these will have depot_id NULL, we'll assign them)
    const [routes] = await connection.query(`
      SELECT id, route_id, origin, destination, distance, estimated_duration
      FROM routes
      ORDER BY id
    `);
    console.log(`🛣️  Found ${routes.length} routes\n`);

    // Get drivers
    const [drivers] = await connection.query(`
      SELECT id, full_name FROM users WHERE role = 'driver'
    `);
    console.log(`👥 Found ${drivers.length} drivers\n`);

    // Clear existing data
    await connection.query('DELETE FROM driver_assignments');
    await connection.query('DELETE FROM schedules');
    await connection.query('DELETE FROM buses');
    
    console.log('🧹 Cleared existing assignments\n');

    // Assign drivers to depots and routes based on origin
    console.log('=== DEPOT-BASED DRIVER ASSIGNMENTS ===\n');

    const driverToDepot = {};
    let driverIndex = 0;

    // First pass: Group routes by origin (depot-like location)
    const routesByOrigin = {};
    for (const route of routes) {
      if (!routesByOrigin[route.origin]) {
        routesByOrigin[route.origin] = [];
      }
      routesByOrigin[route.origin].push(route);
    }

    console.log(`📍 Routes grouped by origin (${Object.keys(routesByOrigin).length} locations)\n`);

    // Assign drivers to depots
    const depotIndex = {};
    for (const depot of depots) {
      depotIndex[depot.id] = depot;
    }

    // Create a mapping of driver to depot
    for (let i = 0; i < drivers.length; i++) {
      const depotId = depots[i % depots.length].id;
      driverToDepot[drivers[i].id] = {
        depotId: depotId,
        depotName: depotIndex[depotId].depot_name,
        driverName: drivers[i].full_name
      };
    }

    // Display assignments
    for (const depot of depots) {
      const assignedDrivers = Object.entries(driverToDepot)
        .filter(([_, d]) => d.depotId === depot.id)
        .map(([_, d]) => d.driverName);
      
      if (assignedDrivers.length > 0) {
        console.log(`${depot.depot_name}: ${assignedDrivers.join(', ')}`);
      }
    }

    console.log('\n=== CREATING SCHEDULES & ASSIGNMENTS ===\n');

    // Update drivers' depot_id
    for (const [driverId, depotInfo] of Object.entries(driverToDepot)) {
      await connection.query(
        'UPDATE users SET depot_id = ? WHERE id = ?',
        [depotInfo.depotId, parseInt(driverId)]
      );
    }

    // Create buses and schedules for each route
    let totalBuses = 0;
    let totalSchedules = 0;

    for (const route of routes) {
      // Assign to a depot based on route origin
      const depotForRoute = depots.find(d => d.depot_name.toLowerCase().includes(route.origin.toLowerCase())) || depots[0];

      // Get drivers for this depot
      const depotDrivers = Object.entries(driverToDepot)
        .filter(([_, d]) => d.depotId === depotForRoute.id)
        .map(([driverId, _]) => parseInt(driverId));

      if (depotDrivers.length === 0) continue;

      // Create 2-3 buses per route
      const busesPerRoute = 2 + (Math.random() > 0.5 ? 1 : 0);

      for (let busIdx = 0; busIdx < busesPerRoute; busIdx++) {
        const busNumber = `KA-${String(5000 + totalBuses).slice(-4)}`;
        totalBuses++;

        const busType = busIdx === 0 ? 'EXPRESS' : 'NORMAL';
        const assignedDriver = depotDrivers[busIdx % depotDrivers.length];

        // Create bus
        const [busResult] = await connection.query(`
          INSERT INTO buses (bus_number, bus_type, route_id, depot_id, capacity, driver_id, status)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [busNumber, busType, route.id, depotForRoute.id, 50, assignedDriver, 'AVAILABLE']);

        const busId = busResult.insertId;

        // Create 5-6 schedules per day for this bus
        const departureHours = [5, 8, 11, 14, 17, 20];

        for (const hour of departureHours) {
          const depTime = `${String(hour).padStart(2, '0')}:00:00`;
          const arrivalMinutes = hour * 60 + route.estimated_duration;
          const arrHour = Math.floor(arrivalMinutes / 60) % 24;
          const arrMin = arrivalMinutes % 60;
          const arrTime = `${String(arrHour).padStart(2, '0')}:${String(arrMin).padStart(2, '0')}:00`;

          const [schedResult] = await connection.query(`
            INSERT INTO schedules (route_id, bus_id, driver_id, depot_id, departure_time, arrival_time, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 1)
          `, [route.id, busId, assignedDriver, depotForRoute.id, depTime, arrTime]);

          totalSchedules++;
        }
      }
    }

    console.log(`✓ Created ${totalBuses} buses`);
    console.log(`✓ Created ${totalSchedules} schedules\n`);

    // Now create driver assignments
    console.log('=== CREATING DRIVER ASSIGNMENTS ===\n');

    const [allSchedules] = await connection.query(`
      SELECT s.id, s.bus_id, s.route_id, s.driver_id, s.departure_time, s.arrival_time, 
             s.depot_id, r.origin, r.destination, r.distance, r.estimated_duration,
             b.bus_type
      FROM schedules s
      JOIN buses b ON s.bus_id = b.id
      JOIN routes r ON s.route_id = r.id
      WHERE s.driver_id IS NOT NULL
      ORDER BY s.depot_id, s.departure_time
    `);

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 3);

    const driverLastTripEnd = {};
    let assignmentCount = 0;

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const assignedDate = date.toISOString().split('T')[0];
      const isPast = date < today;
      const currentHour = today.getHours();

      for (const schedule of allSchedules) {
        const depTimeMinutes = parseInt(schedule.departure_time.split(':')[0]) * 60 + 
                              parseInt(schedule.departure_time.split(':')[1]);
        const arrTimeMinutes = parseInt(schedule.arrival_time.split(':')[0]) * 60 + 
                              parseInt(schedule.arrival_time.split(':')[1]);
        
        let tripDuration = arrTimeMinutes - depTimeMinutes;
        if (tripDuration < 0) tripDuration += 24 * 60;

        const driverKey = `${schedule.driver_id}_${assignedDate}`;
        const lastTripEnd = driverLastTripEnd[driverKey];

        // Check travel time buffer (5 minutes)
        let canAssign = true;
        if (lastTripEnd !== undefined && depTimeMinutes < lastTripEnd + 5) {
          canAssign = false;
        }

        if (canAssign) {
          let status = 'ASSIGNED';
          if (isPast) {
            status = 'COMPLETED';
          } else {
            const depHour = parseInt(schedule.departure_time.split(':')[0]);
            if (depHour < currentHour) {
              status = 'COMPLETED';
            } else if (depHour === currentHour) {
              status = 'IN_PROGRESS';
            }
          }

          await connection.query(`
            INSERT INTO driver_assignments 
            (driver_id, schedule_id, bus_id, assigned_date, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [schedule.driver_id, schedule.id, schedule.bus_id, assignedDate, status, new Date()]);

          driverLastTripEnd[driverKey] = depTimeMinutes + tripDuration;
          assignmentCount++;
        }
      }
    }

    console.log(`✓ Created ${assignmentCount} driver assignments\n`);

    // Show summary by depot
    console.log('=== SUMMARY BY DEPOT ===\n');

    for (const depot of depots) {
      const [depotStats] = await connection.query(`
        SELECT 
          COUNT(DISTINCT da.driver_id) as driver_count,
          COUNT(DISTINCT b.bus_number) as bus_count,
          COUNT(DISTINCT b.id) as total_buses,
          COUNT(*) as total_assignments,
          SUM(CASE WHEN da.status = 'ASSIGNED' THEN 1 ELSE 0 END) as assigned_count,
          SUM(CASE WHEN da.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as in_progress_count,
          SUM(CASE WHEN da.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_count
        FROM driver_assignments da
        JOIN buses b ON da.bus_id = b.id
        WHERE b.depot_id = ? AND da.assigned_date = CURDATE()
      `, [depot.id]);

      if (depotStats.length > 0 && depotStats[0].driver_count > 0) {
        const stat = depotStats[0];
        console.log(`📍 ${depot.depot_name}`);
        console.log(`   👥 Drivers: ${stat.driver_count} | 🚌 Buses: ${stat.total_buses} | 📊 Trips: ${stat.total_assignments}`);
        console.log(`   ✅ Assigned: ${stat.assigned_count} | ⏳ In Progress: ${stat.in_progress_count} | ✓ Completed: ${stat.completed_count}\n`);
      }
    }

    // Example: Show a sample depot view if it exists
    console.log('=== EXAMPLE DEPOT ADMIN VIEW ===\n');

    const [firstDepot] = await connection.query('SELECT id FROM depots LIMIT 1');

    if (firstDepot.length > 0) {
      const depotId = firstDepot[0].id;
      const [depotView] = await connection.query(`
        SELECT 
          u.full_name as driver_name,
          b.bus_number,
          b.bus_type,
          r.origin, r.destination,
          r.distance, r.estimated_duration,
          s.departure_time, s.arrival_time,
          da.status,
          COUNT(DISTINCT rs.id) as stop_count
        FROM driver_assignments da
        JOIN users u ON da.driver_id = u.id
        JOIN buses b ON da.bus_id = b.id
        JOIN schedules s ON da.schedule_id = s.id
        JOIN routes r ON s.route_id = r.id
        LEFT JOIN route_stops rs ON r.route_id = rs.route_id
        WHERE b.depot_id = ?
          AND da.assigned_date = CURDATE()
        GROUP BY da.id
        ORDER BY u.full_name, s.departure_time
        LIMIT 25
      `, [depotId]);

      if (depotView.length > 0) {
        console.log(`📋 Sample Depot Schedule (${depotView.length} trips):\n`);
        
        let currentDriver = '';
        depotView.forEach(row => {
          if (row.driver_name !== currentDriver) {
            if (currentDriver !== '') console.log('');
            currentDriver = row.driver_name;
            console.log(`👤 ${row.driver_name}`);
          }
          const routeType = row.bus_type === 'EXPRESS' ? '⚡' : `🚌 (${row.stop_count} stops)`;
          console.log(`   ${row.departure_time}-${row.arrival_time} | ${routeType} | ${row.origin}→${row.destination} | ${row.distance}km`);
        });
        console.log('');
      }
    }

    console.log('✅ Depot-based assignments seeded successfully!\n');
    console.log('✨ Features:');
    console.log('   • Drivers assigned to specific depots');
    console.log('   • Geographic route logic');
    console.log('   • Travel time respected (5-min buffer)');
    console.log('   • Express and Normal routes');
    console.log('   • Depot admins can manage their location');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

seedDepotBasedAssignmentsV2().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
