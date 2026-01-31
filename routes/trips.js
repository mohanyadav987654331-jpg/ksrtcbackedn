const express = require('express');
const router = express.Router();
const { auth, roleAuth } = require('../middleware/auth');
const db = require('../config/database');

// ============================================
// TRIP ASSIGNMENT ENDPOINTS (Depot Admin)
// ============================================

// Create trip assignment
router.post('/', roleAuth('depot_admin', 'admin'), async (req, res) => {
  const { schedule_id, assigned_date, driver_id, bus_id, depot_id } = req.body;

  if (!schedule_id || !assigned_date || !driver_id || !bus_id || !depot_id) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields'
    });
  }

  try {
    // Check if assignment already exists
    const [existing] = await db.query(
      'SELECT id FROM trip_assignments WHERE schedule_id = ? AND assigned_date = ?',
      [schedule_id, assigned_date]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Assignment already exists for this schedule on this date'
      });
    }

    // Create assignment
    const [result] = await db.query(
      `INSERT INTO trip_assignments 
       (schedule_id, assigned_date, driver_id, bus_id, depot_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [schedule_id, assigned_date, driver_id, bus_id, depot_id, req.user.id]
    );

    res.json({
      success: true,
      assignment_id: result.insertId,
      message: 'Trip assigned successfully'
    });
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get assignments for depot
router.get('/depot/:depot_id', auth, async (req, res) => {
  const { depot_id } = req.params;
  const assigned_date = req.query.date || new Date().toISOString().split('T')[0];

  try {
    const [assignments] = await db.query(`
      SELECT 
        ta.id,
        ta.schedule_id,
        ta.assigned_date,
        ta.driver_id,
        ta.bus_id,
        ta.depot_id,
        ta.status,
        s.departure_time,
        s.arrival_time,
        s.days_of_week,
        r.origin,
        r.destination,
        r.distance,
        u.full_name as driver_name,
        u.phone as driver_phone,
        b.bus_number,
        b.number_plate,
        b.bus_type,
        b.capacity,
        CASE 
          WHEN at.status = 'STARTED' THEN 'ACTIVE'
          WHEN at.status = 'COMPLETED' THEN 'COMPLETED'
          ELSE 'SCHEDULED'
        END as trip_status,
        at.id as trip_id,
        at.crowd_level,
        at.current_lat,
        at.current_lng
      FROM trip_assignments ta
      INNER JOIN schedules s ON ta.schedule_id = s.id
      INNER JOIN routes r ON s.route_id = r.id
      INNER JOIN users u ON ta.driver_id = u.id
      INNER JOIN buses b ON ta.bus_id = b.id
      LEFT JOIN active_trips at ON ta.id = at.trip_assignment_id AND at.status != 'COMPLETED'
      WHERE ta.depot_id = ? AND ta.assigned_date = ? AND ta.status != 'CANCELLED'
      ORDER BY s.departure_time ASC
    `, [depot_id, assigned_date]);

    res.json({
      success: true,
      data: assignments,
      count: assignments.length
    });
  } catch (error) {
    console.error('Get depot assignments error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cancel assignment
router.delete('/:id', roleAuth('depot_admin', 'admin'), async (req, res) => {
  try {
    // Check if trip already started
    const [activeTrip] = await db.query(
      'SELECT id FROM active_trips WHERE trip_assignment_id = ? AND status = "STARTED"',
      [req.params.id]
    );

    if (activeTrip.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel assignment - trip already started'
      });
    }

    // Update status to CANCELLED
    await db.query(
      'UPDATE trip_assignments SET status = "CANCELLED" WHERE id = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      message: 'Assignment cancelled'
    });
  } catch (error) {
    console.error('Cancel assignment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// DRIVER TRIP ENDPOINTS
// ============================================

// Get driver's today trips
router.get('/driver/my-trips', auth, async (req, res) => {
  const assigned_date = req.query.date || new Date().toISOString().split('T')[0];

  try {
    const [assignments] = await db.query(`
      SELECT 
        ta.id as assignment_id,
        ta.schedule_id,
        ta.assigned_date,
        ta.driver_id,
        ta.bus_id,
        ta.depot_id,
        s.departure_time,
        s.arrival_time,
        s.days_of_week,
        r.origin,
        r.destination,
        r.distance,
        b.bus_number,
        b.number_plate,
        b.bus_type,
        b.capacity,
        d.depot_name,
        CASE 
          WHEN at.status = 'STARTED' THEN 'ACTIVE'
          WHEN at.status = 'COMPLETED' THEN 'COMPLETED'
          ELSE CASE
            WHEN TIMESTAMPDIFF(MINUTE, CURTIME(), s.departure_time) <= 10 AND TIMESTAMPDIFF(MINUTE, CURTIME(), s.departure_time) > 0 THEN 'READY'
            WHEN TIMESTAMPDIFF(MINUTE, CURTIME(), s.departure_time) <= 0 THEN 'DELAYED'
            ELSE 'UPCOMING'
          END
        END as trip_status,
        at.id as trip_id,
        at.crowd_level,
        at.current_lat,
        at.current_lng
      FROM trip_assignments ta
      INNER JOIN schedules s ON ta.schedule_id = s.id
      INNER JOIN routes r ON s.route_id = r.id
      INNER JOIN buses b ON ta.bus_id = b.id
      INNER JOIN depots d ON ta.depot_id = d.id
      LEFT JOIN active_trips at ON ta.id = at.trip_assignment_id
      WHERE ta.driver_id = ? AND ta.assigned_date = ? AND ta.status != 'CANCELLED'
      ORDER BY s.departure_time ASC
    `, [req.user.id, assigned_date]);

    res.json({
      success: true,
      data: assignments,
      count: assignments.length
    });
  } catch (error) {
    console.error('Get driver trips error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ACTIVE TRIP ENDPOINTS
// ============================================

// Start trip
router.post('/start', auth, async (req, res) => {
  const { trip_assignment_id, schedule_id, driver_id, bus_id } = req.body;

  if (!trip_assignment_id || !schedule_id || !driver_id || !bus_id) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields'
    });
  }

  try {
    // Verify driver and assignment match
    const [assignment] = await db.query(
      'SELECT * FROM trip_assignments WHERE id = ? AND driver_id = ?',
      [trip_assignment_id, driver_id]
    );

    if (assignment.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Assignment not found or not authorized'
      });
    }

    // Check if trip already active
    const [existingTrip] = await db.query(
      'SELECT id FROM active_trips WHERE trip_assignment_id = ? AND status = "STARTED"',
      [trip_assignment_id]
    );

    if (existingTrip.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Trip already started'
      });
    }

    // Create active trip
    const [result] = await db.query(`
      INSERT INTO active_trips 
      (trip_assignment_id, schedule_id, driver_id, bus_id, status, actual_start_time)
      VALUES (?, ?, ?, ?, 'STARTED', NOW())
    `, [trip_assignment_id, schedule_id, driver_id, bus_id]);

    // Mark bus as on trip
    await db.query(
      'UPDATE buses SET is_on_trip = 1 WHERE id = ?',
      [bus_id]
    );

    res.json({
      success: true,
      trip_id: result.insertId,
      message: 'Trip started successfully'
    });
  } catch (error) {
    console.error('Start trip error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update trip (crowd level, delay)
router.put('/:id/update', auth, async (req, res) => {
  const { id } = req.params;
  const { crowd_level, delay_minutes } = req.body;

  try {
    // Verify ownership
    const [trip] = await db.query(
      'SELECT * FROM active_trips WHERE id = ? AND driver_id = ?',
      [id, req.user.id]
    );

    if (trip.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Trip not found or not authorized'
      });
    }

    // Update trip
    await db.query(`
      UPDATE active_trips 
      SET crowd_level = ?, delay_minutes = ?, updated_at = NOW()
      WHERE id = ?
    `, [crowd_level || 0, delay_minutes || 0, id]);

    // Sync to buses table
    if (crowd_level !== undefined) {
      await db.query(
        'UPDATE buses SET crowd_level = ? WHERE id = ?',
        [crowd_level, trip[0].bus_id]
      );
    }

    res.json({
      success: true,
      message: 'Trip updated successfully'
    });
  } catch (error) {
    console.error('Update trip error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// End trip
router.post('/:id/end', auth, async (req, res) => {
  const { id } = req.params;

  try {
    // Verify ownership
    const [trip] = await db.query(
      'SELECT * FROM active_trips WHERE id = ? AND driver_id = ?',
      [id, req.user.id]
    );

    if (trip.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Trip not found or not authorized'
      });
    }

    // Update trip
    await db.query(`
      UPDATE active_trips 
      SET status = 'COMPLETED', actual_end_time = NOW(), updated_at = NOW()
      WHERE id = ?
    `, [id]);

    // Mark bus as off trip
    await db.query(
      'UPDATE buses SET is_on_trip = 0, current_lat = NULL, current_lng = NULL WHERE id = ?',
      [trip[0].bus_id]
    );

    res.json({
      success: true,
      message: 'Trip completed',
      completed_at: new Date()
    });
  } catch (error) {
    console.error('End trip error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update GPS location
router.put('/:id/location', auth, async (req, res) => {
  const { id } = req.params;
  const { lat, lng, speed_kmph } = req.body;

  try {
    // Verify ownership
    const [trip] = await db.query(
      'SELECT * FROM active_trips WHERE id = ? AND driver_id = ?',
      [id, req.user.id]
    );

    if (trip.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Trip not found or not authorized'
      });
    }

    // Update location
    await db.query(`
      UPDATE active_trips 
      SET current_lat = ?, current_lng = ?, current_speed_kmph = ?, last_location_update = NOW()
      WHERE id = ?
    `, [lat, lng, speed_kmph || 0, id]);

    // Sync to buses table
    await db.query(
      'UPDATE buses SET current_lat = ?, current_lng = ?, speedKmph = ? WHERE id = ?',
      [lat, lng, speed_kmph || 0, trip[0].bus_id]
    );

    res.json({
      success: true,
      message: 'Location updated'
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// USER TRACKING ENDPOINTS
// ============================================

// Get all active trips
router.get('/active/all', auth, async (req, res) => {
  try {
    const [trips] = await db.query(`
      SELECT 
        at.id,
        at.schedule_id,
        at.driver_id,
        at.bus_id,
        s.departure_time,
        s.arrival_time,
        r.origin,
        r.destination,
        r.distance,
        b.bus_number,
        b.number_plate,
        b.bus_type,
        u.full_name as driver_name,
        at.current_lat,
        at.current_lng,
        at.current_speed_kmph,
        at.crowd_level,
        at.actual_start_time
      FROM active_trips at
      INNER JOIN schedules s ON at.schedule_id = s.id
      INNER JOIN routes r ON s.route_id = r.id
      INNER JOIN buses b ON at.bus_id = b.id
      INNER JOIN users u ON at.driver_id = u.id
      WHERE at.status = 'STARTED' AND at.current_lat IS NOT NULL
      ORDER BY at.actual_start_time DESC
    `);

    res.json({
      success: true,
      data: trips,
      count: trips.length
    });
  } catch (error) {
    console.error('Get active trips error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get specific trip for tracking
router.get('/:id/track', auth, async (req, res) => {
  const { id } = req.params;

  try {
    const [trip] = await db.query(`
      SELECT 
        at.id,
        at.schedule_id,
        at.driver_id,
        at.bus_id,
        s.departure_time,
        s.arrival_time,
        r.origin,
        r.destination,
        r.distance,
        b.bus_number,
        b.number_plate,
        b.bus_type,
        u.full_name as driver_name,
        at.current_lat,
        at.current_lng,
        at.current_speed_kmph,
        at.crowd_level,
        at.delay_minutes,
        at.actual_start_time,
        at.status
      FROM active_trips at
      INNER JOIN schedules s ON at.schedule_id = s.id
      INNER JOIN routes r ON s.route_id = r.id
      INNER JOIN buses b ON at.bus_id = b.id
      INNER JOIN users u ON at.driver_id = u.id
      WHERE at.id = ?
    `, [id]);

    if (trip.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found'
      });
    }

    res.json({
      success: true,
      data: trip[0]
    });
  } catch (error) {
    console.error('Get trip tracking error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
