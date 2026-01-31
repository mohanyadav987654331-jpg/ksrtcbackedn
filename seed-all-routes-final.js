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
  // 1. Bangalore - Mysore
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
  // 2. Mysore - Bangalore
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
  // 3. Bangalore - Kollegal
  {
    routeId: 'BLR-KOL-001',
    name: 'Bangalore - Kollegal',
    origin: 'Bangalore',
    destination: 'Kollegal',
    distance: 120,
    duration: 160,
    nonExpressInterval: 8,
    expressInterval: null,
    nonExpressStops: ['Bangalore', 'Banashankari', 'Harohalli', 'Kanakapura', 'Maddur', 'Kollegal'],
    expressStops: []
  },
  // 4. Kollegal - Mysore
  {
    routeId: 'KOL-MYS-001',
    name: 'Kollegal - Mysore',
    origin: 'Kollegal',
    destination: 'Mysore',
    distance: 100,
    duration: 140,
    nonExpressInterval: 5,
    expressInterval: null,
    nonExpressStops: ['Kollegal', 'Maddur', 'Kanakapura', 'Harohalli', 'Banashankari', 'Mysore'],
    expressStops: []
  },
  // 5. Bangalore - Hosur
  {
    routeId: 'BLR-HOS-001',
    name: 'Bangalore - Hosur',
    origin: 'Bangalore',
    destination: 'Hosur',
    distance: 60,
    duration: 90,
    nonExpressInterval: 10,
    expressInterval: 25,
    nonExpressStops: ['Bangalore', 'Sivajinagar', 'Koramangala', 'St Johns', 'Roppena Gahara', 'Electronic City', 'Attibele', 'Hosur'],
    expressStops: ['Bangalore', 'Roppena Gahara', 'Hosur']
  },
  // 6. Hosur - Bangalore
  {
    routeId: 'HOS-BLR-001',
    name: 'Hosur - Bangalore',
    origin: 'Hosur',
    destination: 'Bangalore',
    distance: 60,
    duration: 90,
    nonExpressInterval: 10,
    expressInterval: 25,
    nonExpressStops: ['Hosur', 'Attibele', 'Electronic City', 'Roppena Gahara', 'St Johns', 'Koramangala', 'Sivajinagar', 'Bangalore'],
    expressStops: ['Hosur', 'Roppena Gahara', 'Bangalore']
  },
  // 7. Bangalore - Kolar
  {
    routeId: 'BLR-KLR-001',
    name: 'Bangalore - Kolar',
    origin: 'Bangalore',
    destination: 'Kolar',
    distance: 100,
    duration: 140,
    nonExpressInterval: 10,
    expressInterval: 30,
    nonExpressStops: ['Bangalore', 'Ramamurthy Nagar', 'KR Puram', 'Hoskote', 'Dasarathalli', 'Yelahanka', 'Kondarajnahalli', 'Kolar'],
    expressStops: ['Bangalore', 'KR Puram', 'Hoskote', 'Kolar']
  },
  // 8. Kolar - Bangalore
  {
    routeId: 'KLR-BLR-001',
    name: 'Kolar - Bangalore',
    origin: 'Kolar',
    destination: 'Bangalore',
    distance: 100,
    duration: 140,
    nonExpressInterval: 15,
    expressInterval: 30,
    nonExpressStops: ['Kolar', 'Kondarajnahalli', 'Yelahanka', 'Dasarathalli', 'Hoskote', 'KR Puram', 'Ramamurthy Nagar', 'Bangalore'],
    expressStops: ['Kolar', 'Hoskote', 'KR Puram', 'Bangalore']
  },
  // 9. Kanakapura - Harohalli
  {
    routeId: 'KAN-HAR-001',
    name: 'Kanakapura - Harohalli',
    origin: 'Kanakapura',
    destination: 'Harohalli',
    distance: 30,
    duration: 45,
    nonExpressInterval: 15,
    expressInterval: null,
    nonExpressStops: ['Kanakapura', 'Kanakapura North', 'Harohalli'],
    expressStops: []
  },
  // 10. Kanakapura - Bangalore
  {
    routeId: 'KAN-BLR-001',
    name: 'Kanakapura - Bangalore',
    origin: 'Kanakapura',
    destination: 'Bangalore',
    distance: 55,
    duration: 80,
    nonExpressInterval: 15,
    expressInterval: null,
    nonExpressStops: ['Kanakapura', 'Talaghattapura', 'JP Nagar', 'Banashankari', 'Bangalore'],
    expressStops: []
  },
  // 11. Bangalore - Kanakapura
  {
    routeId: 'BLR-KAN-001',
    name: 'Bangalore - Kanakapura',
    origin: 'Bangalore',
    destination: 'Kanakapura',
    distance: 55,
    duration: 80,
    nonExpressInterval: 15,
    expressInterval: null,
    nonExpressStops: ['Bangalore', 'Banashankari', 'JP Nagar', 'Talaghattapura', 'Kanakapura'],
    expressStops: []
  },
  // 12. Mysore - Ramanagara
  {
    routeId: 'MYS-RAM-001',
    name: 'Mysore - Ramanagara',
    origin: 'Mysore',
    destination: 'Ramanagara',
    distance: 50,
    duration: 75,
    nonExpressInterval: 15,
    expressInterval: null,
    nonExpressStops: ['Mysore', 'Ramanagara'],
    expressStops: []
  },
  // 13. Ramanagara - Mysore
  {
    routeId: 'RAM-MYS-001',
    name: 'Ramanagara - Mysore',
    origin: 'Ramanagara',
    destination: 'Mysore',
    distance: 50,
    duration: 75,
    nonExpressInterval: 25,
    expressInterval: null,
    nonExpressStops: ['Ramanagara', 'Mysore'],
    expressStops: []
  },
  // 14. Ramanagara - Bidadi
  {
    routeId: 'RAM-BID-001',
    name: 'Ramanagara - Bidadi',
    origin: 'Ramanagara',
    destination: 'Bidadi',
    distance: 40,
    duration: 60,
    nonExpressInterval: 25,
    expressInterval: null,
    nonExpressStops: ['Ramanagara', 'Bidadi'],
    expressStops: []
  },
  // 15. Bidadi - Ramanagara
  {
    routeId: 'BID-RAM-001',
    name: 'Bidadi - Ramanagara',
    origin: 'Bidadi',
    destination: 'Ramanagara',
    distance: 40,
    duration: 60,
    nonExpressInterval: 25,
    expressInterval: null,
    nonExpressStops: ['Bidadi', 'Ramanagara'],
    expressStops: []
  },
  // 16. Bangalore - Maddur
  {
    routeId: 'BLR-MAD-001',
    name: 'Bangalore - Maddur',
    origin: 'Bangalore',
    destination: 'Maddur',
    distance: 85,
    duration: 120,
    nonExpressInterval: 15,
    expressInterval: 20,
    nonExpressStops: ['Bangalore', 'Channapatna', 'Maddur'],
    expressStops: ['Bangalore', 'Maddur']
  },
  // 17. Mysore - Srirangapatna
  {
    routeId: 'MYS-SRI-001',
    name: 'Mysore - Srirangapatna',
    origin: 'Mysore',
    destination: 'Srirangapatna',
    distance: 25,
    duration: 40,
    nonExpressInterval: 5,
    expressInterval: null,
    nonExpressStops: ['Mysore', 'Srirangapatna'],
    expressStops: []
  },
  // 18. Srirangapatna - Mysore
  {
    routeId: 'SRI-MYS-001',
    name: 'Srirangapatna - Mysore',
    origin: 'Srirangapatna',
    destination: 'Mysore',
    distance: 25,
    duration: 40,
    nonExpressInterval: 15,
    expressInterval: null,
    nonExpressStops: ['Srirangapatna', 'Mysore'],
    expressStops: []
  },
  // 19. Bangalore - Tumkur (Special days: TUE, SUN, WED, THU, SAT)
  {
    routeId: 'BLR-TUM-001',
    name: 'Bangalore - Tumkur',
    origin: 'Bangalore',
    destination: 'Tumkur',
    distance: 75,
    duration: 110,
    nonExpressInterval: null,
    expressInterval: 15,
    nonExpressStops: [],
    expressStops: ['Bangalore', 'Tumkur'],
    specialDays: ['TUE', 'SUN', 'WED', 'THU', 'SAT']
  },
  // 20. Tumkur - Bangalore (Special days: SUN, TUE, WED, THU, SAT)
  {
    routeId: 'TUM-BLR-001',
    name: 'Tumkur - Bangalore',
    origin: 'Tumkur',
    destination: 'Bangalore',
    distance: 75,
    duration: 110,
    nonExpressInterval: 20,
    expressInterval: null,
    nonExpressStops: ['Tumkur', 'Bangalore'],
    expressStops: [],
    specialDays: ['SUN', 'TUE', 'WED', 'THU', 'SAT']
  },
];

async function seedRoutes() {
  const connection = await pool.getConnection();

  try {
    console.log('🚀 Starting database seeding...\n');

    // Get or create depot
    let depotId = 1;
    const [depots] = await connection.query('SELECT id FROM depots LIMIT 1');
    if (depots.length > 0) {
      depotId = depots[0].id;
      console.log(`✓ Using existing depot: ${depotId}`);
    } else {
      const [depotResult] = await connection.query(
        `INSERT INTO depots (depot_name, location, contact_number, manager_name) 
         VALUES ('Central Depot', 'Bangalore', '9876543200', 'Depot Manager')`
      );
      depotId = depotResult.insertId;
      console.log(`✓ Created depot: ${depotId}`);
    }

    // Get or create drivers
    console.log('\n📋 Setting up drivers...');
    const [existingDrivers] = await connection.query(
      `SELECT id, full_name, phone FROM users WHERE role = 'driver' LIMIT 10`
    );

    let driverIds = [];
    if (existingDrivers.length > 0) {
      driverIds = existingDrivers.map(d => d.id);
      console.log(`✓ Using existing ${driverIds.length} drivers`);
    } else {
      for (let i = 0; i < driverList.length; i++) {
        const driver = driverList[i];
        const [result] = await connection.query(
          `INSERT INTO users (username, email, password_hash, full_name, phone, role, is_active) 
           VALUES (?, ?, ?, ?, ?, 'driver', TRUE)`,
          [
            `driver${i}`,
            `driver${i}@ksrtc.com`,
            'password123', // Default password
            driver.name,
            driver.phone
          ]
        );
        driverIds.push(result.insertId);
      }
      console.log(`✓ Created ${driverIds.length} drivers`);
    }

    // Clear existing data
    console.log('\n🗑️  Clearing existing data...');
    await connection.query('DELETE FROM schedules');
    await connection.query('DELETE FROM buses');
    await connection.query('DELETE FROM route_stops');
    await connection.query('DELETE FROM routes');
    console.log('✓ Cleared old routes and schedules');

    let routeCounter = 0;
    let busCounter = 0;
    let scheduleCounter = 0;

    // Seed each route
    for (const route of routes) {
      console.log(`\n🛣️  Seeding: ${route.name}`);

      // Insert route
      const [routeResult] = await connection.query(
        `INSERT INTO routes (route_id, route_name, origin, destination, distance, estimated_duration, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [route.routeId, route.name, route.origin, route.destination, route.distance, route.duration]
      );

      const routeDbId = routeResult.insertId;
      routeCounter++;

      // Insert stops
      let stopOrder = 1;
      let totalMinutes = 0;
      const stopCount = route.nonExpressStops.length;

      for (const stopName of route.nonExpressStops) {
        // Default latitude/longitude for Bangalore area
        const latitude = 12.9716 + (Math.random() * 0.05);
        const longitude = 77.5946 + (Math.random() * 0.05);

        await connection.query(
          `INSERT INTO route_stops (route_id, stop_name, latitude, longitude, stop_order, estimated_minutes_from_origin) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [route.routeId, stopName, latitude, longitude, stopOrder, totalMinutes]
        );

        // Calculate minutes to next stop
        if (stopOrder < stopCount) {
          totalMinutes += Math.round(route.duration / (stopCount - 1));
        }
        stopOrder++;
      }

      let driverIndex = 0;
      const daysOfWeek = route.specialDays ? route.specialDays.join(',') : 'MON,TUE,WED,THU,FRI,SAT,SUN';

      // Normal buses from 05:00 to 22:00 (last bus departs at 22:00, arrives around 23:00)
      if (route.nonExpressInterval) {
        let currentTime = 5 * 60; // 05:00
        const endTime = 22 * 60; // 22:00 (so arrival is not after 23:00)

        while (currentTime < endTime) {
          const depHour = Math.floor(currentTime / 60);
          const depMin = currentTime % 60;
          const arrTime = currentTime + route.duration;
          const arrHour = Math.floor(arrTime / 60) % 24;
          const arrMin = arrTime % 60;

          const busNumber = `KA01N${String(busCounter).padStart(5, '0')}`;
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

          // Get driver
          const driverId = driverIds[driverIndex % driverIds.length];
          driverIndex++;

          // Insert schedule
          await connection.query(
            `INSERT INTO schedules (route_id, bus_id, driver_id, departure_time, arrival_time, days_of_week, is_active) 
             VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [
              routeDbId,
              busId,
              driverId,
              `${String(depHour).padStart(2, '0')}:${String(depMin).padStart(2, '0')}:00`,
              `${String(arrHour).padStart(2, '0')}:${String(arrMin).padStart(2, '0')}:00`,
              daysOfWeek
            ]
          );

          scheduleCounter++;
          currentTime += route.nonExpressInterval;
        }
      }

      // Express buses from 05:00 to 22:00
      if (route.expressInterval) {
        let currentTime = 5 * 60;
        const endTime = 22 * 60;

        while (currentTime < endTime) {
          const depHour = Math.floor(currentTime / 60);
          const depMin = currentTime % 60;
          const expressDuration = Math.round(route.duration * 0.7);
          const arrTime = currentTime + expressDuration;
          const arrHour = Math.floor(arrTime / 60) % 24;
          const arrMin = arrTime % 60;

          const busNumber = `KA01E${String(busCounter).padStart(5, '0')}`;
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

          // Get driver
          const driverId = driverIds[driverIndex % driverIds.length];
          driverIndex++;

          // Insert schedule
          await connection.query(
            `INSERT INTO schedules (route_id, bus_id, driver_id, departure_time, arrival_time, days_of_week, is_active) 
             VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [
              routeDbId,
              busId,
              driverId,
              `${String(depHour).padStart(2, '0')}:${String(depMin).padStart(2, '0')}:00`,
              `${String(arrHour).padStart(2, '0')}:${String(arrMin).padStart(2, '0')}:00`,
              daysOfWeek
            ]
          );

          scheduleCounter++;
          currentTime += route.expressInterval;
        }
      }

      console.log(`  ✓ Route added`);
      console.log(`    - Stops: ${route.nonExpressStops.length}`);
      console.log(`    - Time: 05:00 - 23:00`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ SEEDING COMPLETE!');
    console.log('='.repeat(50));
    console.log(`Routes: ${routeCounter}`);
    console.log(`Buses: ${busCounter}`);
    console.log(`Schedules: ${scheduleCounter}`);
    console.log(`Drivers: ${driverIds.length}`);
    console.log('\nAll buses have driver assignments!');
    console.log('Bus timings: 05:00 AM - 11:00 PM');

  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

seedRoutes()
  .then(() => {
    console.log('\n✅ Database seeding successful!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  });
