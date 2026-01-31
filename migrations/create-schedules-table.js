const mysql = require('mysql2/promise');

async function createSchedulesTable() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'ksrtc_smart_transport'
  });

  try {
    console.log('🔧 Creating schedules and trip assignments table...\n');

    // Create schedules table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS schedules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        route_id INT NOT NULL,
        bus_id INT,
        driver_id INT,
        depot_id INT NOT NULL,
        departure_time TIME NOT NULL,
        arrival_time TIME NOT NULL,
        scheduled_date DATE NOT NULL,
        status ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'SCHEDULED',
        actual_departure_time DATETIME,
        actual_arrival_time DATETIME,
        crowd_level VARCHAR(20),
        delay_minutes INT DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_route (route_id),
        INDEX idx_driver (driver_id),
        INDEX idx_depot (depot_id),
        INDEX idx_date (scheduled_date),
        INDEX idx_status (status),
        FOREIGN KEY (route_id) REFERENCES routes(id),
        FOREIGN KEY (bus_id) REFERENCES buses(id),
        FOREIGN KEY (driver_id) REFERENCES drivers(id),
        FOREIGN KEY (depot_id) REFERENCES depots(id)
      )
    `);
    console.log('✅ Schedules table created');

    // Check if table has data
    const [count] = await conn.query('SELECT COUNT(*) as total FROM schedules');
    console.log(`📊 Total schedules: ${count[0].total}`);

    if (count[0].total === 0) {
      // Insert sample schedules for today and tomorrow
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      await conn.query(`
        INSERT INTO schedules (route_id, depot_id, departure_time, arrival_time, scheduled_date, status)
        VALUES 
          (1, 1, '06:00:00', '08:00:00', '${today}', 'SCHEDULED'),
          (1, 1, '09:00:00', '11:00:00', '${today}', 'SCHEDULED'),
          (1, 1, '14:00:00', '16:00:00', '${today}', 'SCHEDULED'),
          (2, 1, '07:00:00', '09:30:00', '${today}', 'SCHEDULED'),
          (2, 1, '12:00:00', '14:30:00', '${today}', 'SCHEDULED'),
          (1, 1, '06:00:00', '08:00:00', '${tomorrow}', 'SCHEDULED'),
          (2, 1, '07:00:00', '09:30:00', '${tomorrow}', 'SCHEDULED')
      `);
      console.log('✅ Sample schedules inserted');
    }

    console.log('\n✅ Schedules table is ready!');
    await conn.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await conn.end();
    process.exit(1);
  }
}

createSchedulesTable();
