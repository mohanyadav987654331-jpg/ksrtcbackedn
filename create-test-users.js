const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function createTestUsers() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'ksrtc_smart_transport'
  });

  console.log('👤 Creating test users...\n');

  try {
    // Create Super Admin
    console.log('📋 Creating Super Admin...');
    const superAdminPassword = await bcrypt.hash('admin123', 10);
    try {
      await conn.execute(
        `INSERT INTO users (username, email, phone, password_hash, role, full_name) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['superadmin', 'admin@ksrtc.com', '9999999999', superAdminPassword, 'super_admin', 'KSRTC Admin']
      );
      console.log('✅ Super Admin created: superadmin / admin123\n');
    } catch (e) {
      console.log('⚠️  Super Admin already exists\n');
    }

    // Get all depots
    const [depots] = await conn.query('SELECT id, location FROM depots');
    console.log(`📍 Found ${depots.length} depots\n`);

    // Create Depot Admin and Drivers for each depot
    for (const depot of depots) {
      const depotName = depot.location;
      console.log(`📋 Setting up depot: ${depotName}`);

      // Create Depot Admin
      const depotAdminPassword = await bcrypt.hash('depot123', 10);
      const depotAdminUsername = `admin_${depotName.toLowerCase().replace(/\s+/g, '_')}`;
      
      try {
        const [result] = await conn.execute(
          `INSERT INTO users (username, email, phone, password_hash, role, full_name, depot_id) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            depotAdminUsername,
            `${depotName.toLowerCase().replace(/\s+/g, '_')}@ksrtc.com`,
            '9000000000',
            depotAdminPassword,
            'depot_admin',
            `${depotName} Depot Manager`,
            depot.id
          ]
        );
        console.log(`  ✅ Depot Admin: ${depotAdminUsername} / depot123`);
      } catch (e) {
        if (e.code !== 'ER_DUP_ENTRY') {
          console.log(`  ⚠️  Depot Admin already exists`);
        }
      }

      // Create 3 drivers for each depot
      for (let i = 1; i <= 3; i++) {
        const driverPassword = await bcrypt.hash('driver123', 10);
        const driverUsername = `driver_${depotName.toLowerCase().replace(/\s+/g, '_')}_${i}`;
        
        try {
          await conn.execute(
            `INSERT INTO users (username, email, phone, password_hash, role, full_name, depot_id, license_number) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              driverUsername,
              `${driverUsername}@ksrtc.com`,
              `900000000${i}`,
              driverPassword,
              'driver',
              `Driver ${i} - ${depotName}`,
              depot.id,
              `DL${depot.id}${i}`.padEnd(10, '0')
            ]
          );
          console.log(`  ✅ Driver ${i}: ${driverUsername} / driver123`);
        } catch (e) {
          if (e.code !== 'ER_DUP_ENTRY') {
            console.log(`  ⚠️  Driver ${i} already exists`);
          }
        }
      }

      console.log('');
    }

    // Create a regular user for testing
    console.log('📋 Creating Regular User...');
    const userPassword = await bcrypt.hash('user123', 10);
    try {
      await conn.execute(
        `INSERT INTO users (username, email, phone, password_hash, role, full_name) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['testuser', 'user@ksrtc.com', '9888888888', userPassword, 'user', 'Test User']
      );
      console.log('✅ Regular User created: testuser / user123\n');
    } catch (e) {
      console.log('⚠️  Regular User already exists\n');
    }

    console.log('🎉 Test users created successfully!\n');
    console.log('📝 Test Credentials:\n');
    console.log('Super Admin:');
    console.log('  Username: superadmin');
    console.log('  Password: admin123');
    console.log('  Role: super_admin\n');

    console.log('Depot Admins (for each depot):');
    for (const depot of depots) {
      const depotAdminUsername = `admin_${depot.location_string.toLowerCase().replace(/\s+/g, '_')}`;
      console.log(`  Username: ${depotAdminUsername}`);
      console.log(`  Password: depot123`);
      console.log(`  Depot: ${depot.location_string}\n`);
    }

    console.log('Drivers (3 per depot):');
    console.log('  Username: driver_<depot>_<number>');
    console.log('  Password: driver123\n');

    console.log('Regular User:');
    console.log('  Username: testuser');
    console.log('  Password: user123\n');

  } catch (error) {
    console.error('❌ Error creating test users:', error.message);
  } finally {
    await conn.end();
  }
}

createTestUsers();
