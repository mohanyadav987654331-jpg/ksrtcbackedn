const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'ksrtc_smart_transport'
};

async function seedDriverAssignments() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');

    // Clear existing assignments
    await connection.query('DELETE FROM driver_assignments');
    console.log('Cleared existing driver assignments');

    // Get all drivers
    const [drivers] = await connection.query(`
      SELECT id, depot_id, full_name 
      FROM users 
      WHERE role = 'driver' 
      ORDER BY id
    `);

    console.log(`Found ${drivers.length} drivers`);

    // Assign ONE bus to each route (for consistency)
    const routeBusMap = {};
    const [routes] = await connection.query(`
      SELECT DISTINCT r.id, r.origin, r.destination
      FROM routes r
      ORDER BY r.id
    `);
    
    for (const route of routes) {
      const [buses] = await connection.query(`
        SELECT b.id, b.bus_number
        FROM buses b
        JOIN schedules s ON b.id = s.bus_id
        WHERE s.route_id = ?
        LIMIT 1
      `, [route.id]);
      
      if (buses.length > 0) {
        routeBusMap[route.id] = buses[0];
      }
    }

    console.log(`Mapped ${Object.keys(routeBusMap).length} routes to buses`);

    // Get all schedules with route info
    const [schedules] = await connection.query(`
      SELECT s.id, s.bus_id, s.route_id, s.departure_time, s.arrival_time,
             r.origin, r.destination, b.bus_number
      FROM schedules s
      JOIN routes r ON s.route_id = r.id
      JOIN buses b ON s.bus_id = b.id
      ORDER BY s.departure_time
    `);

    console.log(`Found ${schedules.length} schedules`);

    // Assign drivers to specific routes (1-2 routes per driver)
    const driverRouteAssignments = {};
    let driverIndex = 0;
    routes.forEach((route, index) => {
      const driver = drivers[driverIndex % drivers.length];
      if (!driverRouteAssignments[driver.id]) {
        driverRouteAssignments[driver.id] = [];
      }
      driverRouteAssignments[driver.id].push(route.id);
      
      if ((index + 1) % 2 === 0) {
        driverIndex++;
      }
    });

    console.log('\n=== DRIVER-ROUTE ASSIGNMENTS ===');
    drivers.forEach(driver => {
      if (driverRouteAssignments[driver.id]) {
        const routeNames = driverRouteAssignments[driver.id].map(routeId => {
          const route = routes.find(r => r.id === routeId);
          return route ? `${route.origin}→${route.destination}` : routeId;
        }).join(', ');
        console.log(`${driver.full_name}: ${routeNames}`);
      }
    });

    // Generate assignments for last 7 days and next 3 days
    const assignments = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 3);

    // Create assignments with round-robin and 5-minute cooldown logic
    let assignmentId = 1;
    const driverLastRouteTime = {}; // Track last time driver did each route

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const assignedDate = date.toISOString().split('T')[0];
      const isToday = assignedDate === today.toISOString().split('T')[0];
      const isPast = date < today;

      console.log(`Processing assignments for ${assignedDate}...`);

      // Get all schedules for this date, sorted by departure time
      let dateSchedules = schedules.slice().sort((a, b) => {
        const timeA = a.departure_time?.toString() || '';
        const timeB = b.departure_time?.toString() || '';
        return timeA.localeCompare(timeB);
      });

      // Use round-robin with cooldown
      let driverIndex = 0;
      dateSchedules.forEach(schedule => {
        let assigned = false;
        
        // Try to find a suitable driver
        for (let i = 0; i < drivers.length; i++) {
          const driver = drivers[(driverIndex + i) % drivers.length];
          const assignedRoutes = driverRouteAssignments[driver.id] || [];
          
          // Check if this driver's routes include this schedule's route
          if (assignedRoutes.includes(schedule.route_id)) {
            const driverKey = `${driver.id}`;
            if (!driverLastRouteTime[driverKey]) {
              driverLastRouteTime[driverKey] = {};
            }

            const routeKey = schedule.route_id;
            const lastTime = driverLastRouteTime[driverKey][routeKey];
            const scheduleTime = schedule.departure_time?.toString() || '00:00';

            // Check 5-minute cooldown
            let canAssign = true;
            if (lastTime) {
              const [lastH, lastM] = lastTime.split(':').map(Number);
              const [schedH, schedM] = scheduleTime.split(':').map(Number);
              const lastMinutes = lastH * 60 + lastM;
              const schedMinutes = schedH * 60 + schedM;
              const diff = schedMinutes - lastMinutes;
              
              if (diff < 5) {
                canAssign = false;
              }
            }

            if (canAssign) {
              let status = 'ASSIGNED';
              if (isPast) {
                status = 'COMPLETED';
              } else if (isToday) {
                const departureHour = parseInt(scheduleTime.split(':')[0] || '0');
                const currentHour = new Date().getHours();
                if (departureHour < currentHour) {
                  status = 'COMPLETED';
                } else if (departureHour === currentHour) {
                  status = 'IN_PROGRESS';
                }
              }

              // Use the consistent bus for this route
              const busByRoute = routeBusMap[schedule.route_id];
              const busId = busByRoute ? busByRoute.id : schedule.bus_id;

              assignments.push({
                id: assignmentId++,
                driver_id: driver.id,
                schedule_id: schedule.id,
                bus_id: busId,
                assigned_date: assignedDate,
                status: status,
                created_at: new Date(date.getTime() - 86400000)
              });

              // Update last time for this driver-route combo
              driverLastRouteTime[driverKey][routeKey] = scheduleTime;

              driverIndex = (driverIndex + i + 1) % drivers.length;
              assigned = true;
              break;
            }
          }
        }

        // If no suitable driver found (cooldown), assign to next available
        if (!assigned) {
          const driver = drivers[driverIndex % drivers.length];
          let status = 'ASSIGNED';
          if (isPast) {
            status = 'COMPLETED';
          } else if (isToday) {
            const departureHour = parseInt(schedule.departure_time?.toString().split(':')[0] || '0');
            const currentHour = new Date().getHours();
            if (departureHour < currentHour) {
              status = 'COMPLETED';
            } else if (departureHour === currentHour) {
              status = 'IN_PROGRESS';
            }
          }

          const busByRoute = routeBusMap[schedule.route_id];
          const busId = busByRoute ? busByRoute.id : schedule.bus_id;

          assignments.push({
            id: assignmentId++,
            driver_id: driver.id,
            schedule_id: schedule.id,
            bus_id: busId,
            assigned_date: assignedDate,
            status: status,
            created_at: new Date(date.getTime() - 86400000)
          });

          driverIndex = (driverIndex + 1) % drivers.length;
        }
      });
    }

    console.log(`Generated ${assignments.length} assignments`);

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

      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(assignments.length / batchSize)}`);
    }

    // Display detailed summary - showing sequential trips per driver
    const [todayAssignments] = await connection.query(`
      SELECT u.id as driver_id, u.full_name, da.status, b.bus_number, 
             r.origin, r.destination, s.departure_time, s.arrival_time,
             ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY s.departure_time) as trip_order
      FROM driver_assignments da
      JOIN users u ON da.driver_id = u.id
      JOIN buses b ON da.bus_id = b.id
      JOIN schedules s ON da.schedule_id = s.id
      JOIN routes r ON s.route_id = r.id
      WHERE da.assigned_date = CURDATE()
      ORDER BY u.full_name, s.departure_time
      LIMIT 150
    `);

    console.log('\n=== TODAY\'S TRIPS PER DRIVER (NO OVERLAPS) ===');
    let currentDriver = '';
    let tripCount = 0;
    todayAssignments.forEach(row => {
      if (row.full_name !== currentDriver) {
        if (currentDriver !== '') {
          console.log('');
        }
        currentDriver = row.full_name;
        tripCount = 0;
      }
      tripCount++;
      console.log(`  Trip #${tripCount} (${row.departure_time}-${row.arrival_time}): Bus ${row.bus_number} ${row.origin}→${row.destination} [${row.status}]`);
    });

    // Show counts by status
    const [statusCounts] = await connection.query(`
      SELECT status, COUNT(*) as count
      FROM driver_assignments
      WHERE assigned_date = CURDATE()
      GROUP BY status
    `);

    console.log('\n=== TODAY\'S STATUS COUNTS ===');
    statusCounts.forEach(row => {
      console.log(`${row.status}: ${row.count} trips`);
    });

    console.log('\n✅ Driver assignments seeded successfully!');

  } catch (error) {
    console.error('Error seeding driver assignments:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the seeding
seedDriverAssignments().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
