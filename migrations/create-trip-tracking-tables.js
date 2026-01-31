const mysql = require('mysql2/promise');

async function createTripTrackingTables() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'ksrtc_smart_transport'
  });

  try {
    console.log('🔧 Creating trip tracking tables...\n');

    // 1. Create trip_assignments table
    console.log('📋 Creating trip_assignments table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS trip_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        schedule_id INT NOT NULL,
        assigned_date DATE NOT NULL,
        driver_id INT NOT NULL,
        bus_id INT NOT NULL,
        depot_id INT NOT NULL,
        status ENUM('ASSIGNED', 'CANCELLED') DEFAULT 'ASSIGNED',
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        UNIQUE KEY unique_assignment (schedule_id, assigned_date),
        FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
        FOREIGN KEY (driver_id) REFERENCES users(id),
        FOREIGN KEY (bus_id) REFERENCES buses(id),
        FOREIGN KEY (depot_id) REFERENCES depots(id),
        FOREIGN KEY (created_by) REFERENCES users(id),
        
        INDEX idx_driver_date (driver_id, assigned_date),
        INDEX idx_depot_date (depot_id, assigned_date),
        INDEX idx_bus_date (bus_id, assigned_date),
        INDEX idx_status (status),
        INDEX idx_schedule (schedule_id)
      )
    `);
    console.log('✅ trip_assignments table created');

    // 2. Create active_trips table
    console.log('📋 Creating active_trips table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS active_trips (
        id INT AUTO_INCREMENT PRIMARY KEY,
        trip_assignment_id INT,
        schedule_id INT NOT NULL,
        driver_id INT NOT NULL,
        bus_id INT NOT NULL,
        
        status ENUM('SCHEDULED', 'STARTED', 'COMPLETED', 'CANCELLED') DEFAULT 'SCHEDULED',
        
        actual_start_time DATETIME,
        actual_end_time DATETIME,
        
        current_lat DECIMAL(10, 8),
        current_lng DECIMAL(11, 8),
        current_speed_kmph DECIMAL(5, 2),
        last_location_update TIMESTAMP,
        
        crowd_level INT DEFAULT 0,
        delay_minutes INT DEFAULT 0,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (trip_assignment_id) REFERENCES trip_assignments(id) ON DELETE SET NULL,
        FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
        FOREIGN KEY (driver_id) REFERENCES users(id),
        FOREIGN KEY (bus_id) REFERENCES buses(id),
        
        INDEX idx_driver (driver_id),
        INDEX idx_bus (bus_id),
        INDEX idx_status (status),
        INDEX idx_start_time (actual_start_time),
        INDEX idx_location (current_lat, current_lng),
        INDEX idx_assignment (trip_assignment_id)
      )
    `);
    console.log('✅ active_trips table created');

    // 3. Check if schedules table needs update
    console.log('📋 Checking schedules table structure...');
    const [columns] = await conn.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'ksrtc_smart_transport' 
        AND TABLE_NAME = 'schedules'
    `);

    const columnNames = columns.map(c => c.COLUMN_NAME);
    
    if (!columnNames.includes('is_active')) {
      await conn.query('ALTER TABLE schedules ADD COLUMN is_active TINYINT(1) DEFAULT 1');
      console.log('✅ Added is_active column to schedules');
    } else {
      console.log('✅ is_active column already exists');
    }

    // 4. Verify tables exist
    const [tables] = await conn.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'ksrtc_smart_transport'
        AND TABLE_NAME IN ('trip_assignments', 'active_trips', 'schedules')
    `);

    console.log(`\n✅ Total tables ready: ${tables.length}`);
    console.log('   ✓ trip_assignments');
    console.log('   ✓ active_trips');
    console.log('   ✓ schedules');

    console.log('\n✅ Trip tracking system ready!\n');
    await conn.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    await conn.end();
    process.exit(1);
  }
}

createTripTrackingTables();
