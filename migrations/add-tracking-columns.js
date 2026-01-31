// Migration: Add location columns to existing tables if missing
// Run with: node backend/migrations/add-tracking-columns.js

const mysql = require('mysql2/promise');
const db = require('../config/database');

async function runMigration() {
  console.log('🚀 Starting migration: Add tracking columns...\n');

  try {
    // 1. Add columns to buses table if missing
    console.log('1️⃣  Checking buses table...');
    const [currentLatExists] = await db.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'buses' AND COLUMN_NAME = 'current_lat'
    `);

    if (currentLatExists[0].count === 0) {
      console.log('   Adding GPS columns to buses table...');
      await db.query(`
        ALTER TABLE buses
        ADD COLUMN current_lat DECIMAL(10, 8) DEFAULT 0,
        ADD COLUMN current_lng DECIMAL(11, 8) DEFAULT 0,
        ADD COLUMN speedKmph DECIMAL(5, 2) DEFAULT 0,
        ADD COLUMN is_on_trip TINYINT(1) DEFAULT 0
      `);
      console.log('   ✅ GPS columns added to buses table');
    } else {
      console.log('   ✅ GPS columns already exist in buses table');
    }

    // 2. Create bus_stops table if missing
    console.log('\n2️⃣  Checking bus_stops table...');
    const [busStopsExists] = await db.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bus_stops'
    `);

    if (busStopsExists[0].count === 0) {
      console.log('   Creating bus_stops table...');
      await db.query(`
        CREATE TABLE bus_stops (
          id INT PRIMARY KEY AUTO_INCREMENT,
          stop_name VARCHAR(100) NOT NULL,
          latitude DECIMAL(10, 8) NOT NULL,
          longitude DECIMAL(11, 8) NOT NULL,
          address TEXT,
          city VARCHAR(50),
          is_active TINYINT(1) DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_location (latitude, longitude),
          INDEX idx_city (city),
          INDEX idx_active (is_active)
        )
      `);
      console.log('   ✅ bus_stops table created');
    } else {
      console.log('   ✅ bus_stops table already exists');
    }

    // 3. Create route_stops table if missing
    console.log('\n3️⃣  Checking route_stops table...');
    const [routeStopsExists] = await db.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'route_stops'
    `);

    if (routeStopsExists[0].count === 0) {
      console.log('   Creating route_stops table...');
      await db.query(`
        CREATE TABLE route_stops (
          id INT PRIMARY KEY AUTO_INCREMENT,
          route_id INT NOT NULL,
          stop_name VARCHAR(100) NOT NULL,
          stop_order INT NOT NULL,
          latitude DECIMAL(10, 8) NOT NULL,
          longitude DECIMAL(11, 8) NOT NULL,
          estimated_minutes_from_origin INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
          INDEX idx_route (route_id),
          INDEX idx_location (latitude, longitude),
          INDEX idx_order (stop_order)
        )
      `);
      console.log('   ✅ route_stops table created');
    } else {
      console.log('   ✅ route_stops table already exists');
    }

    // 4. Verify/Add latitude/longitude to depots
    console.log('\n4️⃣  Checking depots table...');
    const [depotsLatExists] = await db.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'depots' AND COLUMN_NAME = 'latitude'
    `);

    if (depotsLatExists[0].count === 0) {
      console.log('   Adding coordinates to depots table...');
      await db.query(`
        ALTER TABLE depots
        ADD COLUMN latitude DECIMAL(10, 8) DEFAULT 0,
        ADD COLUMN longitude DECIMAL(11, 8) DEFAULT 0
      `);
      console.log('   ✅ Coordinates added to depots table');
    } else {
      console.log('   ✅ Coordinates already exist in depots table');
    }

    // 5. Verify active_trips table
    console.log('\n5️⃣  Checking active_trips table...');
    const [activeTripsExists] = await db.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'active_trips'
    `);

    if (activeTripsExists[0].count === 0) {
      console.log('   Creating active_trips table...');
      await db.query(`
        CREATE TABLE active_trips (
          id INT PRIMARY KEY AUTO_INCREMENT,
          trip_assignment_id INT,
          schedule_id INT NOT NULL,
          driver_id INT NOT NULL,
          bus_id INT NOT NULL,
          status ENUM('STARTED', 'COMPLETED') DEFAULT 'STARTED',
          current_lat DECIMAL(10, 8) DEFAULT 0,
          current_lng DECIMAL(11, 8) DEFAULT 0,
          current_speed_kmph DECIMAL(5, 2) DEFAULT 0,
          crowd_level INT DEFAULT 0,
          delay_minutes INT DEFAULT 0,
          actual_start_time TIMESTAMP NULL,
          actual_end_time TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (schedule_id) REFERENCES schedules(id),
          FOREIGN KEY (driver_id) REFERENCES users(id),
          FOREIGN KEY (bus_id) REFERENCES buses(id),
          INDEX idx_status (status),
          INDEX idx_driver (driver_id),
          INDEX idx_bus (bus_id),
          INDEX idx_location (current_lat, current_lng)
        )
      `);
      console.log('   ✅ active_trips table created');
    } else {
      console.log('   ✅ active_trips table already exists');
    }

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
  }
}

runMigration();
