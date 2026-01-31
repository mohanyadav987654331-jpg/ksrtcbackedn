#!/usr/bin/env node
/**
 * COMPREHENSIVE ALL-DEPOTS SEEDER
 * Seeds ALL 12 depot locations with:
 * - Buses (3-10 per depot)
 * - Drivers (1-3 per depot)  
 * - Routes (based on depot location)
 * - Schedules (6-15 daily schedules per depot)
 * 
 * Run: node seed-all-depots-complete.js
 */

const bcrypt = require('bcryptjs');
const db = require('./config/database');

// All depot locations with their IDs
const DEPOTS = [
  { id: 30, name: 'Bangalore Central Depot', location: 'Bangalore', code: 'BLR' },
  { id: 31, name: 'Bangalore North Depot', location: 'Bangalore', code: 'BLN' },
  { id: 32, name: 'Bangalore South Depot', location: 'Bangalore', code: 'BLS' },
  { id: 33, name: 'Mysore Central Depot', location: 'Mysore', code: 'MYS' },
  { id: 34, name: 'Bidadi Depot', location: 'Bidadi', code: 'BID' },
  { id: 35, name: 'Ramanagara Depot', location: 'Ramanagara', code: 'RMN' },
  { id: 36, name: 'Kolar Depot', location: 'Kolar', code: 'KLR' },
  { id: 37, name: 'Hosur Depot', location: 'Hosur', code: 'HSR' },
  { id: 38, name: 'Kollegal Depot', location: 'Kollegal', code: 'KLG' },
  { id: 39, name: 'Maddur Depot', location: 'Maddur', code: 'MAD' },
  { id: 40, name: 'Srirangapatna Depot', location: 'Srirangapatna', code: 'SRP' },
  { id: 41, name: 'Malavalli Depot', location: 'Malavalli', code: 'MLV' },
  { id: 42, name: 'Kanakapura Depot', location: 'Kanakapura', code: 'KNK' },
  { id: 43, name: 'Harohalli Depot', location: 'Harohalli', code: 'HRH' },
];

// Route templates - realistic routes based on Karnataka geography
const ROUTE_TEMPLATES = {
  'Bangalore': [
    { origin: 'Bangalore', destination: 'Mysore', distance: 140, duration: 180 },
    { origin: 'Bangalore', destination: 'Kolar', distance: 68, duration: 90 },
    { origin: 'Bangalore', destination: 'Hosur', distance: 45, duration: 60 },
    { origin: 'Bangalore', destination: 'Ramanagara', distance: 50, duration: 60 },
    { origin: 'Bangalore', destination: 'Bidadi', distance: 30, duration: 45 },
  ],
  'Mysore': [
    { origin: 'Mysore', destination: 'Bangalore', distance: 140, duration: 180 },
    { origin: 'Mysore', destination: 'Srirangapatna', distance: 18, duration: 30 },
    { origin: 'Mysore', destination: 'Kollegal', distance: 85, duration: 120 },
    { origin: 'Mysore', destination: 'Maddur', distance: 80, duration: 90 },
  ],
  'Bidadi': [
    { origin: 'Bidadi', destination: 'Bangalore', distance: 30, duration: 45 },
    { origin: 'Bidadi', destination: 'Ramanagara', distance: 20, duration: 30 },
  ],
  'Ramanagara': [
    { origin: 'Ramanagara', destination: 'Bangalore', distance: 50, duration: 60 },
    { origin: 'Ramanagara', destination: 'Mysore', distance: 90, duration: 120 },
    { origin: 'Ramanagara', destination: 'Maddur', distance: 35, duration: 45 },
  ],
  'Kolar': [
    { origin: 'Kolar', destination: 'Bangalore', distance: 68, duration: 90 },
    { origin: 'Kolar', destination: 'Hosur', distance: 85, duration: 105 },
  ],
  'Hosur': [
    { origin: 'Hosur', destination: 'Bangalore', distance: 45, duration: 60 },
    { origin: 'Hosur', destination: 'Kolar', distance: 85, duration: 105 },
  ],
  'Kollegal': [
    { origin: 'Kollegal', destination: 'Mysore', distance: 85, duration: 120 },
    { origin: 'Kollegal', destination: 'Bangalore', distance: 180, duration: 240 },
  ],
  'Maddur': [
    { origin: 'Maddur', destination: 'Bangalore', distance: 90, duration: 120 },
    { origin: 'Maddur', destination: 'Mysore', distance: 80, duration: 90 },
    { origin: 'Maddur', destination: 'Ramanagara', distance: 35, duration: 45 },
  ],
  'Srirangapatna': [
    { origin: 'Srirangapatna', destination: 'Mysore', distance: 18, duration: 30 },
    { origin: 'Srirangapatna', destination: 'Bangalore', distance: 120, duration: 150 },
  ],
  'Malavalli': [
    { origin: 'Malavalli', destination: 'Bangalore', distance: 115, duration: 150 },
    { origin: 'Malavalli', destination: 'Mysore', distance: 95, duration: 120 },
  ],
  'Kanakapura': [
    { origin: 'Kanakapura', destination: 'Bangalore', distance: 55, duration: 75 },
    { origin: 'Kanakapura', destination: 'Ramanagara', distance: 30, duration: 40 },
  ],
  'Harohalli': [
    { origin: 'Harohalli', destination: 'Bangalore', distance: 35, duration: 50 },
    { origin: 'Harohalli', destination: 'Bidadi', distance: 10, duration: 15 },
  ],
};

// Schedule templates - realistic departure times
const DEPARTURE_TIMES = [
  '05:00:00', '05:30:00', '06:00:00', '06:30:00', '07:00:00', '07:30:00',
  '08:00:00', '08:30:00', '09:00:00', '10:00:00', '11:00:00', '12:00:00',
  '13:00:00', '14:00:00', '15:00:00', '16:00:00', '17:00:00', '18:00:00',
  '19:00:00', '20:00:00', '21:00:00', '22:00:00'
];

function calculateArrivalTime(departureTime, durationMinutes) {
  const [hours, minutes] = departureTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const arrHours = Math.floor(totalMinutes / 60) % 24;
  const arrMinutes = totalMinutes % 60;
  return `${String(arrHours).padStart(2, '0')}:${String(arrMinutes).padStart(2, '0')}:00`;
}

async function seedAllDepots() {
  console.log('═'.repeat(80));
  console.log('🚌 COMPREHENSIVE ALL-DEPOTS SEEDER');
  console.log('═'.repeat(80));

  const hashedPassword = await bcrypt.hash('admin123', 10);

  for (const depot of DEPOTS) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`📍 Processing: ${depot.name} (${depot.location})`);
    console.log(`${'─'.repeat(80)}`);

    try {
      // 1. ENSURE DRIVERS EXIST
      const [existingDrivers] = await db.query(
        `SELECT id, username FROM users WHERE depot_id = ? AND role = 'driver'`,
        [depot.id]
      );

      let driverIds = existingDrivers.map(d => d.id);

      if (driverIds.length === 0) {
        console.log('   👨‍✈️  Creating drivers...');
        const driverCount = depot.location === 'Bangalore' ? 3 : (depot.location === 'Mysore' ? 2 : 1);
        
        for (let i = 1; i <= driverCount; i++) {
          const [result] = await db.query(`
            INSERT INTO users (username, full_name, email, password_hash, phone, role, depot_id, is_active)
            VALUES (?, ?, ?, ?, ?, 'driver', ?, 1)
          `, [
            `driver_${depot.location.toLowerCase()}_${i}`,
            `${depot.location} Driver ${i}`,
            `driver${i}_${depot.location.toLowerCase()}@ksrtc.com`,
            hashedPassword,
            `9${String(depot.id).padStart(9, '0')}`+ i,
            depot.id
          ]);
          driverIds.push(result.insertId);
        }
        console.log(`   ✅ Created ${driverCount} driver(s)`);
      } else {
        console.log(`   ✅ Found ${driverIds.length} existing driver(s)`);
      }

      // 2. ENSURE BUSES EXIST
      const [existingBuses] = await db.query(
        `SELECT id, bus_number FROM buses WHERE depot_id = ?`,
        [depot.id]
      );

      let busIds = existingBuses.map(b => b.id);

      if (busIds.length < 3) {
        console.log('   🚌 Creating buses...');
        const busCount = depot.location === 'Bangalore' ? 8 : (depot.location === 'Mysore' ? 5 : 3);
        const busesToCreate = busCount - busIds.length;
        
        for (let i = busIds.length + 1; i <= busCount; i++) {
          const busType = i % 3 === 0 ? 'EXPRESS' : 'NORMAL';
          const [result] = await db.query(`
            INSERT INTO buses (bus_number, bus_type, capacity, depot_id, status)
            VALUES (?, ?, ?, ?, 'ACTIVE')
          `, [
            `${depot.code}-${String(depot.id).slice(-2)}${String(i).padStart(2, '0')}`,
            busType,
            busType === 'EXPRESS' ? 40 : 50,
            depot.id
          ]);
          busIds.push(result.insertId);
        }
        console.log(`   ✅ Created ${busesToCreate} bus(es), total now: ${busIds.length}`);
      } else {
        console.log(`   ✅ Found ${busIds.length} existing bus(es)`);
      }

      // 3. GET OR CREATE ROUTES FOR THIS DEPOT
      const routeTemplates = ROUTE_TEMPLATES[depot.location] || [];
      const routeIds = [];

      console.log(`   🛣️  Processing ${routeTemplates.length} route(s)...`);

      for (const template of routeTemplates) {
        const [existingRoute] = await db.query(`
          SELECT id FROM routes 
          WHERE origin = ? AND destination = ? 
          LIMIT 1
        `, [template.origin, template.destination]);

        if (existingRoute.length > 0) {
          routeIds.push(existingRoute[0].id);
        } else {
          const routeNumber = `${template.origin.substring(0, 3).toUpperCase()}${template.destination.substring(0, 3).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`;
          const [result] = await db.query(`
            INSERT INTO routes (route_id, route_name, origin, destination, distance, estimated_duration, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 1)
          `, [
            routeNumber,
            `${template.origin} - ${template.destination}`,
            template.origin,
            template.destination,
            template.distance,
            template.duration
          ]);
          routeIds.push(result.insertId);
        }
      }
      console.log(`   ✅ Routes ready: ${routeIds.length}`);

      // 4. CREATE SCHEDULES
      console.log('   📅 Creating schedules...');
      
      const schedulesToCreate = Math.min(routeIds.length * 3, 15); // Max 15 schedules per depot
      let scheduleCount = 0;

      for (let i = 0; i < schedulesToCreate && i < routeIds.length * 3; i++) {
        const routeId = routeIds[i % routeIds.length];
        const busId = busIds[i % busIds.length];
        const driverId = driverIds[i % driverIds.length];
        
        const departureTime = DEPARTURE_TIMES[Math.floor(i * DEPARTURE_TIMES.length / schedulesToCreate)];
        
        // Get route duration
        const [routeInfo] = await db.query(`SELECT estimated_duration FROM routes WHERE id = ?`, [routeId]);
        const duration = routeInfo[0]?.estimated_duration || 120;
        const arrivalTime = calculateArrivalTime(departureTime, duration);

        // Check if schedule already exists
        const [existing] = await db.query(`
          SELECT id FROM schedules 
          WHERE route_id = ? AND departure_time = ? AND depot_id = ?
        `, [routeId, departureTime, depot.id]);

        if (existing.length === 0) {
          await db.query(`
            INSERT INTO schedules (route_id, bus_id, driver_id, departure_time, arrival_time, days_of_week, is_active, depot_id)
            VALUES (?, ?, ?, ?, ?, 'Mon,Tue,Wed,Thu,Fri,Sat,Sun', 1, ?)
          `, [routeId, busId, driverId, departureTime, arrivalTime, depot.id]);
          scheduleCount++;
        }
      }

      console.log(`   ✅ Created ${scheduleCount} schedule(s)`);

      // 5. SUMMARY
      const [summary] = await db.query(`
        SELECT 
          (SELECT COUNT(*) FROM users WHERE depot_id = ? AND role = 'driver') as drivers,
          (SELECT COUNT(*) FROM buses WHERE depot_id = ?) as buses,
          (SELECT COUNT(*) FROM schedules WHERE depot_id = ?) as schedules
      `, [depot.id, depot.id, depot.id]);

      console.log(`   📊 Final counts: ${summary[0].drivers} drivers, ${summary[0].buses} buses, ${summary[0].schedules} schedules`);

    } catch (error) {
      console.error(`   ❌ Error processing ${depot.location}:`, error.message);
    }
  }

  // FINAL SUMMARY
  console.log(`\n${'═'.repeat(80)}`);
  console.log('📊 FINAL SUMMARY - ALL DEPOTS');
  console.log(`${'═'.repeat(80)}`);

  const [finalSummary] = await db.query(`
    SELECT 
      d.location,
      d.depot_name,
      (SELECT COUNT(*) FROM users WHERE depot_id = d.id AND role = 'driver') as drivers,
      (SELECT COUNT(*) FROM buses WHERE depot_id = d.id) as buses,
      (SELECT COUNT(*) FROM schedules WHERE depot_id = d.id) as schedules
    FROM depots d
    WHERE d.id BETWEEN 30 AND 43
    ORDER BY d.location
  `);

  console.table(finalSummary);

  console.log(`\n✅ ALL DEPOTS SEEDED SUCCESSFULLY!`);
  console.log(`\n📝 Test any depot admin login:`);
  console.log(`   Username: admin_<location>  (e.g., admin_mysore)`);
  console.log(`   Password: admin123`);
  console.log(`   Role: DEPOT\n`);

  process.exit(0);
}

seedAllDepots().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
