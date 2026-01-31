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

async function seedEverything() {
  const conn = await pool.getConnection();
  
  try {
    console.log('🔄 Complete seeding process...\n');

    // Get or create drivers
    const driverIds = [];
    const drivers = [
      { username: 'driver1', email: 'driver1@ksrtc.com', phone: '9876543210', name: 'Ramesh Kumar' },
      { username: 'driver2', email: 'driver2@ksrtc.com', phone: '9876543211', name: 'Suresh Patel' },
      { username: 'driver3', email: 'driver3@ksrtc.com', phone: '9876543212', name: 'Anil Reddy' }
    ];

    for (const driver of drivers) {
      const [[existing]] = await conn.execute(
        'SELECT id FROM users WHERE username = ?',
        [driver.username]
      );
      
      if (existing) {
        driverIds.push(existing.id);
        console.log(`✓ Driver exists: ${driver.username} (ID: ${existing.id})`);
      }
    }

    // Get routes
    const [[route]] = await conn.execute(
      'SELECT id FROM routes WHERE route_id = ? LIMIT 1',
      ['R001']
    );

    if (!route) {
      console.log('⚠ No routes found in database');
      await conn.release();
      return;
    }

    const routeId = route.id;
    console.log(`✓ Route found: R001 (ID: ${routeId})\n`);

    // Create buses for the route
    console.log('🚌 Creating buses...\n');
    const busNumbers = ['KA02AB1001', 'KA02AB1002', 'KA02AB1003'];
    const busIds = [];

    for (let i = 0; i < busNumbers.length; i++) {
      const busNum = busNumbers[i];
      const [[bus]] = await conn.execute(
        'SELECT id FROM buses WHERE bus_number = ?',
        [busNum]
      );

      let busId;
      if (bus) {
        busId = bus.id;
        console.log(`↻ Bus exists: ${busNum} (ID: ${busId})`);
      } else {
        const [result] = await conn.execute(
          `INSERT INTO buses (bus_number, bus_type, route_id, capacity, driver_id, crowd_level, status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [busNum, 'EXPRESS', routeId, 50, driverIds[i % driverIds.length], 2, 'AVAILABLE']
        );
        busId = result.insertId;
        console.log(`✓ Bus created: ${busNum} (ID: ${busId})`);
      }
      busIds.push(busId);
    }

    // Create schedules for buses
    console.log(`\n📋 Creating schedules...\n`);
    const times = [
      { departure: '06:00:00', arrival: '08:00:00', day: 'Daily' },
      { departure: '09:00:00', arrival: '11:00:00', day: 'Daily' },
      { departure: '12:00:00', arrival: '14:00:00', day: 'Daily' },
      { departure: '15:00:00', arrival: '17:00:00', day: 'Weekdays' },
      { departure: '18:00:00', arrival: '20:00:00', day: 'Weekends' },
    ];

    for (let i = 0; i < times.length; i++) {
      const time = times[i];
      const busId = busIds[i % busIds.length];
      const driverId = driverIds[i % driverIds.length];
      
      const [result] = await conn.execute(
        `INSERT INTO schedules (route_id, bus_id, driver_id, departure_time, arrival_time, days_of_week, is_active)
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [routeId, busId, driverId, time.departure, time.arrival, time.day]
      );
      
      console.log(`✓ Schedule ${result.insertId}: ${time.departure} - ${time.arrival} (Bus: ${busId}, Driver: ${driverId})`);
    }

    // Update crowd levels
    console.log(`\n📊 Setting crowd levels...\n`);
    const crowdLevels = [1, 2, 3]; // 1=LOW, 2=MEDIUM, 3=HIGH
    for (const busId of busIds) {
      const level = crowdLevels[Math.floor(Math.random() * crowdLevels.length)];
      await conn.execute(
        'UPDATE buses SET crowd_level = ? WHERE id = ?',
        [level, busId]
      );
      const levelName = ['LOW', 'MEDIUM', 'HIGH'][level - 1];
      console.log(`✓ Bus ${busId}: Crowd = ${levelName}`);
    }

    console.log('\n✅ Seeding complete!');
    console.log(`\n📋 Summary:`);
    console.log(`  - Drivers: ${driverIds.length}`);
    console.log(`  - Buses created: ${busIds.length}`);
    console.log(`  - Schedules created: ${times.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await conn.release();
    await pool.end();
  }
}

seedEverything();
