const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'ksrtc_smart_transport',
  connectionLimit: 5,
});

async function seedData() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🌱 Starting comprehensive seed...\n');

    // 1. First ensure we have the backend database
    await connection.query('USE ksrtc_smart_transport');

    // Clear existing schedules data
    await connection.query('DELETE FROM schedules');
    await connection.query('DELETE FROM buses');
    
    console.log('Cleared existing buses and schedules');

    // Get all routes using the current schema (route_id is VARCHAR)
    const [routes] = await connection.query('SELECT id, route_id FROM routes LIMIT 20');
    console.log(`Found ${routes.length} routes`);

    if (routes.length === 0) {
      console.log('❌ No routes found. Please run the backend API migrations first.');
      return;
    }

    // Get all drivers/users with role driver
    const [drivers] = await connection.query('SELECT id FROM users WHERE role = "driver" LIMIT 10');
    console.log(`Found ${drivers.length} drivers`);

    if (drivers.length === 0) {
      console.log('❌ No drivers found. Creating test drivers...');
      // Create test drivers
      for (let i = 1; i <= 5; i++) {
        await connection.query(
          'INSERT INTO users (username, email, password_hash, full_name, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
          [`driver${i}`, `driver${i}@test.com`, 'hashed', `Driver ${i}`, `900000000${i}`, 'driver']
        );
      }
      var [newDrivers] = await connection.query('SELECT id FROM users WHERE role = "driver"');
      var driverList = newDrivers;
    } else {
      var driverList = drivers;
    }

    // Get depot
    let [depots] = await connection.query('SELECT id FROM depots LIMIT 1');
    let depotId;
    if (depots.length === 0) {
      const [depotResult] = await connection.query(
        'INSERT INTO depots (depot_name, location) VALUES (?, ?)',
        ['Main Depot', 'Bangalore']
      );
      depotId = depotResult.insertId;
    } else {
      depotId = depots[0].id;
    }

    // Time slots
    const timeSlots = [
      '05:00', '06:00', '07:00', '08:00', '09:00', '10:00',
      '11:00', '12:00', '13:00', '14:00', '15:00', '16:00',
      '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
    ];

    const busTypes = ['NORMAL', 'EXPRESS', 'DELUXE'];
    let busCounter = 1;
    let createdBuses = 0;
    let createdSchedules = 0;
    let driverIndex = 0;

    console.log(`\n🚌 Creating buses and schedules for ${routes.length} routes...`);

    // For each route
    for (const route of routes) {
      // Create multiple buses throughout the day
      for (let i = 0; i < timeSlots.length; i += 2) { // Every 2 hours
        const timeSlot = timeSlots[i];
        const [hour, minute] = timeSlot.split(':');
        
        // Create 1 bus per time slot per route
        const busNumber = `KA02AB${String(1000 + busCounter).padStart(4, '0')}`;
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

        // Calculate arrival time
        const departureHour = parseInt(hour);
        let arrivalHour = departureHour + 3;
        if (arrivalHour >= 24) arrivalHour -= 24;

        const departureTime = `${String(departureHour).padStart(2, '0')}:00:00`;
        const arrivalTime = `${String(arrivalHour).padStart(2, '0')}:00:00`;

        // Assign driver
        const driver = driverList[driverIndex % driverList.length];
        driverIndex++;

        // Create schedule
        await connection.query(
          `INSERT INTO schedules (route_id, bus_id, driver_id, departure_time, arrival_time, days_of_week, is_active) 
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [route.id, busId, driver.id, departureTime, arrivalTime, 'MON,TUE,WED,THU,FRI,SAT,SUN']
        );

        createdSchedules++;
      }
    }

    console.log(`\n✅ Seed Complete!`);
    console.log(`📊 Summary:`);
    console.log(`  - Created ${createdBuses} buses`);
    console.log(`  - Created ${createdSchedules} schedules`);
    console.log(`  - Time slots: ${timeSlots.length} per day (05:00 - 23:00)`);
    console.log(`  - Routes covered: ${routes.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.sql) console.error('SQL:', error.sql);
  } finally {
    await connection.release();
    await pool.end();
  }
}

seedData();
