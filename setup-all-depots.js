const bcrypt = require('bcryptjs');
const db = require('./config/database');

async function setupAllDepots() {
  try {
    console.log('=== Setting up ALL Depot Locations ===\n');

    // Step 1: Reset passwords for all depot admins
    console.log('1️⃣ Resetting passwords for all depot admins...');
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [depotAdmins] = await db.query(
      "SELECT id, username, depot_id FROM users WHERE role = 'depot_admin' AND depot_id IS NOT NULL"
    );
    
    for (const admin of depotAdmins) {
      await db.query(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [hashedPassword, admin.id]
      );
      console.log(`   ✅ Reset password for ${admin.username} (depot_id: ${admin.depot_id})`);
    }

    // Step 2: Ensure all depots have buses
    console.log('\n2️⃣ Checking buses for each depot...');
    const [depots] = await db.query('SELECT id, depot_name, location FROM depots WHERE is_active = 1');
    
    for (const depot of depots) {
      const [buses] = await db.query(
        'SELECT COUNT(*) as count FROM buses WHERE depot_id = ?',
        [depot.id]
      );
      console.log(`   📍 ${depot.depot_name} (${depot.location}): ${buses[0].count} buses`);
      
      if (buses[0].count === 0) {
        console.log(`      ⚠️ No buses! Creating default buses...`);
        // Create 3 buses for this depot
        for (let i = 1; i <= 3; i++) {
          await db.query(`
            INSERT INTO buses (bus_number, bus_type, capacity, depot_id, status)
            VALUES (?, ?, 50, ?, 'ACTIVE')
          `, [`${depot.location.substring(0,2).toUpperCase()}-${depot.id}0${i}`, i === 1 ? 'EXPRESS' : 'NORMAL', depot.id]);
        }
        console.log(`      ✅ Created 3 buses`);
      }
    }

    // Step 3: Ensure all depots have drivers
    console.log('\n3️⃣ Checking drivers for each depot...');
    for (const depot of depots) {
      const [drivers] = await db.query(
        "SELECT COUNT(*) as count FROM users WHERE depot_id = ? AND role = 'driver'",
        [depot.id]
      );
      console.log(`   📍 ${depot.depot_name} (${depot.location}): ${drivers[0].count} drivers`);
      
      if (drivers[0].count === 0) {
        console.log(`      ⚠️ No drivers! Creating default driver...`);
        await db.query(`
          INSERT INTO users (username, full_name, email, password_hash, phone, role, depot_id, is_active)
          VALUES (?, ?, ?, ?, '9999999999', 'driver', ?, 1)
        `, [
          `driver_${depot.location.toLowerCase()}`,
          `${depot.location} Driver`,
          `driver_${depot.location.toLowerCase()}@ksrtc.com`,
          hashedPassword,
          depot.id
        ]);
        console.log(`      ✅ Created driver: driver_${depot.location.toLowerCase()}`);
      }
    }

    // Step 4: Ensure all depots have schedules
    console.log('\n4️⃣ Checking schedules for each depot...');
    for (const depot of depots) {
      const [schedules] = await db.query(
        'SELECT COUNT(*) as count FROM schedules WHERE depot_id = ?',
        [depot.id]
      );
      console.log(`   📍 ${depot.depot_name} (${depot.location}): ${schedules[0].count} schedules`);
    }

    // Step 5: Summary
    console.log('\n5️⃣ Summary of all depot admins:');
    const [summary] = await db.query(`
      SELECT 
        u.username,
        u.depot_id,
        d.depot_name,
        d.location,
        (SELECT COUNT(*) FROM schedules WHERE depot_id = u.depot_id) as schedules_count,
        (SELECT COUNT(*) FROM users WHERE depot_id = u.depot_id AND role = 'driver') as drivers_count,
        (SELECT COUNT(*) FROM buses WHERE depot_id = u.depot_id) as buses_count
      FROM users u
      JOIN depots d ON u.depot_id = d.id
      WHERE u.role = 'depot_admin' AND u.depot_id IS NOT NULL
      ORDER BY d.location
    `);
    
    console.table(summary);

    console.log('\n✅ ALL DEPOTS SETUP COMPLETE!');
    console.log('\n📋 Login credentials for ALL depot admins:');
    console.log('   Password: admin123');
    console.log('   Role: depot\n');
    
    for (const admin of summary) {
      console.log(`   ${admin.location}:`);
      console.log(`      Username: ${admin.username}`);
      console.log(`      Depot: ${admin.depot_name}`);
      console.log(`      Schedules: ${admin.schedules_count}, Drivers: ${admin.drivers_count}, Buses: ${admin.buses_count}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Setup error:', error);
    process.exit(1);
  }
}

setupAllDepots();
