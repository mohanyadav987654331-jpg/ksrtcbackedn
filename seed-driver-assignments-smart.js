const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'ksrtc_smart_transport'
};

// Helper to convert time string HH:MM to minutes
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper to convert minutes to HH:MM
function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

async function seedSmartAssignments() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database\n');

    // Clear existing assignments
    await connection.query('DELETE FROM driver_assignments');
    console.log('🧹 Cleared existing driver assignments\n');

    // Get all drivers
    const [drivers] = await connection.query(`
      SELECT id, full_name FROM users 
      WHERE role = 'driver' 
      ORDER BY id
    `);
    console.log(`👥 Found ${drivers.length} drivers\n`);

    // Get all routes with their details
    const [routes] = await connection.query(`
      SELECT id, route_id, origin, destination 
      FROM routes 
      ORDER BY id
    `);
    console.log(`🛣️  Found ${routes.length} routes\n`);

    // Get all stops with route info
    const [stops] = await connection.query(`
      SELECT rs.id, rs.route_id, rs.stop_name, rs.stop_order, rs.estimated_minutes_from_origin,
             r.id as route_db_id, r.origin, r.destination
      FROM route_stops rs
      JOIN routes r ON rs.route_id = r.route_id
      ORDER BY rs.route_id, rs.stop_order
    `);

    // Group stops by route
    const stopsByRoute = {};
    stops.forEach(stop => {
      if (!stopsByRoute[stop.route_db_id]) {
        stopsByRoute[stop.route_db_id] = [];
      }
      stopsByRoute[stop.route_db_id].push(stop);
    });

    console.log(`📍 Loaded stops for ${Object.keys(stopsByRoute).length} routes\n`);

    // Get all schedules
    const [schedules] = await connection.query(`
      SELECT s.id, s.route_id, s.bus_id, s.departure_time, s.arrival_time,
             b.bus_number, b.bus_type, r.origin, r.destination
      FROM schedules s
      JOIN buses b ON s.bus_id = b.id
      JOIN routes r ON s.route_id = r.id
      WHERE s.is_active = 1
      ORDER BY s.departure_time
    `);

    console.log(`📅 Found ${schedules.length} schedules\n`);

    // Assign drivers to specific routes (2-3 routes per driver with variety of EXPRESS/NORMAL)
    const driverRouteAssignments = {};
    
    drivers.forEach((driver, driverIdx) => {
      const routesPerDriver = 2 + (driverIdx % 2); // 2 or 3 routes
      const assignedRoutes = [];
      
      for (let i = 0; i < routesPerDriver && i < routes.length; i++) {
        const routeIdx = (driverIdx * routesPerDriver + i) % routes.length;
        assignedRoutes.push({
          routeId: routes[routeIdx].id,
          routeCode: routes[routeIdx].route_id,
          origin: routes[routeIdx].origin,
          destination: routes[routeIdx].destination
        });
      }
      
      driverRouteAssignments[driver.id] = assignedRoutes;
    });

    console.log('=== DRIVER ROUTE ASSIGNMENTS ===\n');
    drivers.forEach(driver => {
      const routes = driverRouteAssignments[driver.id];
      console.log(`${driver.full_name}:`);
      routes.forEach(route => {
        console.log(`  • ${route.origin} → ${route.destination}`);
      });
      console.log('');
    });

    // Generate assignments
    const assignments = [];
    let assignmentId = 1;
    
    // Create assignments for past 7 days + next 3 days
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 3);

    console.log(`📆 Creating assignments from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}\n`);

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const assignedDate = date.toISOString().split('T')[0];
      const isToday = assignedDate === today.toISOString().split('T')[0];
      const isPast = new Date(date) < today;
      const currentHour = today.getHours();

      // Track driver's last trip end time on this date
      const driverLastTripEnd = {};

      // Sort schedules by departure time
      const dailySchedules = schedules.slice().sort((a, b) => {
        return timeToMinutes(a.departure_time) - timeToMinutes(b.departure_time);
      });

      let scheduleIndex = 0;
      let driverIndex = 0;

      for (const schedule of dailySchedules) {
        let assigned = false;
        let assignmentDetails = null;

        const depTimeMinutes = timeToMinutes(schedule.departure_time);
        const arrTimeMinutes = timeToMinutes(schedule.arrival_time || schedule.departure_time);
        
        // Calculate actual arrival (handle next-day arrivals)
        let tripDurationMinutes = arrTimeMinutes - depTimeMinutes;
        if (tripDurationMinutes < 0) {
          tripDurationMinutes += 24 * 60; // Next day arrival
        }

        // Try to assign to a driver who operates this route
        for (let i = 0; i < drivers.length; i++) {
          const driver = drivers[(driverIndex + i) % drivers.length];
          const driverRoutes = driverRouteAssignments[driver.id];
          
          // Check if driver operates this route
          const operatesRoute = driverRoutes.some(r => r.routeId === schedule.route_id);
          
          if (operatesRoute) {
            const driverKey = `${driver.id}_${assignedDate}`;
            const lastTripEnd = driverLastTripEnd[driverKey];

            // Check if driver can take this trip (5-minute buffer)
            let canAssign = true;
            if (lastTripEnd !== undefined) {
              const bufferMinutes = 5;
              if (depTimeMinutes < lastTripEnd + bufferMinutes) {
                canAssign = false;
              }
            }

            if (canAssign) {
              // Determine status
              let status = 'ASSIGNED';
              if (isPast) {
                status = 'COMPLETED';
              } else if (isToday) {
                if (depTimeMinutes < currentHour * 60) {
                  status = 'COMPLETED';
                } else if (depTimeMinutes >= currentHour * 60 && depTimeMinutes < (currentHour + 1) * 60) {
                  status = 'IN_PROGRESS';
                }
              }

              // Get route stops for non-express routes
              let routeStops = [];
              if (schedule.bus_type !== 'EXPRESS' && stopsByRoute[schedule.route_id]) {
                routeStops = stopsByRoute[schedule.route_id].map(stop => ({
                  name: stop.stop_name,
                  order: stop.stop_order,
                  minutesFromOrigin: stop.estimated_minutes_from_origin
                }));
              }

              assignmentDetails = {
                id: assignmentId++,
                driver_id: driver.id,
                schedule_id: schedule.id,
                bus_id: schedule.bus_id,
                assigned_date: assignedDate,
                status: status,
                created_at: new Date(date.getTime() - 86400000),
                displayInfo: {
                  driverName: driver.full_name,
                  busNumber: schedule.bus_number,
                  busType: schedule.bus_type,
                  origin: schedule.origin,
                  destination: schedule.destination,
                  departure: schedule.departure_time,
                  arrival: schedule.arrival_time,
                  stops: routeStops
                }
              };

              assignments.push(assignmentDetails);

              // Update driver's last trip end time
              driverLastTripEnd[driverKey] = depTimeMinutes + tripDurationMinutes;
              driverIndex = (driverIndex + i + 1) % drivers.length;
              assigned = true;
              break;
            }
          }
        }

        // If not assigned to preferred route, assign to any available driver (fallback)
        if (!assigned) {
          let driver = drivers[driverIndex % drivers.length];
          
          // Determine status
          let status = 'ASSIGNED';
          if (isPast) {
            status = 'COMPLETED';
          } else if (isToday) {
            if (depTimeMinutes < currentHour * 60) {
              status = 'COMPLETED';
            } else if (depTimeMinutes >= currentHour * 60 && depTimeMinutes < (currentHour + 1) * 60) {
              status = 'IN_PROGRESS';
            }
          }

          // Get route stops for non-express routes
          let routeStops = [];
          if (schedule.bus_type !== 'EXPRESS' && stopsByRoute[schedule.route_id]) {
            routeStops = stopsByRoute[schedule.route_id].map(stop => ({
              name: stop.stop_name,
              order: stop.stop_order,
              minutesFromOrigin: stop.estimated_minutes_from_origin
            }));
          }

          assignmentDetails = {
            id: assignmentId++,
            driver_id: driver.id,
            schedule_id: schedule.id,
            bus_id: schedule.bus_id,
            assigned_date: assignedDate,
            status: status,
            created_at: new Date(date.getTime() - 86400000),
            displayInfo: {
              driverName: driver.full_name,
              busNumber: schedule.bus_number,
              busType: schedule.bus_type,
              origin: schedule.origin,
              destination: schedule.destination,
              departure: schedule.departure_time,
              arrival: schedule.arrival_time,
              stops: routeStops
            }
          };

          assignments.push(assignmentDetails);
          driverIndex = (driverIndex + 1) % drivers.length;
        }
      }
    }

    console.log(`\n📊 Generated ${assignments.length} total assignments\n`);

    // Insert assignments in batches
    const batchSize = 100;
    for (let i = 0; i < assignments.length; i += batchSize) {
      const batch = assignments.slice(i, i + batchSize);
      const values = batch.map(a => [
        a.driver_id,
        a.schedule_id,
        a.bus_id,
        a.assigned_date,
        a.status,
        a.created_at
      ]);

      await connection.query(`
        INSERT INTO driver_assignments 
        (driver_id, schedule_id, bus_id, assigned_date, status, created_at)
        VALUES ?
      `, [values]);

      console.log(`✓ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(assignments.length / batchSize)}`);
    }

    // Display today's schedule
    const today_iso = new Date().toISOString().split('T')[0];
    const [todayTrips] = await connection.query(`
      SELECT 
        u.full_name,
        b.bus_number,
        b.bus_type,
        r.origin,
        r.destination,
        s.departure_time,
        s.arrival_time,
        da.status,
        ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY s.departure_time) as trip_number
      FROM driver_assignments da
      JOIN users u ON da.driver_id = u.id
      JOIN buses b ON da.bus_id = b.id
      JOIN schedules s ON da.schedule_id = s.id
      JOIN routes r ON s.route_id = r.id
      WHERE da.assigned_date = ?
      ORDER BY u.full_name, s.departure_time
      LIMIT 200
    `, [today_iso]);

    if (todayTrips.length > 0) {
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('TODAY\'S DRIVER ASSIGNMENTS (with travel time respect)');
      console.log('═══════════════════════════════════════════════════════════════\n');

      let currentDriver = '';
      let tripCount = 0;

      for (const trip of todayTrips) {
        if (trip.full_name !== currentDriver) {
          if (currentDriver !== '') console.log('');
          currentDriver = trip.full_name;
          tripCount = 0;
          console.log(`👤 ${trip.full_name}`);
          console.log('───────────────────────────────────────────────────────────────');
        }

        tripCount++;
        const routeType = trip.bus_type === 'EXPRESS' ? '⚡ EXPRESS' : '🚌 NORMAL';
        console.log(`  Trip #${tripCount} | ${routeType} | Bus: ${trip.bus_number}`);
        console.log(`            ${trip.departure_time} → ${trip.arrival_time}`);
        console.log(`            ${trip.origin} → ${trip.destination}`);
        console.log(`            Status: ${trip.status}\n`);
      }
    }

    // Show assignment statistics
    const [stats] = await connection.query(`
      SELECT 
        assigned_date,
        status,
        COUNT(*) as count,
        COUNT(DISTINCT driver_id) as driver_count
      FROM driver_assignments
      WHERE assigned_date = ?
      GROUP BY assigned_date, status
      ORDER BY status
    `, [today_iso]);

    if (stats.length > 0) {
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('TODAY\'S STATISTICS');
      console.log('═══════════════════════════════════════════════════════════════\n');

      let totalTrips = 0;
      stats.forEach(stat => {
        totalTrips += stat.count;
        console.log(`${stat.status.padEnd(15)}: ${stat.count.toString().padStart(3)} trips (${stat.driver_count} drivers)`);
      });
      console.log(`${'TOTAL'.padEnd(15)}: ${totalTrips.toString().padStart(3)} trips`);
    }

    console.log('\n✅ Smart driver assignments seeded successfully!');
    console.log('✨ Features:');
    console.log('   • Travel time respected (5-min buffer between trips)');
    console.log('   • Express routes: Direct (no stops listed)');
    console.log('   • Normal routes: All stops displayed');
    console.log('   • Drivers get both EXPRESS and NORMAL routes');

  } catch (error) {
    console.error('❌ Error seeding driver assignments:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

seedSmartAssignments().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
