const mysql = require('mysql2/promise');

async function assignSchedulesToDriver() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'ksrtc_smart_transport'
  });

  try {
    console.log('🔧 Assigning schedules to driver2...\n');

    // Get driver2 ID
    const [drivers] = await conn.query("SELECT id, full_name FROM users WHERE role = 'driver' AND username = 'driver2' LIMIT 1");
    
    if (drivers.length === 0) {
      console.log('❌ driver2 not found');
      await conn.end();
      process.exit(1);
    }
    
    const driverId = drivers[0].id;
    console.log(`✅ Found driver: ${drivers[0].full_name} (ID: ${driverId})`);

    // Get available buses
    const [buses] = await conn.query("SELECT id, bus_number, number_plate FROM buses WHERE is_active = 1 LIMIT 3");
    console.log(`✅ Found ${buses.length} available buses`);

    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Assigning for date: ${today}\n`);

    // Get active schedules (not filtered by date, these are recurring schedules)
    const [schedules] = await conn.query(`
      SELECT s.id, s.route_id, s.departure_time, s.arrival_time, s.depot_id,
             r.route_name, r.origin, r.destination
      FROM schedules s
      INNER JOIN routes r ON s.route_id = r.id
      WHERE s.is_active = 1
      LIMIT 5
    `);

    if (schedules.length === 0) {
      console.log('❌ No active schedules found');
      await conn.end();
      process.exit(1);
    }

    console.log(`✅ Found ${schedules.length} active schedules\n`);

    // Delete existing assignments for today to avoid duplicates
    await conn.query('DELETE FROM driver_assignments WHERE assigned_date = ?', [today]);

    // Assign schedules to driver for today
    let assigned = 0;
    for (let i = 0; i < Math.min(schedules.length, 3); i++) {
      const schedule = schedules[i];
      const bus = buses[i % buses.length];
      
      await conn.query(`
        INSERT INTO driver_assignments (schedule_id, driver_id, bus_id, assigned_date, status)
        VALUES (?, ?, ?, ?, 'ASSIGNED')
      `, [schedule.id, driverId, bus.id, today]);
      
      console.log(`✅ Assigned Schedule #${schedule.id}: ${schedule.origin} → ${schedule.destination} (${schedule.departure_time})`);
      console.log(`   Driver: ${drivers[0].full_name}, Bus: ${bus.bus_number} (${bus.number_plate})`);
      assigned++;
    }

    console.log(`\n✅ Successfully assigned ${assigned} schedules to driver2 for today!`);
    console.log('🚀 Driver can now see these trips in their dashboard');
    
    await conn.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await conn.end();
    process.exit(1);
  }
}

assignSchedulesToDriver();
