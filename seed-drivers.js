const mysql = require('mysql2/promise');
const bcryptjs = require('bcryptjs');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ksrtc_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function seedDriversAndSchedules() {
  const conn = await pool.getConnection();
  
  try {
    console.log('🔄 Seeding drivers and schedules...\n');

    // Create 3 driver accounts
    const drivers = [
      { username: 'driver1', email: 'driver1@ksrtc.com', phone: '9876543210', name: 'Ramesh Kumar' },
      { username: 'driver2', email: 'driver2@ksrtc.com', phone: '9876543211', name: 'Suresh Patel' },
      { username: 'driver3', email: 'driver3@ksrtc.com', phone: '9876543212', name: 'Anil Reddy' }
    ];

    const driverIds = [];
    const password = 'Driver@123';
    const hashedPassword = await bcryptjs.hash(password, 10);

    for (const driver of drivers) {
      try {
        const [result] = await conn.execute(
          `INSERT INTO users (username, email, phone, password_hash, role, full_name, is_active)
           VALUES (?, ?, ?, ?, 'driver', ?, 1)
           ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
          [driver.username, driver.email, driver.phone, hashedPassword, driver.name]
        );
        
        const driverId = result.insertId || (await conn.execute(
          'SELECT id FROM users WHERE username = ?',
          [driver.username]
        ))[0][0].id;
        
        driverIds.push(driverId);
        console.log(`✓ Created driver: ${driver.username} (ID: ${driverId})`);
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          const [existing] = await conn.execute(
            'SELECT id FROM users WHERE username = ?',
            [driver.username]
          );
          if (existing.length > 0) {
            driverIds.push(existing[0].id);
            console.log(`↻ Driver exists: ${driver.username} (ID: ${existing[0].id})`);
          }
        } else {
          throw error;
        }
      }
    }

    // Get all schedules that don't have drivers assigned
    const [schedules] = await conn.execute(
      'SELECT id, route_id FROM schedules WHERE driver_id IS NULL LIMIT 9'
    );

    console.log(`\n🚌 Assigning ${schedules.length} schedules to drivers...\n`);

    // Assign drivers to schedules (round-robin)
    let driverIndex = 0;
    for (const schedule of schedules) {
      const driverId = driverIds[driverIndex % driverIds.length];
      await conn.execute(
        'UPDATE schedules SET driver_id = ? WHERE id = ?',
        [driverId, schedule.id]
      );
      console.log(`✓ Schedule ${schedule.id} -> Driver ${driverId}`);
      driverIndex++;
    }

    // Get all buses without crowd_level
    const [buses] = await conn.execute(
      'SELECT id FROM buses WHERE crowd_level IS NULL'
    );

    console.log(`\n📊 Setting crowd levels for ${buses.length} buses...\n`);

    // Set random crowd levels
    const crowdLevels = ['LOW', 'MEDIUM', 'HIGH'];
    for (let i = 0; i < buses.length; i++) {
      const level = crowdLevels[Math.floor(Math.random() * crowdLevels.length)];
      await conn.execute(
        'UPDATE buses SET crowd_level = ? WHERE id = ?',
        [level, buses[i].id]
      );
      console.log(`✓ Bus ${buses[i].id} -> Crowd: ${level}`);
    }

    console.log('\n✅ Seeding complete!');
    console.log(`\n📋 Summary:`);
    console.log(`  - Drivers created/assigned: ${driverIds.length}`);
    console.log(`  - Schedules updated: ${schedules.length}`);
    console.log(`  - Buses updated: ${buses.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await conn.release();
    await pool.end();
  }
}

seedDriversAndSchedules();
