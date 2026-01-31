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

    // Get all unique routes first
    const [routes] = await connection.query(`
      SELECT DISTINCT id, origin, destination FROM routes ORDER BY id
    `);
    
    console.log(`Found ${routes.length} unique routes`);

    // Assign ONE bus to each route (for consistency)
    const routeBusMap = {};
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

    // Get all schedules
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

    // Generate assignments with round-robin and 5-minute cooldown
    const assignments = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 3);

    let assignmentId = 1;
    const driverLastRouteTime = {};

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const assignedDate = date.toISOString().split('T')[0];
      const isToday = assignedDate === today.toISOString().split('T')[0];
      const isPast = date < today;

      console.log(`Processing assignments for ${assignedDate}...`);

      let dateSchedules = schedules.slice().sort((a, b) => {
        const timeA = a.departure_time?.toString() || '';
        const timeB = b.departure_time?.toString() || '';
        return timeA.localeCompare(timeB);
      });

      let driverIdx = 0;
      dateSchedules.forEach(schedule => {
        let assigned = false;
        
        for (let i = 0; i < drivers.length; i++) {
          const driver = drivers[(driverIdx + i) % drivers.length];
          const assignedRoutes = driverRouteAssignments[driver.id] || [];
          
          if (assignedRoutes.includes(schedule.route_id)) {
            const driverKey = `${driver.id}`;
            if (!driverLastRouteTime[driverKey]) {
              driverLastRouteTime[driverKey] = {};
            }

            const routeKey = schedule.route_id;
            const lastTime = driverLastRouteTime[driverKey][routeKey];
            const scheduleTime = schedule.departure_time?.toString() || '00:00';

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

              driverLastRouteTime[driverKey][routeKey] = scheduleTime;
              driverIdx = (driverIdx + i + 1) % drivers.length;
              assigned = true;
              break;
            }
          }
        }

        if (!assigned) {
          const driver = drivers[driverIdx % drivers.length];
          const scheduleTime = schedule.departure_time?.toString() || '00:00';
          
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

          driverIdx = (driverIdx + 1) % drivers.length;
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

    // Display summary
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
      LIMIT 100
    `);

    console.log('\n=== TODAY\'S TRIPS PER DRIVER (WITH 5-MIN COOLDOWN) ===');
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

seedDriverAssignments().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
