const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'ksrtc_db',
  connectionLimit: 5,
});

async function seedAllData() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🌱 Starting comprehensive seed...\n');

    // 1. Seed Locations (stored in depots table conceptually, but we'll create routes with location data)
    console.log('📍 Seeding locations...');
    const locations = [
      { name: 'Bangalore Central', code: 'BNG' },
      { name: 'Mysore', code: 'MYS' },
      { name: 'Belgaum', code: 'BGL' },
      { name: 'Bijapur', code: 'BJP' },
      { name: 'Hassan', code: 'HSN' },
      { name: 'Bidadi', code: 'BID' },
      { name: 'Tumkur', code: 'TUM' },
    ];

    // Clear existing data (be careful with this!)
    await connection.query('DELETE FROM schedules');
    await connection.query('DELETE FROM buses');
    await connection.query('DELETE FROM route_stops');
    await connection.query('DELETE FROM routes');
    
    let createdRoutes = 0;

    // Create routes between different location pairs
    for (let i = 0; i < locations.length; i++) {
      for (let j = i + 1; j < locations.length; j++) {
        const sourceLocation = locations[i];
        const destLocation = locations[j];
        
        // Get or create depot
        let [depots] = await connection.query('SELECT id FROM depots LIMIT 1');
        let depotId;
        if (depots.length === 0) {
          const [depotResult] = await connection.query(
            'INSERT INTO depots (depot_name, location) VALUES (?, ?)',
            ['Main Depot', sourceLocation.name]
          );
          depotId = depotResult.insertId;
        } else {
          depotId = depots[0].id;
        }

        // Create route
        const routeNumber = `R${String(createdRoutes + 1).padStart(3, '0')}`;
        const distance = Math.floor(Math.random() * 150) + 50; // 50-200 km
        const duration = Math.floor((distance / 60) * 60); // Assume 60 km/h average

        const [routeResult] = await connection.query(
          `INSERT INTO routes 
          (route_number, source_location_id, destination_location_id, depot_id, distance_km, 
           estimated_duration_minutes, bus_type, start_time, end_time, status) 
          VALUES (?, ?, ?, ?, ?, ?, ?, '05:00:00', '23:00:00', 'active')`,
          [
            routeNumber,
            i + 1, // Using index as location ID conceptually
            j + 1,
            depotId,
            distance,
            duration,
            Math.random() > 0.5 ? 'express' : 'non-express'
          ]
        );

        createdRoutes++;

        // Skip creating stops for now - focus on routes and schedules
      }
    }

    console.log(`✅ Created ${createdRoutes} routes\n`);

    // 2. Seed buses and schedules
    console.log('🚌 Seeding buses and schedules...');

    const [routes] = await connection.query('SELECT id FROM routes');
    const [drivers] = await connection.query('SELECT id FROM users WHERE role = "driver"');
    const [depot] = await connection.query('SELECT id FROM depots LIMIT 1');

    if (routes.length === 0) {
      console.error('❌ No routes found');
      return;
    }

    if (drivers.length === 0) {
      console.error('❌ No drivers found');
      return;
    }

    const depotId = depot[0].id;

    // Time slots throughout the day
    const timeSlots = [
      '05:00', '06:00', '07:00', '08:00', '09:00', '10:00',
      '11:00', '12:00', '13:00', '14:00', '15:00', '16:00',
      '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
    ];

    const busTypes = ['express', 'non-express', 'express'];
    let busCounter = 1;
    let createdBuses = 0;
    let createdSchedules = 0;
    let driverIndex = 0;

    const today = new Date();
    const scheduledDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // For each route, create multiple buses throughout the day
    for (const route of routes) {
      for (let i = 0; i < timeSlots.length; i++) {
        const timeSlot = timeSlots[i];
        const [hour, minute] = timeSlot.split(':');
        
        // Create 1-2 buses per time slot per route
        const busCountForSlot = i % 4 === 0 ? 2 : 1;
        
        for (let j = 0; j < busCountForSlot; j++) {
          // Create a bus
          const busNumber = `KA02AB${String(1000 + busCounter).padStart(4, '0')}`;
          const registrationNumber = busNumber;
          const busType = busTypes[busCounter % busTypes.length];
          const capacity = busType === 'express' ? 45 : 50;

          const [busResult] = await connection.query(
            `INSERT INTO buses (bus_number, registration_number, bus_type, capacity, depot_id, status) 
             VALUES (?, ?, ?, ?, ?, 'active')`,
            [busNumber, registrationNumber, busType, capacity, depotId]
          );

          const busId = busResult.insertId;
          busCounter++;
          createdBuses++;

          // Calculate arrival time (assume 3 hours journey)
          const departureHour = parseInt(hour);
          let arrivalHour = departureHour + 3;
          const departureMinute = parseInt(minute);

          if (arrivalHour >= 24) {
            arrivalHour -= 24;
          }

          const departureTime = `${String(departureHour).padStart(2, '0')}:${String(departureMinute).padStart(2, '0')}:00`;
          const estimatedArrivalTime = `${String(arrivalHour).padStart(2, '0')}:${String(departureMinute).padStart(2, '0')}:00`;

          // Assign a driver
          const driver = drivers[driverIndex % drivers.length];
          driverIndex++;

          // Random crowd level
          const crowdLevel = ['low', 'medium', 'high'][Math.floor(Math.random() * 3)];

          // Create schedule
          await connection.query(
            `INSERT INTO schedules 
            (route_id, bus_id, driver_id, scheduled_date, departure_time, estimated_arrival_time, 
             status, crowd_level) 
            VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?)`,
            [route.id, busId, driver.id, scheduledDate, departureTime, estimatedArrivalTime, crowdLevel]
          );

          createdSchedules++;

          if (createdSchedules % 20 === 0) {
            console.log(`  Created ${createdSchedules} schedules...`);
          }
        }
      }
    }

    console.log(`✅ Created ${createdBuses} buses`);
    console.log(`✅ Created ${createdSchedules} schedules\n`);

    console.log('📊 Seed Summary:');
    console.log(`  - Routes: ${createdRoutes}`);
    console.log(`  - Buses: ${createdBuses}`);
    console.log(`  - Schedules: ${createdSchedules}`);
    console.log(`  - Time slots: ${timeSlots.length} (05:00 - 23:00)`);
    console.log(`  - Scheduled Date: ${scheduledDate}`);
    console.log(`\n✅ Seed Complete!`);

  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
  } finally {
    await connection.release();
    await pool.end();
  }
}

seedAllData();
