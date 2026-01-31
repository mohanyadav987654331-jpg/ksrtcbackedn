const express = require('express');
const router = express.Router();
const { auth, roleAuth } = require('../middleware/auth');
const db = require('../config/database');

// Get schedules with driver info
router.get('/', auth, async (req, res) => {
  try {
    const { location, routeId, busId, depotId } = req.query;
    const assignedDate = req.query.assigned_date || req.query.date || new Date().toISOString().slice(0, 10);

    let query = `
      SELECT s.id, s.route_id, s.bus_id, s.driver_id, s.depot_id, s.departure_time, s.arrival_time, s.days_of_week, s.is_active,
             r.id as r_id, r.route_id as route_number, r.route_name, r.origin, r.destination,
             b.id as b_id, b.bus_number, b.bus_type, b.capacity, b.crowd_level,
             u.id as u_id, u.username, u.phone,
             MAX(da.id) as assignment_id,
             MAX(da.status) as assignment_status,
             MAX(da.assigned_date) as assigned_date_max,
             COALESCE(MAX(db.bus_number), b.bus_number) as final_bus_number,
             COALESCE(MAX(db.bus_type), b.bus_type) as final_bus_type,
             COALESCE(MAX(db.capacity), b.capacity) as final_capacity,
             COALESCE(MAX(db.crowd_level), b.crowd_level) as final_crowd_level,
             COALESCE(MAX(du.full_name), MAX(u.username)) as driver_name,
             COALESCE(MAX(du.phone), MAX(u.phone)) as driver_phone,
             TIMESTAMPDIFF(MINUTE, CURTIME(), s.departure_time) as minutes_until_departure,
             GROUP_CONCAT(CONCAT(rs.stop_name,'|',rs.stop_order,'|',rs.estimated_minutes_from_origin)
               ORDER BY rs.stop_order SEPARATOR '::') as stops_data
      FROM schedules s
      LEFT JOIN routes r ON s.route_id = r.id
      LEFT JOIN buses b ON s.bus_id = b.id
      LEFT JOIN users u ON s.driver_id = u.id
      LEFT JOIN (
        SELECT da.*
        FROM driver_assignments da
        JOIN (
          SELECT schedule_id, MAX(id) AS max_id
          FROM driver_assignments
          WHERE assigned_date = ?
          GROUP BY schedule_id
        ) latest ON latest.max_id = da.id
      ) da ON da.schedule_id = s.id
      LEFT JOIN buses db ON da.bus_id = db.id
      LEFT JOIN users du ON da.driver_id = du.id
      LEFT JOIN route_stops rs ON r.route_id = rs.route_id
      WHERE s.is_active = TRUE
    `;
    const params = [assignedDate];

    if (location) {
      query += ` AND (r.origin LIKE ? OR r.destination LIKE ? OR rs.stop_name LIKE ?)`;
      const locationPattern = `%${location}%`;
      params.push(locationPattern, locationPattern, locationPattern);
    }

    if (routeId) {
      query += ' AND s.route_id = ?';
      params.push(routeId);
    }
    if (busId) {
      query += ' AND (s.bus_id = ? OR da.bus_id = ?)';
      params.push(busId, busId);
    }
    if (depotId) {
      query += ' AND (s.depot_id = ? OR b.depot_id = ? OR db.depot_id = ?)';
      params.push(depotId, depotId, depotId);
    }

    query += ' GROUP BY s.id ORDER BY s.departure_time';

    const [schedules] = await db.query(query, params);
    
    // Process stops data and calculate time-based status
    const processedSchedules = schedules.map(s => {
      const minutesUntil = s.minutes_until_departure || 0;
      let timeStatus = 'scheduled';
      if (minutesUntil < 0) timeStatus = 'departed';
      else if (minutesUntil <= 15) timeStatus = 'boarding';
      else if (minutesUntil <= 30) timeStatus = 'soon';

      return {
        id: s.id,
        route_id: s.route_id,
        bus_id: s.bus_id,
        driver_id: s.driver_id,
        departure_time: s.departure_time,
        arrival_time: s.arrival_time,
        days_of_week: s.days_of_week,
        is_active: s.is_active,
        route_number: s.route_number,
        route_name: s.route_name,
        origin: s.origin,
        destination: s.destination,
        bus_number: s.final_bus_number,
        bus_type: s.final_bus_type,
        capacity: s.final_capacity,
        crowd_level: s.final_crowd_level,
        driver_name: s.driver_name,
        driver_phone: s.driver_phone,
        assignment_id: s.assignment_id,
        assignment_status: s.assignment_status,
        assigned_date: s.assigned_date_max,
        minutes_until_departure: minutesUntil,
        time_status: timeStatus,
        stops: s.stops_data ? s.stops_data.split('::').map(stop => {
          const [name, order, minutes] = stop.split('|');
          return {
            stopName: name,
            stopOrder: parseInt(order),
            estimatedMinutesFromOrigin: parseInt(minutes)
          };
        }) : []
      };
    });

    res.json({ success: true, data: processedSchedules });
  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get available locations for schedules  
router.get('/locations/available', auth, async (req, res) => {
  try {
    const [locations] = await db.query(`
      SELECT DISTINCT COALESCE(rs.stop_name, r.origin, r.destination) as location
      FROM schedules s
      LEFT JOIN routes r ON s.route_id = r.id
      LEFT JOIN route_stops rs ON r.route_id = rs.route_id
      WHERE s.is_active = TRUE
      ORDER BY location ASC
    `);

    res.json({ success: true, data: locations });
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get upcoming buses (departing within next 3 hours) - MUST be before /:id route
router.get('/upcoming', auth, async (req, res) => {
  try {
    const { location, hoursAhead } = req.query;
    const hours = parseInt(hoursAhead) || 3; // Default 3 hours ahead
    const assignedDate = new Date().toISOString().slice(0, 10);

    let query = `
      SELECT DISTINCT s.id, s.route_id, s.bus_id, s.driver_id, s.departure_time, s.arrival_time, s.is_active,
             r.route_id as route_number, r.route_name, r.origin, r.destination,
             COALESCE(db.bus_number, b.bus_number) as bus_number,
             COALESCE(db.bus_type, b.bus_type) as bus_type,
             COALESCE(db.capacity, b.capacity) as capacity,
             COALESCE(db.crowd_level, b.crowd_level) as crowd_level,
             COALESCE(du.full_name, u.username) as driver_name,
             COALESCE(du.phone, u.phone) as driver_phone,
             da.id as assignment_id,
             da.status as assignment_status,
             da.assigned_date,
             TIMESTAMPDIFF(MINUTE, CURTIME(), s.departure_time) as minutes_until_departure
      FROM schedules s
      LEFT JOIN routes r ON s.route_id = r.id
      LEFT JOIN buses b ON s.bus_id = b.id
      LEFT JOIN users u ON s.driver_id = u.id
      LEFT JOIN (
        SELECT da.*
        FROM driver_assignments da
        JOIN (
          SELECT schedule_id, MAX(id) AS max_id
          FROM driver_assignments
          WHERE assigned_date = ?
          GROUP BY schedule_id
        ) latest ON latest.max_id = da.id
      ) da ON da.schedule_id = s.id
      LEFT JOIN buses db ON da.bus_id = db.id
      LEFT JOIN users du ON da.driver_id = du.id
      WHERE s.is_active = TRUE
        AND s.departure_time >= CURTIME()
        AND s.departure_time <= ADDTIME(CURTIME(), ?)
    `;
    const params = [assignedDate, `${hours}:00:00`];

    if (location) {
      query += ` AND (r.origin LIKE ? OR r.destination LIKE ?)`;
      const locationPattern = `%${location}%`;
      params.push(locationPattern, locationPattern);
    }

    query += ' ORDER BY s.departure_time ASC';

    const [schedules] = await db.query(query, params);
    
    // Process and calculate time-based status
    const processedSchedules = schedules.map(s => {
      const minutesUntil = s.minutes_until_departure || 0;
      let timeStatus = 'upcoming';
      if (minutesUntil < 0) timeStatus = 'departed';
      else if (minutesUntil <= 15) timeStatus = 'boarding';
      else if (minutesUntil <= 30) timeStatus = 'soon';

      return {
        ...s,
        minutes_until_departure: minutesUntil,
        time_status: timeStatus,
        stops: []
      };
    });

    res.json({ 
      success: true, 
      data: processedSchedules,
      count: processedSchedules.length,
      currentTime: new Date().toLocaleTimeString('en-US', { hour12: false }),
      hoursAhead: hours
    });
  } catch (error) {
    console.error('Get upcoming buses error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get driver's today schedules (for driver dashboard) - MUST be before /:id
router.get('/my-today', auth, async (req, res) => {
  try {
    const driverId = req.user.id;
    const assignedDate = req.query.date || new Date().toISOString().slice(0, 10);
    
    console.log(`\n📋 Fetching driver schedules for driver ${driverId}, date ${assignedDate}`);
    
    // First, get all driver assignments for this date
    const [assignments] = await db.query(`
      SELECT * FROM driver_assignments
      WHERE driver_id = ? AND DATE(assigned_date) = ?
      ORDER BY id
    `, [driverId, assignedDate]);
    
    console.log(`✅ Found ${assignments.length} assignments for driver`);
    
    if (assignments.length === 0) {
      return res.json({ success: true, data: [] });
    }
    
    // Get schedule and route details for each assignment
    const schedules = [];
    for (const assignment of assignments) {
      try {
        const [schedule] = await db.query(`
          SELECT s.*, r.origin, r.destination, r.distance, r.route_name,
                 b.bus_number, b.number_plate, b.bus_type, b.current_lat, b.current_lng
          FROM schedules s
          LEFT JOIN routes r ON s.route_id = r.id
          LEFT JOIN buses b ON s.bus_id = b.id
          WHERE s.id = ?
        `, [assignment.schedule_id]);
        
        if (schedule && schedule.length > 0) {
          schedules.push({
            assignment_id: assignment.id,
            schedule_id: assignment.schedule_id,
            status: assignment.status,
            crowd_level: assignment.crowd_level,
            actual_departure_time: assignment.actual_departure_time,
            actual_arrival_time: assignment.actual_arrival_time,
            ...schedule[0]
          });
        }
      } catch (e) {
        console.error(`Error loading schedule ${assignment.schedule_id}:`, e.message);
      }
    }
    
    // Sort by departure time
    schedules.sort((a, b) => {
      const timeA = a.departure_time?.toString() || '';
      const timeB = b.departure_time?.toString() || '';
      return timeA.localeCompare(timeB);
    });
    
    console.log(`✅ Loaded ${schedules.length} complete schedule details`);
    res.json({ success: true, data: schedules });
  } catch (error) {
    console.error('❌ Get driver schedules error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get schedule by ID with full details (must be after /upcoming and /my-today)
router.get('/:id', auth, async (req, res) => {
  try {
    const [schedules] = await db.query(`
      SELECT s.*, 
             r.route_id as route_number, r.route_name, r.origin, r.destination,
             b.bus_number, b.capacity,
             u.username as driver_name, u.phone as driver_phone
      FROM schedules s
      LEFT JOIN routes r ON s.route_id = r.id
      LEFT JOIN buses b ON s.bus_id = b.id
      LEFT JOIN users u ON s.driver_id = u.id
      WHERE s.id = ?
    `, [req.params.id]);
    
    if (schedules.length === 0) {
      return res.status(404).json({ success: false, error: 'Schedule not found' });
    }
    res.json({ success: true, data: schedules[0] });
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create schedule (Depot admin only)
router.post('/', auth, roleAuth('DEPOT', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { route_id, bus_id, driver_id, departure_time, arrival_time, days_of_week, is_active } = req.body;

    if (!route_id || !departure_time) {
      return res.status(400).json({ success: false, error: 'route_id and departure_time required' });
    }

    const [result] = await db.query(
      `INSERT INTO schedules (route_id, bus_id, driver_id, departure_time, arrival_time, days_of_week, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [route_id, bus_id, driver_id, departure_time, arrival_time, days_of_week || 'Daily', is_active ?? 1]
    );

    res.status(201).json({ 
      success: true, 
      data: { id: result.insertId, route_id, bus_id, driver_id, departure_time, arrival_time } 
    });
  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update schedule (Depot admin only)
router.put('/:id', auth, roleAuth('DEPOT', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { driver_id, bus_id, departure_time, arrival_time, days_of_week } = req.body;

    const [result] = await db.query(
      `UPDATE schedules SET 
        driver_id = COALESCE(?, driver_id),
        bus_id = COALESCE(?, bus_id),
        departure_time = COALESCE(?, departure_time),
        arrival_time = COALESCE(?, arrival_time),
        days_of_week = COALESCE(?, days_of_week)
      WHERE id = ?`,
      [driver_id, bus_id, departure_time, arrival_time, days_of_week, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Schedule not found' });
    }

    res.json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete schedule (Depot admin only)
router.delete('/:id', auth, roleAuth('DEPOT', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM schedules WHERE id = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Schedule not found' });
    }

    res.json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start a trip
router.post('/:id/start', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, bus_id, assignment_id, assigned_date } = req.body;
    const driverId = req.user.id;

    console.log(`🚀 Start trip request - Schedule ID: ${id}, Driver: ${driverId}, Location: ${latitude}, ${longitude}`);
    if (assignment_id) {
      console.log(`🆔 Assignment ID provided: ${assignment_id}`);
    }

    const assignedDate = assigned_date || null;

    // Get the driver assignment for this schedule
    let [assignments] = await db.query(`
      SELECT da.*, s.bus_id FROM driver_assignments da
      JOIN schedules s ON da.schedule_id = s.id
      WHERE da.schedule_id = ? AND da.driver_id = ?
      ${assignedDate ? 'AND DATE(da.assigned_date) = ?' : 'AND DATE(da.assigned_date) = CURDATE()'}
      ORDER BY da.id DESC LIMIT 1
    `, assignedDate ? [id, driverId, assignedDate] : [id, driverId]);

    // If not found, try by assignment_id
    if (assignments.length === 0 && assignment_id) {
      console.log('⚠️ No assignment found by schedule/date, trying assignment_id...');
      [assignments] = await db.query(`
        SELECT da.*, s.bus_id FROM driver_assignments da
        JOIN schedules s ON da.schedule_id = s.id
        WHERE da.id = ? AND da.driver_id = ?
        ORDER BY da.id DESC LIMIT 1
      `, [assignment_id, driverId]);
    }

    // If not found with date filter, try without date filter
    if (assignments.length === 0) {
      console.log('⚠️ No assignment found with date filter, checking all assignments...');
      [assignments] = await db.query(`
        SELECT da.*, s.bus_id FROM driver_assignments da
        JOIN schedules s ON da.schedule_id = s.id
        WHERE da.schedule_id = ? AND da.driver_id = ?
        ORDER BY da.id DESC LIMIT 1
      `, [id, driverId]);
    }

    if (assignments.length === 0) {
      console.log(`❌ No assignment found for schedule ${id} and driver ${driverId}`);
      return res.status(404).json({ success: false, error: 'No assignment found for this schedule' });
    }
    
    const assignment = assignments[0];
    const busId = assignment.bus_id || bus_id;
    
    console.log(`📝 Found assignment: ${assignment.id}, Bus ID: ${busId}`);
    
    // Update assignment status to IN_PROGRESS
    await db.query(`
      UPDATE driver_assignments 
      SET status = 'IN_PROGRESS', started_at = NOW()
      WHERE id = ?
    `, [assignment.id]);

    console.log(`✅ Updated assignment status to IN_PROGRESS`);

    // Update bus location
    if (busId) {
      await db.query('UPDATE buses SET current_lat = ?, current_lng = ?, last_updated = NOW() WHERE id = ?', 
        [latitude || 0, longitude || 0, busId]);
      console.log(`✅ Updated bus ${busId} location`);
    }

    // Create or update active_trips so user tracking can find the bus
    try {
      const [activeTrips] = await db.query(`
        SELECT id FROM active_trips
        WHERE schedule_id = ? AND driver_id = ? AND status IN ('STARTED', 'SCHEDULED')
        ORDER BY id DESC LIMIT 1
      `, [id, driverId]);

      if (activeTrips.length > 0) {
        await db.query(`
          UPDATE active_trips
          SET status = 'STARTED', actual_start_time = NOW(), bus_id = ?,
              current_lat = ?, current_lng = ?, last_location_update = NOW(),
              crowd_level = COALESCE(crowd_level, 0), delay_minutes = COALESCE(delay_minutes, 0)
          WHERE id = ?
        `, [busId || bus_id, latitude || 0, longitude || 0, activeTrips[0].id]);
        console.log(`✅ Updated active_trips id ${activeTrips[0].id}`);
      } else {
        await db.query(`
          INSERT INTO active_trips
            (schedule_id, driver_id, bus_id, status, actual_start_time, current_lat, current_lng, last_location_update, crowd_level, delay_minutes)
          VALUES (?, ?, ?, 'STARTED', NOW(), ?, ?, NOW(), 0, 0)
        `, [id, driverId, busId || bus_id, latitude || 0, longitude || 0]);
        console.log('✅ Created active_trips entry');
      }
    } catch (e) {
      console.warn('⚠️ active_trips update failed:', e.message);
    }
    
    console.log(`✅ Trip started for schedule ${id}, assignment ${assignment.id}`);
    res.json({ success: true, message: 'Trip started successfully', assignment_id: assignment.id });
  } catch (error) {
    console.error('❌ Start trip error:', error);
    res.status(500).json({ success: false, error: 'Failed to start trip', details: error.message });
  }
});

// Update trip (crowd level, delay, etc.)
router.put('/:id/update', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { crowd_level, delay_minutes } = req.body;
    
    // Find active assignment
    const [assignments] = await db.query(`
      SELECT id, bus_id FROM driver_assignments
      WHERE schedule_id = ? AND DATE(assigned_date) = CURDATE() AND status = 'IN_PROGRESS'
      ORDER BY id DESC LIMIT 1
    `, [id]);
    
    if (assignments.length === 0) {
      return res.status(404).json({ success: false, error: 'No active trip found' });
    }
    
    const assignment = assignments[0];
    
    // Update assignment
    const updates = [];
    const params = [];
    
    if (crowd_level) {
      updates.push('crowd_level = ?');
      params.push(crowd_level);
    }
    
    if (delay_minutes !== undefined) {
      updates.push('delay_minutes = ?');
      params.push(delay_minutes);
    }
    
    if (updates.length > 0) {
      params.push(assignment.id);
      await db.query(`UPDATE driver_assignments SET ${updates.join(', ')} WHERE id = ?`, params);
    }
    
    // Also update bus crowd level
    if (crowd_level && assignment.bus_id) {
      await db.query('UPDATE buses SET crowd_level = ? WHERE id = ?', [crowd_level, assignment.bus_id]);
    }
    
    // Update active_trips table for user tracking
    if (crowd_level || delay_minutes !== undefined) {
      const activeUpdates = [];
      const activeParams = [];
      
      if (crowd_level) {
        activeUpdates.push('crowd_level = ?');
        activeParams.push(crowd_level);
      }
      
      if (delay_minutes !== undefined) {
        activeUpdates.push('delay_minutes = ?');
        activeParams.push(delay_minutes);
      }
      
      if (activeUpdates.length > 0) {
        activeParams.push(id);
        await db.query(
          `UPDATE active_trips SET ${activeUpdates.join(', ')} 
           WHERE schedule_id = ? AND status = 'STARTED'`,
          activeParams
        );
      }
    }
    
    console.log(`✅ Trip updated: Schedule ${id}, crowd_level: ${crowd_level}, delay: ${delay_minutes}`);
    res.json({ success: true, message: 'Trip updated successfully' });
  } catch (error) {
    console.error('Update trip error:', error);
    res.status(500).json({ success: false, error: 'Failed to update trip' });
  }
});

// End a trip
router.post('/:id/end', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find active assignment
    const [assignments] = await db.query(`
      SELECT id, bus_id FROM driver_assignments
      WHERE schedule_id = ? AND DATE(assigned_date) = CURDATE() AND status = 'IN_PROGRESS'
      ORDER BY id DESC LIMIT 1
    `, [id]);
    
    if (assignments.length === 0) {
      return res.status(404).json({ success: false, error: 'No active trip found' });
    }
    
    const assignment = assignments[0];
    
    // Update assignment status
    await db.query(`
      UPDATE driver_assignments 
      SET status = 'COMPLETED', actual_arrival_time = NOW()
      WHERE id = ?
    `, [assignment.id]);
    
    // Update bus status
    if (assignment.bus_id) {
      await db.query('UPDATE buses SET is_on_trip = 0, crowd_level = NULL WHERE id = ?', [assignment.bus_id]);
    }
    
    // Update active_trips to COMPLETED
    await db.query(`
      UPDATE active_trips 
      SET status = 'COMPLETED', actual_end_time = NOW()
      WHERE schedule_id = ? AND status = 'STARTED'
    `, [id]);
    
    console.log(`✅ Trip ended for schedule ${id}, assignment ${assignment.id}`);
    res.json({ success: true, message: 'Trip completed successfully' });
  } catch (error) {
    console.error('End trip error:', error);
    res.status(500).json({ success: false, error: 'Failed to end trip' });
  }
});

// Get active trips with live tracking (for users)
router.get('/active-trips', async (req, res) => {
  try {
    const [trips] = await db.query(`
      SELECT da.id as assignment_id, da.schedule_id, da.status, da.crowd_level, da.delay_minutes,
             da.actual_departure_time, da.assigned_date,
             s.departure_time, s.arrival_time,
             r.route_name, r.origin, r.destination,
             b.number_plate, b.bus_number, b.current_lat, b.current_lng, b.last_updated,
             u.full_name as driver_name, u.phone as driver_phone
      FROM driver_assignments da
      INNER JOIN schedules s ON da.schedule_id = s.id
      INNER JOIN routes r ON s.route_id = r.id
      INNER JOIN buses b ON da.bus_id = b.id
      LEFT JOIN users u ON da.driver_id = u.id
      WHERE da.status = 'IN_PROGRESS'
        AND da.assigned_date = CURDATE()
        AND b.current_lat IS NOT NULL
        AND b.current_lng IS NOT NULL
      ORDER BY s.departure_time ASC
    `);
    
    res.json({ success: true, data: trips });
  } catch (error) {
    console.error('Get active trips error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch active trips' });
  }
});

module.exports = router;

