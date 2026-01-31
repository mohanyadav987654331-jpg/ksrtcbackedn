const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'ksrtc_smart_transport',
  connectionLimit: 5,
});

// Route definitions with stops
const routes = [
  // 1. Bangalore-Mysore
  {
    routeId: 'BLR-MYS-001',
    name: 'Bangalore - Mysore',
    origin: 'Bangalore',
    destination: 'Mysore',
    distance: 145,
    duration: 180,
    nonExpressInterval: 5, // minutes
    expressInterval: 15,
    nonExpressStops: ['Bangalore', 'Bidadi', 'Ramanagara', 'Channapatna', 'Maddur', 'Mandya', 'Mysore'],
    expressStops: ['Bangalore', 'Mysore']
  },
  // 2. Mysore-Bangalore
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
  // 3. Bangalore-Kollegal
  {
    routeId: 'BLR-KOL-001',
    name: 'Bangalore - Kollegal',
    origin: 'Bangalore',
    destination: 'Kollegal',
    distance: 165,
    duration: 210,
    nonExpressInterval: 8,
    expressInterval: 20,
    nonExpressStops: ['Bangalore', 'Banashankari', 'Harohalli', 'Kanakapura', 'Maddur', 'Kollegal'],
    expressStops: ['Bangalore', 'Kanakapura', 'Kollegal']
  },
  // 4. Kollegal-Mysore
  {
    routeId: 'KOL-MYS-001',
    name: 'Kollegal - Mysore',
    origin: 'Kollegal',
    destination: 'Mysore',
    distance: 95,
    duration: 120,
    nonExpressInterval: 5,
    expressInterval: 15,
    nonExpressStops: ['Kollegal', 'Maddur', 'Kanakapura', 'Harohalli', 'Banashankari', 'Mysore'],
    expressStops: ['Kollegal', 'Kanakapura', 'Mysore']
  },
  // 5. Bangalore-Hosur
  {
    routeId: 'BLR-HOS-001',
    name: 'Bangalore - Hosur',
    origin: 'Bangalore',
    destination: 'Hosur',
    distance: 45,
    duration: 75,
    nonExpressInterval: 10,
    expressInterval: 25,
    nonExpressStops: ['Bangalore', 'Shivajinagar', 'Koramangala', 'St Johns', 'Ropenahagara', 'Electronic City', 'Attibele', 'Hosur'],
    expressStops: ['Bangalore', 'Ropenahagara', 'Hosur']
  },
  // 6. Hosur-Bangalore
  {
    routeId: 'HOS-BLR-001',
    name: 'Hosur - Bangalore',
    origin: 'Hosur',
    destination: 'Bangalore',
    distance: 45,
    duration: 75,
    nonExpressInterval: 10,
    expressInterval: 25,
    nonExpressStops: ['Hosur', 'Attibele', 'Electronic City', 'Ropenahagara', 'St Johns', 'Koramangala', 'Shivajinagar', 'Bangalore'],
    expressStops: ['Hosur', 'Ropenahagara', 'Bangalore']
  },
  // 7. Bangalore-Kolar
  {
    routeId: 'BLR-KOL-002',
    name: 'Bangalore - Kolar',
    origin: 'Bangalore',
    destination: 'Kolar',
    distance: 68,
    duration: 90,
    nonExpressInterval: 10,
    expressInterval: 30,
    nonExpressStops: ['Bangalore', 'Ramamurthy Nagar', 'KR Puram', 'Hoskote', 'Dasarahalli', 'Yelahanka', 'Kondajanahalli', 'Kolar'],
    expressStops: ['Bangalore', 'KR Puram', 'Hoskote', 'Kolar']
  },
  // 8. Kolar-Bangalore
  {
    routeId: 'KOL-BLR-002',
    name: 'Kolar - Bangalore',
    origin: 'Kolar',
    destination: 'Bangalore',
    distance: 68,
    duration: 90,
    nonExpressInterval: 15,
    expressInterval: 30,
    nonExpressStops: ['Kolar', 'Kondajanahalli', 'Yelahanka', 'Dasarahalli', 'Hoskote', 'KR Puram', 'Ramamurthy Nagar', 'Bangalore'],
    expressStops: ['Kolar', 'Hoskote', 'KR Puram', 'Bangalore']
  },
  // 9. Kanakapura-Harohalli
  {
    routeId: 'KAN-HAR-001',
    name: 'Kanakapura - Harohalli',
    origin: 'Kanakapura',
    destination: 'Harohalli',
    distance: 25,
    duration: 35,
    nonExpressInterval: 15,
    expressInterval: null,
    nonExpressStops: ['Kanakapura', 'Harohalli'],
    expressStops: []
  },
  // 10. Kanakapura-Bangalore
  {
    routeId: 'KAN-BLR-001',
    name: 'Kanakapura - Bangalore',
    origin: 'Kanakapura',
    destination: 'Bangalore',
    distance: 55,
    duration: 80,
    nonExpressInterval: 15,
    expressInterval: null,
    nonExpressStops: ['Kanakapura', 'Harohalli', 'Kagalipura', 'Sulk', 'Talaghattapura', 'JP Nagar', 'Banashankari', 'Bangalore'],
    expressStops: []
  },
  // 11. Bangalore-Kanakapura
  {
    routeId: 'BLR-KAN-001',
    name: 'Bangalore - Kanakapura',
    origin: 'Bangalore',
    destination: 'Kanakapura',
    distance: 55,
    duration: 80,
    nonExpressInterval: 15,
    expressInterval: null,
    nonExpressStops: ['Bangalore', 'Banashankari', 'JP Nagar', 'Talaghattapura', 'Sulk', 'Kagalipura', 'Harohalli', 'Kanakapura'],
    expressStops: []
  },
  // 12. Mysore-Ramanagara
  {
    routeId: 'MYS-RAM-001',
    name: 'Mysore - Ramanagara',
    origin: 'Mysore',
    destination: 'Ramanagara',
    distance: 95,
    duration: 110,
    nonExpressInterval: 15,
    expressInterval: null,
    nonExpressStops: ['Mysore', 'Mandya', 'Maddur', 'Channapatna', 'Ramanagara'],
    expressStops: []
  },
  // 13. Ramanagara-Mysore
  {
    routeId: 'RAM-MYS-001',
    name: 'Ramanagara - Mysore',
    origin: 'Ramanagara',
    destination: 'Mysore',
    distance: 95,
    duration: 110,
    nonExpressInterval: 25,
    expressInterval: null,
    nonExpressStops: ['Ramanagara', 'Channapatna', 'Maddur', 'Mandya', 'Mysore'],
    expressStops: []
  },
  // 14. Ramanagara-Bidadi
  {
    routeId: 'RAM-BID-001',
    name: 'Ramanagara - Bidadi',
    origin: 'Ramanagara',
    destination: 'Bidadi',
    distance: 22,
    duration: 30,
    nonExpressInterval: 25,
    expressInterval: null,
    nonExpressStops: ['Ramanagara', 'Bidadi'],
    expressStops: []
  },
  // 15. Bidadi-Ramanagara
  {
    routeId: 'BID-RAM-001',
    name: 'Bidadi - Ramanagara',
    origin: 'Bidadi',
    destination: 'Ramanagara',
    distance: 22,
    duration: 30,
    nonExpressInterval: 25,
    expressInterval: null,
    nonExpressStops: ['Bidadi', 'Ramanagara'],
    expressStops: []
  },
  // 16. Bangalore-Maddur
  {
    routeId: 'BLR-MAD-001',
    name: 'Bangalore - Maddur',
    origin: 'Bangalore',
    destination: 'Maddur',
    distance: 95,
    duration: 120,
    nonExpressInterval: 15,
    expressInterval: 20,
    nonExpressStops: ['Bangalore', 'Bidadi', 'Ramanagara', 'Channapatna', 'Maddur'],
    expressStops: ['Bangalore', 'Ramanagara', 'Maddur']
  },
  // 17. Mysore-Srirangapatna
  {
    routeId: 'MYS-SRP-001',
    name: 'Mysore - Srirangapatna',
    origin: 'Mysore',
    destination: 'Srirangapatna',
    distance: 18,
    duration: 25,
    nonExpressInterval: 5,
    expressInterval: null,
    nonExpressStops: ['Mysore', 'Srirangapatna'],
    expressStops: []
  },
  // 18. Srirangapatna-Mysore
  {
    routeId: 'SRP-MYS-001',
    name: 'Srirangapatna - Mysore',
    origin: 'Srirangapatna',
    destination: 'Mysore',
    distance: 18,
    duration: 25,
    nonExpressInterval: 15,
    expressInterval: null,
    nonExpressStops: ['Srirangapatna', 'Mysore'],
    expressStops: []
  },
  // 19. Bangalore-Tumkur (Special days only)
  {
    routeId: 'BLR-TUM-001',
    name: 'Bangalore - Tumkur',
    origin: 'Bangalore',
    destination: 'Tumkur',
    distance: 70,
    duration: 90,
    nonExpressInterval: null,
    expressInterval: 15,
    nonExpressStops: [],
    expressStops: ['Bangalore', 'Tumkur'],
    specialDays: ['TUE', 'WED', 'THU', 'SAT', 'SUN']
  },
  // 20. Tumkur-Bangalore (Special days only)
  {
    routeId: 'TUM-BLR-001',
    name: 'Tumkur - Bangalore',
    origin: 'Tumkur',
    destination: 'Bangalore',
    distance: 70,
    duration: 90,
    nonExpressInterval: null,
    expressInterval: 20,
    nonExpressStops: [],
    expressStops: ['Tumkur', 'Bangalore'],
    specialDays: ['SUN', 'TUE', 'WED', 'THU', 'SAT']
  }
];

async function seedRoutes() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🌱 Starting comprehensive route seeding...\n');

    await connection.query('USE ksrtc_smart_transport');

    // Clear existing data
    await connection.query('DELETE FROM schedules');
    await connection.query('DELETE FROM buses');
    await connection.query('DELETE FROM route_stops');
    await connection.query('DELETE FROM routes WHERE route_id LIKE "BLR%" OR route_id LIKE "MYS%" OR route_id LIKE "KOL%" OR route_id LIKE "HOS%" OR route_id LIKE "KAN%" OR route_id LIKE "RAM%" OR route_id LIKE "BID%" OR route_id LIKE "SRP%" OR route_id LIKE "TUM%"');
    
    console.log('✓ Cleared existing data');

    // Get depot
    const [depots] = await connection.query('SELECT id FROM depots LIMIT 1');
    const depotId = depots[0]?.id || 1;

    // Get drivers
    const [drivers] = await connection.query('SELECT id FROM users WHERE role = "driver"');
    if (drivers.length === 0) {
      console.log('Creating test drivers...');
      for (let i = 1; i <= 10; i++) {
        await connection.query(
          'INSERT INTO users (username, email, password_hash, full_name, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
          [`driver${i}`, `driver${i}@ksrtc.com`, 'hashed', `Driver ${i}`, `90000000${String(i).padStart(2, '0')}`, 'driver']
        );
      }
      var [newDrivers] = await connection.query('SELECT id FROM users WHERE role = "driver"');
      var driverList = newDrivers;
    } else {
      var driverList = drivers;
    }

    let busCounter = 1;
    let scheduleCounter = 0;
    let driverIndex = 0;

    // Process each route
    for (const route of routes) {
      console.log(`\n📍 Processing: ${route.name}`);

      // Insert route
      const [routeResult] = await connection.query(
        `INSERT INTO routes (route_id, route_name, origin, destination, distance, estimated_duration, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [route.routeId, route.name, route.origin, route.destination, route.distance, route.duration]
      );

      const routeDbId = routeResult.insertId;

      // Insert non-express stops with coordinates (mock coordinates)
      if (route.nonExpressStops.length > 0) {
        for (let i = 0; i < route.nonExpressStops.length; i++) {
          const stopName = route.nonExpressStops[i];
          const lat = 12.9 + (i * 0.1);
          const lng = 77.5 + (i * 0.1);
          const estimatedMinutes = Math.round((route.duration / route.nonExpressStops.length) * i);
          
          await connection.query(
            `INSERT INTO route_stops (route_id, stop_name, latitude, longitude, stop_order, estimated_minutes_from_origin) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [route.routeId, stopName, lat, lng, i + 1, estimatedMinutes]
          );
        }
      }

      // Generate schedules from 5:00 AM to 11:00 PM
      const startHour = 5;
      const endHour = 23;
      
      // Non-express buses
      if (route.nonExpressInterval) {
        let currentTime = startHour * 60; // minutes from midnight
        const endTime = endHour * 60;

        while (currentTime <= endTime) {
          const depHour = Math.floor(currentTime / 60);
          const depMin = currentTime % 60;
          const arrTime = currentTime + route.duration;
          const arrHour = Math.floor(arrTime / 60) % 24;
          const arrMin = arrTime % 60;

          const busNumber = `KA01AB${String(busCounter).padStart(4, '0')}`;
          const capacity = 50;
          const crowdLevel = Math.floor(Math.random() * 3) + 1;

          // Insert bus
          const [busResult] = await connection.query(
            `INSERT INTO buses (bus_number, bus_type, route_id, depot_id, capacity, crowd_level, status) 
             VALUES (?, 'NORMAL', ?, ?, ?, ?, 'AVAILABLE')`,
            [busNumber, routeDbId, depotId, capacity, crowdLevel]
          );

          const busId = busResult.insertId;
          busCounter++;

          // Insert schedule
          const daysOfWeek = route.specialDays ? route.specialDays.join(',') : 'MON,TUE,WED,THU,FRI,SAT,SUN';
          const driver = driverList[driverIndex % driverList.length];
          driverIndex++;

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

      // Express buses
      if (route.expressInterval) {
        let currentTime = startHour * 60;
        const endTime = endHour * 60;

        while (currentTime <= endTime) {
          const depHour = Math.floor(currentTime / 60);
          const depMin = currentTime % 60;
          const expressDuration = Math.round(route.duration * 0.7); // 30% faster
          const arrTime = currentTime + expressDuration;
          const arrHour = Math.floor(arrTime / 60) % 24;
          const arrMin = arrTime % 60;

          const busNumber = `KA01EX${String(busCounter).padStart(4, '0')}`;
          const capacity = 45;
          const crowdLevel = Math.floor(Math.random() * 3) + 1;

          // Insert bus
          const [busResult] = await connection.query(
            `INSERT INTO buses (bus_number, bus_type, route_id, depot_id, capacity, crowd_level, status) 
             VALUES (?, 'EXPRESS', ?, ?, ?, ?, 'AVAILABLE')`,
            [busNumber, routeDbId, depotId, capacity, crowdLevel]
          );

          const busId = busResult.insertId;
          busCounter++;

          // Insert schedule
          const daysOfWeek = route.specialDays ? route.specialDays.join(',') : 'MON,TUE,WED,THU,FRI,SAT,SUN';
          const driver = driverList[driverIndex % driverList.length];
          driverIndex++;

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

      console.log(`  ✓ ${route.name}: Created buses and schedules`);
    }

    console.log(`\n✅ Seeding Complete!`);
    console.log(`📊 Summary:`);
    console.log(`  - Routes: ${routes.length}`);
    console.log(`  - Buses: ${busCounter - 1}`);
    console.log(`  - Schedules: ${scheduleCounter}`);
    console.log(`  - Time range: 05:00 - 23:00`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.sql) console.error('SQL:', error.sql);
  } finally {
    await connection.release();
    await pool.end();
  }
}

seedRoutes();
