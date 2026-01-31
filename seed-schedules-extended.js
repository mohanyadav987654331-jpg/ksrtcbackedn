const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'ksrtc_smart_transport',
  connectionLimit: 5,
});

async function seedExtendedSchedules() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🌱 Starting extended schedule seed...\n');

    await connection.query('USE ksrtc_smart_transport');

    // Get all routes
    const [routes] = await connection.query('SELECT id, route_id FROM routes');
    console.log(`Found ${routes.length} routes`);

    if (routes.length === 0) {
      console.log('❌ No routes found.');
      return;
    }

    // Get all drivers
    const [drivers] = await connection.query('SELECT id FROM users WHERE role = "driver"');
    console.log(`Found ${drivers.length} drivers`);

    if (drivers.length === 0) {
      console.log('❌ No drivers found.');
      return;
    }

    // Get depot
    const [depots] = await connection.query('SELECT id FROM depots LIMIT 1');
    const depotId = depots[0]?.id || 1;

    // Time slots - every 30 minutes from 05:00 to 23:00
    const timeSlots = [];
    for (let h = 5; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        const hour = String(h).padStart(2, '0');
        const min = String(m).padStart(2, '0');
        timeSlots.push(`${hour}:${min}`);
      }
    }

    const busTypes = ['NORMAL', 'EXPRESS', 'DELUXE'];
    let busCounter = 1000;
    let createdBuses = 0;
    let createdSchedules = 0;
    let driverIndex = 0;

    console.log(`📅 Time slots: ${timeSlots.length} (every 30 min, 05:00-23:00)`);
    console.log(`\n🚌 Creating buses and schedules for ${routes.length} routes...`);

    // For each route, create buses for each time slot
    for (const route of routes) {
      for (const timeSlot of timeSlots) {
        const [hour, minute] = timeSlot.split(':').map(Number);
        
        const busNumber = `KA02AB${String(busCounter).padStart(5, '0')}`;
        const busType = busTypes[busCounter % busTypes.length];
        const capacity = busType === 'EXPRESS' ? 45 : busType === 'DELUXE' ? 40 : 50;
        const crowdLevel = Math.floor(Math.random() * 3) + 1; // 1-3

        const [busResult] = await connection.query(
          `INSERT INTO buses (bus_number, bus_type, route_id, depot_id, capacity, crowd_level, status) 
           VALUES (?, ?, ?, ?, ?, ?, 'AVAILABLE')`,
          [busNumber, busType, route.id, depotId, capacity, crowdLevel]
        );

        const busId = busResult.insertId;
        busCounter++;
        createdBuses++;

        // Calculate arrival time (3 hours after departure)
        let arrivalHour = hour + 3;
        let arrivalMinute = minute;
        if (arrivalHour >= 24) arrivalHour -= 24;

        const departureTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
        const arrivalTime = `${String(arrivalHour).padStart(2, '0')}:${String(arrivalMinute).padStart(2, '0')}:00`;

        // Assign driver
        const driver = drivers[driverIndex % drivers.length];
        driverIndex++;

        // Create schedule
        await connection.query(
          `INSERT INTO schedules (route_id, bus_id, driver_id, departure_time, arrival_time, days_of_week, is_active) 
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [route.id, busId, driver.id, departureTime, arrivalTime, 'MON,TUE,WED,THU,FRI,SAT,SUN']
        );

        createdSchedules++;
      }

      console.log(`  ✓ Route ${route.route_id}: ${timeSlots.length} schedules added`);
    }

    console.log(`\n✅ Extended Seed Complete!`);
    console.log(`📊 Summary:`);
    console.log(`  - Created ${createdBuses} buses`);
    console.log(`  - Created ${createdSchedules} schedules`);
    console.log(`  - Time slots per route: ${timeSlots.length}`);
    console.log(`  - Routes covered: ${routes.length}`);
    console.log(`  - Total schedules: ${routes.length} × ${timeSlots.length} = ${routes.length * timeSlots.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.sql) console.error('SQL:', error.sql);
  } finally {
    await connection.release();
    await pool.end();
  }
}

seedExtendedSchedules();
