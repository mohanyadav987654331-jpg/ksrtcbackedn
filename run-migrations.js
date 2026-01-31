const mysql = require('mysql2/promise');

async function runMigrations() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'ksrtc_smart_transport'
  });

  console.log('🔄 Running database migrations...\n');

  try {
    // Create driver_assignments table
    console.log('📋 Creating driver_assignments table...');
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS driver_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        driver_id INT NOT NULL,
        schedule_id INT NOT NULL,
        bus_id INT NOT NULL,
        depot_id INT NOT NULL,
        assigned_date DATE NOT NULL,
        status ENUM('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'ASSIGNED',
        started_at TIMESTAMP NULL,
        completed_at TIMESTAMP NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
        FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE CASCADE,
        FOREIGN KEY (depot_id) REFERENCES depots(id) ON DELETE CASCADE,
        UNIQUE KEY unique_assignment (driver_id, schedule_id, assigned_date),
        INDEX idx_driver_date (driver_id, assigned_date),
        INDEX idx_schedule_date (schedule_id, assigned_date)
      )
    `);
    console.log('✅ driver_assignments table created\n');

    // Create bus_tracking table
    console.log('📋 Creating bus_tracking table...');
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS bus_tracking (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bus_id INT NOT NULL,
        schedule_id INT NOT NULL,
        current_latitude DECIMAL(10, 8),
        current_longitude DECIMAL(10, 8),
        current_location_name VARCHAR(100),
        status ENUM('SCHEDULED', 'ARRIVING', 'AT_STOP', 'IN_TRANSIT', 'COMPLETED', 'DELAYED') DEFAULT 'SCHEDULED',
        last_stop_reached INT,
        last_stop_time TIMESTAMP,
        estimated_delay_minutes INT DEFAULT 0,
        current_passengers INT DEFAULT 0,
        capacity INT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE CASCADE,
        FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
        INDEX bus_tracking_idx (bus_id, schedule_id),
        UNIQUE KEY unique_tracking (bus_id, schedule_id)
      )
    `);
    console.log('✅ bus_tracking table created\n');

    // Create schedule_stops_tracking table
    console.log('📋 Creating schedule_stops_tracking table...');
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS schedule_stops_tracking (
        id INT AUTO_INCREMENT PRIMARY KEY,
        schedule_id INT NOT NULL,
        stop_order INT NOT NULL,
        stop_name VARCHAR(100),
        estimated_arrival_time TIME,
        actual_arrival_time TIME NULL,
        passengers_boarded INT DEFAULT 0,
        passengers_alighted INT DEFAULT 0,
        dwell_time_seconds INT DEFAULT 0,
        status ENUM('PENDING', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED') DEFAULT 'PENDING',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
        UNIQUE KEY unique_stop (schedule_id, stop_order),
        INDEX idx_schedule_stop (schedule_id, stop_order)
      )
    `);
    console.log('✅ schedule_stops_tracking table created\n');

    // Add depot_id to schedules if not exists
    console.log('📋 Adding depot_id to schedules...');
    try {
      await conn.execute(`
        ALTER TABLE schedules ADD COLUMN depot_id INT
      `);
      await conn.execute(`
        ALTER TABLE schedules ADD FOREIGN KEY (depot_id) REFERENCES depots(id) ON DELETE SET NULL
      `);
      console.log('✅ depot_id added to schedules\n');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  depot_id already exists in schedules\n');
      } else {
        throw e;
      }
    }

    // Add depot_id to users if not exists
    console.log('📋 Adding depot_id to users...');
    try {
      await conn.execute(`
        ALTER TABLE users ADD COLUMN depot_id INT
      `);
      await conn.execute(`
        ALTER TABLE users ADD FOREIGN KEY (depot_id) REFERENCES depots(id) ON DELETE SET NULL
      `);
      console.log('✅ depot_id added to users\n');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  depot_id already exists in users\n');
      } else {
        throw e;
      }
    }

    // Create main depots
    console.log('📋 Creating depots...');
    const depotData = [
      ['Bangalore Depot', 'Bangalore Central', 'Bangalore', 12.9716, 77.5946],
      ['Mysore Depot', 'Mysore Central', 'Mysore', 12.2958, 76.6394],
      ['Hosur Depot', 'Hosur Central', 'Hosur', 12.7438, 77.8309],
      ['Kolar Depot', 'Kolar Central', 'Kolar', 13.1439, 78.1288],
      ['Kollegal Depot', 'Kollegal Central', 'Kollegal', 12.8058, 77.6436],
      ['Ramanagara Depot', 'Ramanagara Central', 'Ramanagara', 12.7273, 77.3006],
      ['Bidadi Depot', 'Bidadi Central', 'Bidadi', 12.8331, 77.4389],
      ['Channapatna Depot', 'Channapatna Central', 'Channapatna', 12.7018, 77.2746],
      ['Maddur Depot', 'Maddur Central', 'Maddur', 12.6244, 77.0827],
      ['Mandya Depot', 'Mandya Central', 'Mandya', 12.6658, 76.1794],
      ['Kanakapura Depot', 'Kanakapura Central', 'Kanakapura', 12.9187, 77.1419],
      ['Harohalli Depot', 'Harohalli Central', 'Harohalli', 13.0043, 77.0881],
      ['Tumkur Depot', 'Tumkur Central', 'Tumkur', 13.2149, 75.2206],
      ['Srirangapatna Depot', 'Srirangapatna Central', 'Srirangapatna', 12.4159, 76.6790],
    ];

    for (const depot of depotData) {
      try {
        await conn.execute(`
          INSERT INTO depots (depot_name, location, latitude, longitude)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE id = id
        `, depot);
      } catch (e) {
        if (e.code !== 'ER_DUP_ENTRY') {
          throw e;
        }
      }
    }
    console.log('✅ Depots created\n');

    console.log('🎉 All migrations completed successfully!\n');
    console.log('Next steps:');
    console.log('1. Run: node backend/create-test-users.js');
    console.log('2. Start the server: npm start');
    console.log('3. Run the Flutter app: flutter run -d windows\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await conn.end();
  }
}

runMigrations();
