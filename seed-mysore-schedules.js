#!/usr/bin/env node
const db = require('./config/database');

// Seeds a handful of schedules for Mysore Central Depot (depot_id = 33)
// Run manually: node seed-mysore-schedules.js
async function main() {
  const DEPOT_ID = 33;
  const routes = [
    { id: 213, depart: '06:00:00', arrive: '08:30:00' }, // Bangalore -> Mysore
    { id: 214, depart: '09:00:00', arrive: '11:30:00' }, // Bangalore -> Mysore (express)
    { id: 215, depart: '12:00:00', arrive: '14:20:00' }, // Mysore -> Bangalore
    { id: 216, depart: '15:00:00', arrive: '17:20:00' }, // Mysore -> Bangalore (express)
    { id: 230, depart: '18:00:00', arrive: '19:30:00' }, // Mysore -> Ramanagara
    { id: 231, depart: '20:00:00', arrive: '21:30:00' }, // Ramanagara -> Mysore
    { id: 235, depart: '07:30:00', arrive: '08:15:00' }, // Mysore -> Srirangapatna
    { id: 236, depart: '19:45:00', arrive: '20:30:00' }, // Srirangapatna -> Mysore
  ];

  try {
    const [drivers] = await db.query(
      'SELECT id FROM users WHERE role = ? AND depot_id = ? LIMIT 1',
      ['driver', DEPOT_ID]
    );
    if (drivers.length === 0) throw new Error('No driver for depot 33');
    const driverId = drivers[0].id;

    const [buses] = await db.query(
      'SELECT id FROM buses WHERE depot_id = ? ORDER BY id LIMIT 3',
      [DEPOT_ID]
    );
    if (buses.length === 0) throw new Error('No buses for depot 33');

    const schedules = routes.map((r, idx) => ({
      route_id: r.id,
      bus_id: buses[idx % buses.length].id,
      departure_time: r.depart,
      arrival_time: r.arrive,
      driver_id: driverId,
      depot_id: DEPOT_ID,
    }));

    const values = schedules.map(s => [
      s.route_id,
      s.bus_id,
      s.departure_time,
      s.arrival_time,
      'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
      1,
      s.driver_id,
      s.depot_id,
    ]);

    const sql = `INSERT INTO schedules 
      (route_id, bus_id, departure_time, arrival_time, days_of_week, is_active, driver_id, depot_id)
      VALUES ?`;

    const [result] = await db.query(sql, [values]);
    console.log(`✅ Inserted ${result.affectedRows} schedules for Mysore (depot 33)`);
  } catch (err) {
    console.error('❌ Failed to seed Mysore schedules:', err.message);
  } finally {
    process.exit(0);
  }
}

main();
