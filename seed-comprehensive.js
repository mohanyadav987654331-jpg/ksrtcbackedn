const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ksrtc_smart_transport',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function seedComprehensiveData() {
  const conn = await pool.getConnection();
  
  try {
    console.log('🔄 Seeding comprehensive bus and schedule data...\n');

    // Get drivers
    const [[driver1], [driver2], [driver3]] = await Promise.all([
      conn.execute('SELECT id FROM users WHERE username = ?', ['driver1']),
      conn.execute('SELECT id FROM users WHERE username = ?', ['driver2']),
      conn.execute('SELECT id FROM users WHERE username = ?', ['driver3'])
    ]);
    
    const driverIds = [driver1?.id, driver2?.id, driver3?.id].filter(Boolean);
    console.log(`✓ Found ${driverIds.length} drivers\n`);

    // Get route R001
    const [[route]] = await conn.execute('SELECT id FROM routes WHERE route_id = ?', ['R001']);
    if (!route) {
      console.log('No routes found');
      await conn.release();
      return;
    }
    const routeId = route.id;

    // Delete existing buses and schedules for this route
    await conn.execute('DELETE FROM schedules WHERE route_id = ?', [routeId]);
    const [[busCount]] = await conn.execute('SELECT COUNT(*) as count FROM buses WHERE route_id = ?', [routeId]);
    if (busCount.count > 0) {
      await conn.execute('DELETE FROM buses WHERE route_id = ?', [routeId]);
    }

    console.log('🚌 Creating buses for all 7 stops (morning, afternoon, evening)...\n');

    // Get all stops for the route
    const [stops] = await conn.execute(
      'SELECT id, stop_name FROM route_stops WHERE route_id = ? ORDER BY stop_order',
      ['R001']
    );

    const stopNames = stops.map(s => s.stop_name);
    console.log(`Stops: ${stopNames.join(' → ')}\n`);

    // Create schedules from 5 AM to 11 PM for each stop combination
    let scheduleCount = 0;
    let busCount2 = 0;

    // Define time slots from 5 AM to 11 PM (9 main time slots)
    const timeSlots = [
      { hour: 5, min: 0, name: 'Early Morning' },
      { hour: 7, min: 0, name: 'Morning' },
      { hour: 9, min: 0, name: 'Mid Morning' },
      { hour: 11, min: 0, name: 'Late Morning' },
      { hour: 14, min: 0, name: 'Afternoon' },
      { hour: 16, min: 0, name: 'Late Afternoon' },
      { hour: 18, min: 30, name: 'Evening' },
      { hour: 20, min: 0, name: 'Late Evening' },
      { hour: 22, min: 0, name: 'Night' },
    ];

    for (let slotIdx = 0; slotIdx < timeSlots.length; slotIdx++) {
      const slot = timeSlots[slotIdx];

      // Create 2-3 buses per time slot
      for (let busIdx = 0; busIdx < 2; busIdx++) {
        const busNumber = `KA02AB${1001 + (slotIdx * 3) + busIdx}`;
        const driverId = driverIds[busIdx % driverIds.length];
        const crowdLevel = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3

        // Create bus
        const [busResult] = await conn.execute(
          `INSERT INTO buses (bus_number, bus_type, route_id, capacity, driver_id, crowd_level, status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [busNumber, slotIdx % 3 === 0 ? 'EXPRESS' : 'NORMAL', routeId, 50, driverId, crowdLevel, 'AVAILABLE']
        );
        
        const busId = busResult.insertId;
        busCount2++;
        console.log(`✓ Bus ${busNumber} (Type: ${slotIdx % 3 === 0 ? 'EXPRESS' : 'NORMAL'}, Driver: ${driverId}, Crowd: ${crowdLevel})`);

        // Calculate departure and arrival times
        let depTime = new Date();
        depTime.setHours(slot.hour, slot.min, 0);
        const depHour = depTime.getHours().toString().padStart(2, '0');
        const depMin = depTime.getMinutes().toString().padStart(2, '0');
        const departureTime = `${depHour}:${depMin}:00`;

        // Arrival is 3 hours later (180 minutes estimated journey)
        let arrTime = new Date(depTime.getTime() + 3 * 60 * 60 * 1000);
        const arrHour = arrTime.getHours().toString().padStart(2, '0');
        const arrMin = arrTime.getMinutes().toString().padStart(2, '0');
        const arrivalTime = `${arrHour}:${arrMin}:00`;

        // Create schedule
        const [schedResult] = await conn.execute(
          `INSERT INTO schedules (route_id, bus_id, driver_id, departure_time, arrival_time, days_of_week, is_active)
           VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
          [routeId, busId, driverId, departureTime, arrivalTime, 'Daily']
        );

        scheduleCount++;
        console.log(`  └─ Schedule ${schedResult.insertId}: ${departureTime} → ${arrivalTime}`);
      }
    }

    console.log(`\n✅ Seeding complete!`);
    console.log(`\n📋 Summary:`);
    console.log(`  - Buses created: ${busCount2}`);
    console.log(`  - Schedules created: ${scheduleCount}`);
    console.log(`  - Time slots: ${timeSlots.length} (5 AM to 11 PM)`);
    console.log(`  - Route covered: ${stopNames[0]} → ${stopNames[stopNames.length - 1]}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await conn.release();
    await pool.end();
  }
}

seedComprehensiveData();
