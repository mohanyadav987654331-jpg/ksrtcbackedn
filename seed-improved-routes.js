const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'ksrtc_smart_transport',
  connectionLimit: 5,
});

// Sample drivers list
const driverList = [
  { name: 'Rajesh Kumar', phone: '9876543210' },
  { name: 'Prakash Singh', phone: '9876543211' },
  { name: 'Suresh Patel', phone: '9876543212' },
  { name: 'Mohan Reddy', phone: '9876543213' },
  { name: 'Anil Sharma', phone: '9876543214' },
  { name: 'Vikas Gupta', phone: '9876543215' },
  { name: 'Ravi Kumar', phone: '9876543216' },
  { name: 'Pradeep Singh', phone: '9876543217' },
  { name: 'Sanjay Rao', phone: '9876543218' },
  { name: 'Krishna Murthy', phone: '9876543219' },
];

// Route definitions with stops
const routes = [
  {
    routeId: 'BLR-MYS-001',
    name: 'Bangalore - Mysore',
    origin: 'Bangalore',
    destination: 'Mysore',
    distance: 145,
    duration: 180,
    nonExpressInterval: 5,
    expressInterval: 15,
    nonExpressStops: ['Bangalore', 'Bidadi', 'Ramanagara', 'Channapatna', 'Maddur', 'Mandya', 'Mysore'],
    expressStops: ['Bangalore', 'Mysore']
  },
  {
    routeId: 'MYS-BLR-001',
    name: 'Mysore - Bangalore',
    origin: 'Mysore',
    destination: 'Bangalore',
    distance: 145,
    duration: 180,
    nonExpressInterval: 7,
    expressInterval: 15,
    nonExpressStops: ['Mysore', 'Mandya', 'Maddur', 'Channapatna', 'Ramanagara', 'Bidadi', 'Bangalore'],
    expressStops: ['Mysore', 'Bangalore']
  },
  {
    routeId: 'BLR-KOL-001',
    name: 'Bangalore - Kolar',
    origin: 'Bangalore',
    destination: 'Kolar',
    distance: 165,
    duration: 210,
    nonExpressInterval: 8,
    expressInterval: 20,
    nonExpressStops: ['Bangalore', 'Krupuram', 'Ramachandrapuram', 'Hosakeote', 'Kolar'],
    expressStops: ['Bangalore', 'Kolar']
  },
];

async function seedRoutes() {
  const connection = await pool.getConnection();
  
  try {
    // Get or insert drivers
    console.log('Loading/Creating drivers...');
    const driverInsertList = [];
    
    for (const driver of driverList) {
      const username = `driver_${driver.name.replace(/\s+/g, '_').toLowerCase()}`;
      const [existing] = await connection.query(
        `SELECT id FROM users WHERE username = ?`,
        [username]
      );
      
      if (existing.length > 0) {
        // Driver exists, use it
        driverInsertList.push({
          ...driver,
          id: existing[0].id
        });
      } else {
        // Create new driver
        const [result] = await connection.query(
          `INSERT INTO users (username, email, password_hash, full_name, phone, role, is_active) 
           VALUES (?, ?, ?, ?, ?, 'driver', 1)`,
          [
            username,
            `driver_${Date.now()}_${Math.random()}@srts.local`,
            'hashed_password', // placeholder
            driver.name,
            driver.phone
          ]
        );
        driverInsertList.push({
          ...driver,
          id: result.insertId
        });
      }
    }
    console.log(`✓ Loaded/Created ${driverInsertList.length} drivers`);

    // Get or create default depot
    console.log('Loading/Creating depot...');
    const [existingDepot] = await connection.query(
      `SELECT id FROM depots WHERE depot_name = 'Main Depot'`
    );
    
    let depotId;
    if (existingDepot.length > 0) {
      depotId = existingDepot[0].id;
    } else {
      const [depotResult] = await connection.query(
        `INSERT INTO depots (depot_name, location, is_active) VALUES (?, ?, 1)`,
        ['Main Depot', 'Bangalore']
      );
      depotId = depotResult.insertId;
    }
    console.log(`✓ Using depot ID: ${depotId}`);

    // Clear existing data
    await connection.query('DELETE FROM schedules');
    await connection.query('DELETE FROM buses');
    await connection.query('DELETE FROM route_stops');
    await connection.query('DELETE FROM routes');
    console.log('✓ Cleared existing routes and schedules');

    let routeCounter = 0;
    let busCounter = 0;
    let scheduleCounter = 0;
    for (const route of routes) {
      console.log(`\nSeeding route: ${route.name}`);
      
      // Insert route
      const [routeResult] = await connection.query(
        `INSERT INTO routes (route_id, route_name, origin, destination, distance, estimated_duration) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [route.routeId, route.name, route.origin, route.destination, route.distance, route.duration]
      );
      
      const routeDbId = routeResult.insertId;
      routeCounter++;

      // Insert stops with timings
      let stopOrder = 1;
      let currentMinutes = 0;
      
      for (const stopName of route.nonExpressStops) {
        await connection.query(
          `INSERT INTO route_stops (route_id, stop_name, latitude, longitude, stop_order, estimated_minutes_from_origin) 
           VALUES (?, ?, 0, 0, ?, ?)`,
          [route.routeId, stopName, stopOrder, currentMinutes]
        );
        
        // Calculate minutes to next stop (roughly 20-30 minutes per segment)
        if (stopOrder < route.nonExpressStops.length) {
          currentMinutes += Math.round(route.duration / (route.nonExpressStops.length - 1));
        }
        stopOrder++;
      }

      let driverIndex = 0;

      // Normal buses from 05:00 to 23:00
      if (route.nonExpressInterval) {
        let currentTime = 5 * 60; // Start at 05:00
        const endTime = 23 * 60; // End at 23:00

        while (currentTime <= endTime) {
          const depHour = Math.floor(currentTime / 60);
          const depMin = currentTime % 60;
          const arrTime = currentTime + route.duration;
          const arrHour = Math.floor(arrTime / 60) % 24;
          const arrMin = arrTime % 60;

          const busNumber = `KA01N${String(busCounter).padStart(5, '0')}`;
          const capacity = 50;
          const crowdLevel = Math.floor(Math.random() * 3) + 1;

          // Get driver from list
          const driver = driverInsertList[driverIndex % driverInsertList.length];
          driverIndex++;

          // Insert bus
          const [busResult] = await connection.query(
            `INSERT INTO buses (bus_number, bus_type, route_id, depot_id, capacity, driver_id, status) 
             VALUES (?, 'NORMAL', ?, ?, ?, ?, 'AVAILABLE')`,
            [busNumber, routeDbId, depotId, capacity, driver.id]
          );

          const busId = busResult.insertId;
          busCounter++;

          const daysOfWeek = 'MON,TUE,WED,THU,FRI,SAT,SUN';

          // Insert schedule with driver information
          await connection.query(
            `INSERT INTO schedules (route_id, bus_id, driver_id, departure_time, arrival_time, days_of_week, is_active) 
             VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [
              routeDbId,
              busId,
              driver.id,
              `${String(depHour).padStart(2, '0')}:${String(depMin).padStart(2, '0')}:00`,
              `${String(arrHour).padStart(2, '0')}:${String(arrMin).padStart(2, '0')}:00`,
              daysOfWeek
            ]
          );

          scheduleCounter++;
          currentTime += route.nonExpressInterval;
        }
      }

      // Express buses from 05:00 to 23:00
      if (route.expressInterval) {
        let currentTime = 5 * 60; // Start at 05:00
        const endTime = 23 * 60; // End at 23:00

        while (currentTime <= endTime) {
          const depHour = Math.floor(currentTime / 60);
          const depMin = currentTime % 60;
          const expressDuration = Math.round(route.duration * 0.7); // 30% faster
          const arrTime = currentTime + expressDuration;
          const arrHour = Math.floor(arrTime / 60) % 24;
          const arrMin = arrTime % 60;

          const busNumber = `KA01E${String(busCounter).padStart(5, '0')}`;
          const capacity = 45;
          const crowdLevel = Math.floor(Math.random() * 3) + 1;

          // Get driver from list
          const driver = driverInsertList[driverIndex % driverInsertList.length];
          driverIndex++;

          // Insert bus
          const [busResult] = await connection.query(
            `INSERT INTO buses (bus_number, bus_type, route_id, depot_id, capacity, driver_id, status) 
             VALUES (?, 'EXPRESS', ?, ?, ?, ?, 'AVAILABLE')`,
            [busNumber, routeDbId, depotId, capacity, driver.id]
          );

          const busId = busResult.insertId;
          busCounter++;

          const daysOfWeek = 'MON,TUE,WED,THU,FRI,SAT,SUN';

          // Insert schedule with driver information
          await connection.query(
            `INSERT INTO schedules (route_id, bus_id, driver_id, departure_time, arrival_time, days_of_week, is_active) 
             VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [
              routeDbId,
              busId,
              driver.id,
              `${String(depHour).padStart(2, '0')}:${String(depMin).padStart(2, '0')}:00`,
              `${String(arrHour).padStart(2, '0')}:${String(arrMin).padStart(2, '0')}:00`,
              daysOfWeek
            ]
          );

          scheduleCounter++;
          currentTime += route.expressInterval;
        }
      }

      console.log(`  ✓ Route added with buses and schedules`);
      console.log(`  - Time range: 05:00 - 23:00`);
      console.log(`  - Intervals: Normal=${route.nonExpressInterval}min, Express=${route.expressInterval}min`);
    }

    console.log('\n====== Seeding Complete ======');
    console.log(`Routes: ${routeCounter}`);
    console.log(`Buses: ${busCounter}`);
    console.log(`Schedules: ${scheduleCounter}`);
    console.log(`Drivers: ${driverInsertList.length}`);
    console.log(`All buses have driver assignments!`);

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    connection.release();
  }
}

seedRoutes()
  .then(() => {
    console.log('✓ Database seeding successful!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('✗ Database seeding failed:', error);
    process.exit(1);
  });
