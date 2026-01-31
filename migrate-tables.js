const mysql = require('mysql2');
require('dotenv').config();

const conn = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ksrtc_smart_transport'
});

conn.connect((err) => {
  if (err) {
    console.error('Connection error:', err.message);
    process.exit(1);
  }

  console.log('Adding driver_id column to schedules...\n');

  // Check if column already exists and add if not
  conn.query(`ALTER TABLE schedules ADD COLUMN driver_id INT`, (err) => {
    if (err && err.code !== 'ER_DUP_FIELDNAME') {
      console.log('Error adding driver_id:', err.code);
    } else if (!err) {
      console.log('✓ driver_id column added');
    } else {
      console.log('↻ driver_id column already exists');
    }

    // Also add crowd_level to buses if needed
    conn.query(`ALTER TABLE buses ADD COLUMN crowd_level VARCHAR(20) DEFAULT 'MEDIUM'`, (err) => {
      if (err && err.code !== 'ER_DUP_FIELDNAME') {
        console.log('Error adding crowd_level:', err.code);
      } else if (!err) {
        console.log('✓ crowd_level column added');
      } else {
        console.log('↻ crowd_level column already exists');
      }

      // Add foreign key if needed
      conn.query(`
        ALTER TABLE schedules 
        ADD CONSTRAINT fk_schedule_driver_id FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE SET NULL
      `, (err) => {
        if (err && err.code !== 'ER_DUP_KEY_NAME') {
          console.log('⚠ Foreign key issue (might already exist):', err.code);
        }
        
        console.log('\n✅ Migration complete!');
        conn.end();
        process.exit(0);
      });
    });
  });
});
