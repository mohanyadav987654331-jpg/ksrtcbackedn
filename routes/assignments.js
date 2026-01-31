const express = require('express');
const router = express.Router();
const { auth, roleAuth } = require('../middleware/auth');
const db = require('../config/database');

// Get driver's upcoming assignments with stops for non-express routes
router.get('/driver/assignments', auth, async (req, res) => {
  try {
    const driverId = req.user.id;
    const depotId = req.user.depot_id;
    
    const [assignments] = await db.query(`
      SELECT da.id as assignment_id,
        da.driver_id, da.assigned_date, da.status,
        s.id as schedule_id, s.departure_time, s.arrival_time,
        b.bus_number, b.bus_type, b.capacity,
        r.id as route_id, r.origin, r.destination, r.distance, r.estimated_duration,
        bt.status as tracking_status, bt.current_location_name,
        COUNT(DISTINCT rs.id) as total_stops
      FROM driver_assignments da
      JOIN schedules s ON da.schedule_id = s.id
      JOIN buses b ON da.bus_id = b.id
      JOIN routes r ON s.route_id = r.id
      LEFT JOIN bus_tracking bt ON b.id = bt.bus_id AND s.id = bt.schedule_id
      LEFT JOIN route_stops rs ON r.id = rs.route_id
      WHERE da.driver_id = ? 
        AND da.assigned_date >= CURDATE()
      GROUP BY da.id, da.driver_id, da.assigned_date, da.status, s.id, s.departure_time, s.arrival_time,
               b.bus_number, b.bus_type, b.capacity, r.id, r.origin, r.destination, r.distance, r.estimated_duration,
               bt.status, bt.current_location_name
      ORDER BY da.assigned_date, s.departure_time
    `, [driverId]);
    
    // For each non-express route, fetch all stops
    const enrichedAssignments = [];
    for (const assignment of assignments) {
      const assignmentData = { ...assignment };
      
      // Only fetch stops for NORMAL routes (not EXPRESS)
      if (assignment.bus_type === 'NORMAL' || assignment.bus_type === 'DELUXE' || assignment.bus_type === 'SLEEPER') {
        const [stops] = await db.query(`
          SELECT rs.id, rs.stop_name, rs.stop_order, rs.estimated_minutes_from_origin,
                 rs.latitude, rs.longitude
          FROM route_stops rs
          WHERE rs.route_id = ?
          ORDER BY rs.stop_order
        `, [assignment.route_id]);
        assignmentData.stops = stops;
      } else {
        // For EXPRESS routes, show origin and destination only
        assignmentData.stops = [
          { stop_name: assignment.origin, stop_order: 0, estimated_minutes_from_origin: 0 },
          { stop_name: assignment.destination, stop_order: 999, estimated_minutes_from_origin: assignment.estimated_duration }
        ];
      }
      
      enrichedAssignments.push(assignmentData);
    }
    
    res.json({ success: true, data: enrichedAssignments });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch assignments' });
  }
});

// Get assignment details with all stops and travel time info
router.get('/driver/assignment/:assignmentId', auth, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const driverId = req.user.id;
    
    // Get assignment details
    const [assignment] = await db.query(`
      SELECT da.*, 
        s.id as schedule_id,
        s.departure_time, s.arrival_time,
        b.bus_number, b.bus_type, b.capacity, b.number_plate,
        r.id as route_id, r.origin, r.destination, r.distance, r.estimated_duration,
        bt.status as tracking_status, bt.current_location_name, bt.estimated_delay_minutes,
        bt.current_passengers, bt.updated_at as last_update
      FROM driver_assignments da
      JOIN schedules s ON da.schedule_id = s.id
      JOIN buses b ON da.bus_id = b.id
      JOIN routes r ON s.route_id = r.id
      LEFT JOIN bus_tracking bt ON b.id = bt.bus_id AND s.id = bt.schedule_id
      WHERE da.id = ? AND da.driver_id = ?
    `, [assignmentId, driverId]);
    
    if (!assignment || assignment.length === 0) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    
    // Get stops with tracking - for non-express routes
    const [stops] = await db.query(`
      SELECT rs.id, rs.stop_name, rs.stop_order, rs.estimated_minutes_from_origin,
             rs.latitude, rs.longitude,
             sst.status as stop_status, 
             sst.actual_arrival_time, sst.passengers_boarded, 
             sst.passengers_alighted, sst.updated_at
      FROM route_stops rs
      LEFT JOIN schedule_stops_tracking sst ON rs.id = sst.stop_id 
        AND sst.schedule_id = ?
      WHERE rs.route_id = ?
      ORDER BY rs.stop_order
    `, [assignment[0].schedule_id, assignment[0].route_id]);
    
    // Build response with detailed trip info
    const tripInfo = {
      ...assignment[0],
      tripType: assignment[0].bus_type === 'EXPRESS' ? 'DIRECT/EXPRESS' : 'STOPS AT ALL STATIONS',
      stopsInfo: stops.length > 0 ? `Stops at ${stops.length} stations` : 'Direct route',
      stops: stops
    };
    
    res.json({ 
      success: true, 
      data: tripInfo
    });
  } catch (error) {
    console.error('Error fetching assignment details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch assignment details' });
  }
});

// Start trip
router.post('/driver/assignment/:assignmentId/start', auth, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const driverId = req.user.id;
    
    const [result] = await db.query(`
      UPDATE driver_assignments 
      SET status = 'IN_PROGRESS', started_at = NOW()
      WHERE id = ? AND driver_id = ? AND status = 'ASSIGNED'
    `, [assignmentId, driverId]);
    
    if (result.affectedRows === 0) {
      return res.status(400).json({ success: false, message: 'Cannot start this assignment' });
    }
    
    res.json({ success: true, message: 'Trip started' });
  } catch (error) {
    console.error('Error starting trip:', error);
    res.status(500).json({ success: false, message: 'Failed to start trip' });
  }
});

// Complete trip
router.post('/driver/assignment/:assignmentId/complete', auth, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const driverId = req.user.id;
    const { odometer_reading, notes } = req.body;
    
    const [result] = await db.query(`
      UPDATE driver_assignments 
      SET status = 'COMPLETED', completed_at = NOW(), notes = ?
      WHERE id = ? AND driver_id = ? AND status = 'IN_PROGRESS'
    `, [notes || null, assignmentId, driverId]);
    
    if (result.affectedRows === 0) {
      return res.status(400).json({ success: false, message: 'Cannot complete this assignment' });
    }
    
    res.json({ success: true, message: 'Trip completed' });
  } catch (error) {
    console.error('Error completing trip:', error);
    res.status(500).json({ success: false, message: 'Failed to complete trip' });
  }
});

// Update stop arrival
router.post('/driver/assignment/:assignmentId/stop/:stopOrder/arrive', auth, async (req, res) => {
  try {
    const { assignmentId, stopOrder } = req.params;
    const { passengers_boarded, passengers_alighted } = req.body;
    
    const [assignment] = await db.query(`
      SELECT schedule_id FROM driver_assignments WHERE id = ?
    `, [assignmentId]);
    
    if (!assignment || assignment.length === 0) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    
    await db.query(`
      UPDATE schedule_stops_tracking 
      SET status = 'COMPLETED', 
          actual_arrival_time = TIME(NOW()),
          passengers_boarded = ?,
          passengers_alighted = ?
      WHERE schedule_id = ? AND stop_order = ?
    `, [passengers_boarded || 0, passengers_alighted || 0, assignment[0].schedule_id, stopOrder]);
    
    res.json({ success: true, message: 'Stop updated' });
  } catch (error) {
    console.error('Error updating stop:', error);
    res.status(500).json({ success: false, message: 'Failed to update stop' });
  }
});

// Assign bus to driver (Depot Admin only)
router.post('/assign', auth, roleAuth('depot_admin'), async (req, res) => {
  try {
    const { driver_id, schedule_id, bus_id, assigned_date } = req.body;
    const depotId = req.user.depot_id;
    
    if (!driver_id || !schedule_id || !bus_id || !assigned_date) {
      return res.status(400).json({ 
        success: false, 
        message: 'driver_id, schedule_id, bus_id, and assigned_date are required' 
      });
    }

    // Validate schedule, bus, and driver alignment with timetable and depot
    const [scheduleRows] = await db.query(
      'SELECT id, route_id, depot_id FROM schedules WHERE id = ? LIMIT 1',
      [schedule_id]
    );
    const schedule = scheduleRows[0];
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    const [busRows] = await db.query(
      'SELECT id, route_id, depot_id FROM buses WHERE id = ? LIMIT 1',
      [bus_id]
    );
    const bus = busRows[0];
    if (!bus) {
      return res.status(404).json({ success: false, message: 'Bus not found' });
    }

    if (bus.route_id && bus.route_id !== schedule.route_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bus route does not match the schedule route' 
      });
    }

    const [driverRows] = await db.query(
      'SELECT id, depot_id FROM users WHERE id = ? LIMIT 1',
      [driver_id]
    );
    const driver = driverRows[0];
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    // Enforce depot isolation when depot is known
    if (depotId && schedule.depot_id && schedule.depot_id !== depotId) {
      return res.status(403).json({ success: false, message: 'Schedule is not in your depot' });
    }
    if (depotId && bus.depot_id && bus.depot_id !== depotId) {
      return res.status(403).json({ success: false, message: 'Bus is not in your depot' });
    }
    if (depotId && driver.depot_id && driver.depot_id !== depotId) {
      return res.status(403).json({ success: false, message: 'Driver is not in your depot' });
    }

    const targetDepotId = schedule.depot_id || bus.depot_id || driver.depot_id || depotId;
    
    // Check if assignment already exists
    const [existing] = await db.query(`
      SELECT id FROM driver_assignments 
      WHERE schedule_id = ? AND assigned_date = ?
    `, [schedule_id, assigned_date]);
    
    if (existing && existing.length > 0) {
      // Update existing assignment
      await db.query(`
        UPDATE driver_assignments 
        SET driver_id = ?, bus_id = ?, depot_id = ?
        WHERE id = ?
      `, [driver_id, bus_id, targetDepotId, existing[0].id]);
      
      return res.json({ 
        success: true, 
        message: 'Driver reassigned successfully',
        assignmentId: existing[0].id 
      });
    }
    
    // Create new assignment
    const [result] = await db.query(`
      INSERT INTO driver_assignments (driver_id, schedule_id, bus_id, depot_id, assigned_date)
      VALUES (?, ?, ?, ?, ?)
    `, [driver_id, schedule_id, bus_id, targetDepotId, assigned_date]);
    
    res.json({ 
      success: true, 
      message: 'Driver assigned successfully',
      assignmentId: result.insertId 
    });
  } catch (error) {
    console.error('Error assigning driver:', error);
    res.status(500).json({ success: false, message: 'Failed to assign driver' });
  }
});

module.exports = router;
