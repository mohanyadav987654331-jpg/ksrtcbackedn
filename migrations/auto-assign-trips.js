// Assign today's schedules to all drivers automatically
const db = require('../config/database');

async function autoAssignTrips() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().getDay(); // 0=Sunday, 1=Monday, etc.
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[dayOfWeek];

    console.log(`Auto-assigning trips for ${today} (${todayName})`);

    // Get all active schedules for today
    const [schedules] = await db.query(`
      SELECT s.id as schedule_id, s.driver_id, s.bus_id, s.route_id,
             s.departure_time, s.arrival_time,
             r.origin, r.destination,
             u.full_name as driver_name,
             u.depot_id,
             b.bus_number
      FROM schedules s
      JOIN routes r ON s.route_id = r.id
      JOIN users u ON s.driver_id = u.id
      JOIN buses b ON s.bus_id = b.id
      WHERE s.is_active = 1
          AND (s.days_of_week IS NULL OR FIND_IN_SET(?, s.days_of_week) > 0)
      ORDER BY s.departure_time
    `, [todayName]);

    console.log(`Found ${schedules.length} schedules for today`);

    let tripAssigned = 0;
    let tripSkipped = 0;
    let driverAssigned = 0;
    let driverSkipped = 0;

    for (const schedule of schedules) {
      // Ensure trip_assignments entry exists
      const [existingTrip] = await db.query(
        'SELECT id FROM trip_assignments WHERE schedule_id = ? AND assigned_date = ?',
        [schedule.schedule_id, today]
      );

      if (existingTrip.length === 0) {
        await db.query(`
          INSERT INTO trip_assignments 
          (schedule_id, assigned_date, driver_id, bus_id, depot_id, status, created_by)
          VALUES (?, ?, ?, ?, ?, 'ASSIGNED', 1)
        `, [
          schedule.schedule_id,
          today,
          schedule.driver_id,
          schedule.bus_id,
          schedule.depot_id || 1 // Default depot if null
        ]);
        tripAssigned++;
      } else {
        tripSkipped++;
      }

      // Ensure driver_assignments entry exists (for existing schedules endpoints)
      const [existingDriver] = await db.query(
        'SELECT id FROM driver_assignments WHERE schedule_id = ? AND assigned_date = ?',
        [schedule.schedule_id, today]
      );

      if (existingDriver.length === 0) {
        await db.query(`
          INSERT INTO driver_assignments
          (driver_id, schedule_id, bus_id, depot_id, assigned_date, status)
          VALUES (?, ?, ?, ?, ?, 'ASSIGNED')
        `, [
          schedule.driver_id,
          schedule.schedule_id,
          schedule.bus_id,
          schedule.depot_id || 1,
          today
        ]);
        driverAssigned++;
      } else {
        driverSkipped++;
      }

      console.log(`✅ Assigned: ${schedule.driver_name} - ${schedule.bus_number} - ${schedule.origin} → ${schedule.destination} at ${schedule.departure_time}`);
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total schedules: ${schedules.length}`);
    console.log(`   ✅ trip_assignments: ${tripAssigned} new, ${tripSkipped} existing`);
    console.log(`   ✅ driver_assignments: ${driverAssigned} new, ${driverSkipped} existing`);
    console.log(`\n✨ Drivers can now see their trips!`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

autoAssignTrips();
