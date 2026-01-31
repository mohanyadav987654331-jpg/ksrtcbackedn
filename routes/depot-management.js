const express = require('express');
const router = express.Router();
const { auth, roleAuth } = require('../middleware/auth');
const db = require('../config/database');

// Get depot admin's drivers, buses, and schedules
router.get('/overview', auth, roleAuth('depot_admin', 'super_admin'), async (req, res) => {
  try {
    const depotId = req.user.depot_id;
    const depotName = req.user.depot_name;

    // Get drivers for this depot
    const [drivers] = await db.query(`
      SELECT id, full_name, phone, is_active
      FROM users 
      WHERE depot_id = ? AND role = 'driver'
      ORDER BY full_name
    `, [depotId]);

    // Get buses for this depot
    const [buses] = await db.query(`
      SELECT b.id, b.bus_number, b.bus_type, b.capacity, b.driver_id, b.status,
             u.full_name as driver_name, r.origin, r.destination
      FROM buses b
      LEFT JOIN users u ON b.driver_id = u.id
      LEFT JOIN routes r ON b.route_id = r.id
      WHERE b.depot_id = ?
      ORDER BY b.bus_number
    `, [depotId]);

    // Get today's schedules for this depot
    const [schedules] = await db.query(`
      SELECT s.id, s.departure_time, s.arrival_time, 
             b.bus_number, b.bus_type, u.full_name as driver_name,
             r.origin, r.destination, r.distance, r.estimated_duration,
             COUNT(DISTINCT rs.id) as stop_count
      FROM schedules s
      JOIN buses b ON s.bus_id = b.id
      LEFT JOIN users u ON s.driver_id = u.id
      LEFT JOIN routes r ON s.route_id = r.id
      LEFT JOIN route_stops rs ON r.route_id = rs.route_id
      WHERE b.depot_id = ? AND s.is_active = 1
      GROUP BY s.id
      ORDER BY s.departure_time
    `, [depotId]);

    res.json({
      success: true,
      depot: { id: depotId, name: depotName },
      data: {
        drivers: { count: drivers.length, list: drivers },
        buses: { count: buses.length, list: buses },
        schedules: { count: schedules.length, list: schedules }
      }
    });
  } catch (error) {
    console.error('Error fetching depot overview:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch depot data' });
  }
});

// Get all drivers for a depot
router.get('/drivers', auth, roleAuth('depot_admin', 'super_admin'), async (req, res) => {
  try {
    const depotId = req.user.depot_id || req.query.depot_id;
    const assignedDate = req.query.assigned_date || new Date().toISOString().slice(0, 10);

    const [drivers] = await db.query(`
      SELECT u.id, u.username, u.full_name, u.phone, u.is_active, u.created_at,
             CAST(COUNT(DISTINCT s.id) as UNSIGNED) as total_assignments,
             CAST(COALESCE(SUM(CASE WHEN da.status = 'COMPLETED' THEN 1 ELSE 0 END), 0) as UNSIGNED) as completed_trips,
             CAST(COALESCE(SUM(CASE WHEN da.status = 'IN_PROGRESS' THEN 1 ELSE 0 END), 0) as UNSIGNED) as active_trips,
             GROUP_CONCAT(DISTINCT CONCAT(b.bus_number, ' (', b.number_plate, ')') ORDER BY s.departure_time SEPARATOR ', ') as assigned_buses,
             GROUP_CONCAT(DISTINCT CONCAT(r.origin, ' → ', r.destination) ORDER BY s.departure_time SEPARATOR ' | ') as routes
      FROM users u
      LEFT JOIN schedules s ON u.id = s.driver_id AND s.depot_id = ?
      LEFT JOIN driver_assignments da ON s.id = da.schedule_id AND da.assigned_date = ?
      LEFT JOIN buses b ON s.bus_id = b.id
      LEFT JOIN routes r ON s.route_id = r.id
      WHERE u.depot_id = ? AND u.role = 'driver'
      GROUP BY u.id
      ORDER BY u.full_name
    `, [depotId, assignedDate, depotId]);

    res.json({ success: true, data: drivers });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch drivers' });
  }
});

// Get all buses for a depot
router.get('/buses', auth, roleAuth('depot_admin', 'super_admin'), async (req, res) => {
  try {
    const depotId = req.user.depot_id || req.query.depot_id;
    const assignedDate = req.query.assigned_date || new Date().toISOString().slice(0, 10);

    const [buses] = await db.query(`
      SELECT b.id, b.bus_number, b.bus_type, b.capacity, b.status,
             CAST(COUNT(DISTINCT s.id) as UNSIGNED) as scheduled_trips,
             GROUP_CONCAT(DISTINCT CONCAT(s.departure_time, '-', s.arrival_time) ORDER BY s.departure_time SEPARATOR ' | ') as departure_times,
             GROUP_CONCAT(DISTINCT u.full_name ORDER BY s.departure_time SEPARATOR ', ') as assigned_drivers
      FROM buses b
      LEFT JOIN schedules s ON b.id = s.bus_id AND s.depot_id = ?
      LEFT JOIN users u ON s.driver_id = u.id
      WHERE b.depot_id = ?
      GROUP BY b.id, b.bus_number, b.bus_type, b.capacity, b.status
      ORDER BY b.bus_number
    `, [depotId, depotId]);

    res.json({ success: true, data: buses });
  } catch (error) {
    console.error('Error fetching buses:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch buses' });
  }
});

// Get today's schedule for a depot
router.get('/today-schedule', auth, roleAuth('depot_admin', 'super_admin'), async (req, res) => {
  try {
    const depotId = req.user.depot_id || req.query.depot_id;

    // Get all schedules for this depot - exactly what users see in the app
    const [schedule] = await db.query(`
      SELECT s.id as schedule_id, 
             s.departure_time, 
             s.arrival_time,
             s.route_id, 
             CONCAT(r.origin, '-', r.destination) as route_number,
             CONCAT(r.origin, ' - ', r.destination) as route_name,
             r.origin, 
             r.destination, 
             r.distance, 
             r.estimated_duration,
             s.bus_id,
             b.bus_number,
             b.bus_type,
             b.capacity,
             s.driver_id,
             u.full_name as driver_name,
             u.phone as driver_phone
      FROM schedules s
      JOIN routes r ON s.route_id = r.id
      LEFT JOIN buses b ON s.bus_id = b.id
      LEFT JOIN users u ON s.driver_id = u.id
      WHERE s.depot_id = ? AND s.is_active = 1
      ORDER BY s.departure_time
    `, [depotId]);

    res.json({ success: true, count: schedule.length, data: schedule });
  } catch (error) {
    console.error('Error fetching today schedule:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch schedule' });
  }
});

// Update driver assignment (change driver for a schedule)
router.post('/reassign-driver', auth, roleAuth('depot_admin', 'super_admin'), async (req, res) => {
  try {
    const depotId = req.user.depot_id;
    const { assignmentId, newDriverId } = req.body;

    // Verify assignment belongs to this depot
    const [assignment] = await db.query(`
      SELECT da.id, da.driver_id, b.depot_id, s.departure_time
      FROM driver_assignments da
      JOIN buses b ON da.bus_id = b.id
      JOIN schedules s ON da.schedule_id = s.id
      WHERE da.id = ? AND b.depot_id = ?
    `, [assignmentId, depotId]);

    if (assignment.length === 0) {
      return res.status(403).json({ success: false, message: 'Assignment not found in your depot' });
    }

    // Check if new driver belongs to same depot
    const [newDriver] = await db.query(`
      SELECT id FROM users WHERE id = ? AND depot_id = ? AND role = 'driver'
    `, [newDriverId, depotId]);

    if (newDriver.length === 0) {
      return res.status(400).json({ success: false, message: 'Driver not found in your depot' });
    }

    // Update assignment
    const [result] = await db.query(`
      UPDATE driver_assignments 
      SET driver_id = ?, updated_at = NOW()
      WHERE id = ?
    `, [newDriverId, assignmentId]);

    // Also update schedule's driver
    await db.query(`
      UPDATE schedules 
      SET driver_id = ?
      WHERE id = (SELECT schedule_id FROM driver_assignments WHERE id = ?)
    `, [newDriverId, assignmentId]);

    res.json({ success: true, message: 'Driver reassigned successfully' });
  } catch (error) {
    console.error('Error reassigning driver:', error);
    res.status(500).json({ success: false, message: 'Failed to reassign driver' });
  }
});

// Update schedule times for a route (depot admin can change departure times)
router.post('/depot/update-schedule', auth, roleAuth('depot_admin', 'super_admin'), async (req, res) => {
  try {
    const depotId = req.user.depot_id;
    const { scheduleId, departureTime, arrivalTime } = req.body;

    // Verify schedule belongs to this depot
    const [schedule] = await db.query(`
      SELECT s.id, b.depot_id FROM schedules s
      JOIN buses b ON s.bus_id = b.id
      WHERE s.id = ? AND b.depot_id = ?
    `, [scheduleId, depotId]);

    if (schedule.length === 0) {
      return res.status(403).json({ success: false, message: 'Schedule not found in your depot' });
    }

    // Update schedule
    const [result] = await db.query(`
      UPDATE schedules 
      SET departure_time = ?, arrival_time = ?, updated_at = NOW()
      WHERE id = ?
    `, [departureTime, arrivalTime, scheduleId]);

    res.json({ success: true, message: 'Schedule updated successfully' });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ success: false, message: 'Failed to update schedule' });
  }
});

// Get routes available for this depot
router.get('/depot/available-routes', auth, roleAuth('depot_admin', 'super_admin'), async (req, res) => {
  try {
    // Get all routes available in the system
    const [routes] = await db.query(`
      SELECT r.id, r.route_number, r.route_name, r.origin, r.destination, 
             r.distance, r.estimated_duration
      FROM routes r
      ORDER BY r.origin, r.destination
    `);

    res.json({ success: true, data: routes });
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch routes' });
  }
});

// Create new schedule for a route in depot
router.post('/depot/create-schedule', auth, roleAuth('depot_admin', 'super_admin'), async (req, res) => {
  try {
    const depotId = req.user.depot_id;
    const { routeId, departureTime, arrivalTime, driverId } = req.body;

    // Verify route exists
    const [route] = await db.query(
      'SELECT id FROM routes WHERE id = ?',
      [routeId]
    );

    if (route.length === 0) {
      return res.status(400).json({ success: false, message: 'Route not found' });
    }

    // Create a bus first if needed
    const busNumber = `KA-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    
    const [busResult] = await db.query(`
      INSERT INTO buses (bus_number, bus_type, route_id, depot_id, capacity, driver_id, status)
      VALUES (?, 'NORMAL', ?, ?, 50, ?, 'AVAILABLE')
    `, [busNumber, routeId, depotId, driverId]);

    const busId = busResult.insertId;

    // Create schedule
    const [scheduleResult] = await db.query(`
      INSERT INTO schedules (route_id, bus_id, driver_id, depot_id, departure_time, arrival_time, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `, [routeId, busId, driverId, depotId, departureTime, arrivalTime]);

    res.json({
      success: true,
      message: 'Schedule created successfully',
      data: { scheduleId: scheduleResult.insertId, busId: busId, busNumber: busNumber }
    });
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ success: false, message: 'Failed to create schedule' });
  }
});

// Update schedule with driver and bus assignments
router.put('/schedule/update', auth, roleAuth('depot_admin', 'super_admin'), async (req, res) => {
  try {
    const depotId = req.user.depot_id;
    const { scheduleId, departureTime, arrivalTime, busId, driverId } = req.body;

    // Verify schedule belongs to this depot
    const [schedule] = await db.query(`
      SELECT s.id FROM schedules s
      WHERE s.id = ? AND s.depot_id = ?
    `, [scheduleId, depotId]);

    if (schedule.length === 0) {
      return res.status(403).json({ success: false, message: 'Schedule not found in your depot' });
    }

    // Verify bus belongs to this depot if provided
    if (busId) {
      const [bus] = await db.query('SELECT id FROM buses WHERE id = ? AND depot_id = ?', [busId, depotId]);
      if (bus.length === 0) {
        return res.status(400).json({ success: false, message: 'Bus not found in your depot' });
      }
    }

    // Verify driver belongs to this depot if provided
    if (driverId) {
      const [driver] = await db.query('SELECT id FROM users WHERE id = ? AND depot_id = ? AND role = "driver"', [driverId, depotId]);
      if (driver.length === 0) {
        return res.status(400).json({ success: false, message: 'Driver not found in your depot' });
      }
    }

    // Update schedule
    const [result] = await db.query(`
      UPDATE schedules 
      SET departure_time = ?, 
          arrival_time = ?, 
          bus_id = COALESCE(?, bus_id),
          driver_id = COALESCE(?, driver_id),
          updated_at = NOW()
      WHERE id = ?
    `, [departureTime, arrivalTime, busId, driverId, scheduleId]);

    res.json({ success: true, message: 'Schedule updated successfully' });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ success: false, message: 'Failed to update schedule' });
  }
});

// Delete schedule (soft delete by setting is_active = 0)
router.delete('/schedule/delete/:scheduleId', auth, roleAuth('depot_admin', 'super_admin'), async (req, res) => {
  try {
    const depotId = req.user.depot_id;
    const { scheduleId } = req.params;

    // Verify schedule belongs to this depot
    const [schedule] = await db.query(`
      SELECT s.id FROM schedules s
      WHERE s.id = ? AND s.depot_id = ?
    `, [scheduleId, depotId]);

    if (schedule.length === 0) {
      return res.status(403).json({ success: false, message: 'Schedule not found in your depot' });
    }

    // Soft delete by setting is_active = 0
    const [result] = await db.query(`
      UPDATE schedules 
      SET is_active = 0, updated_at = NOW()
      WHERE id = ?
    `, [scheduleId]);

    res.json({ success: true, message: 'Schedule removed successfully' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ success: false, message: 'Failed to delete schedule' });
  }
});

// Add new schedule with driver and bus
router.post('/schedule/add', auth, roleAuth('depot_admin', 'super_admin'), async (req, res) => {
  try {
    const depotId = req.user.depot_id;
    const { routeId, departureTime, arrivalTime, busId, driverId } = req.body;

    // Validate required fields
    if (!routeId || !departureTime || !arrivalTime || !busId || !driverId) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Verify route exists
    const [route] = await db.query('SELECT id FROM routes WHERE id = ?', [routeId]);
    if (route.length === 0) {
      return res.status(400).json({ success: false, message: 'Route not found' });
    }

    // Verify bus belongs to this depot
    const [bus] = await db.query('SELECT id FROM buses WHERE id = ? AND depot_id = ?', [busId, depotId]);
    if (bus.length === 0) {
      return res.status(400).json({ success: false, message: 'Bus not found in your depot' });
    }

    // Verify driver belongs to this depot
    const [driver] = await db.query('SELECT id FROM users WHERE id = ? AND depot_id = ? AND role = "driver"', [driverId, depotId]);
    if (driver.length === 0) {
      return res.status(400).json({ success: false, message: 'Driver not found in your depot' });
    }

    // Create schedule
    const [result] = await db.query(`
      INSERT INTO schedules (route_id, bus_id, driver_id, depot_id, departure_time, arrival_time, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `, [routeId, busId, driverId, depotId, departureTime, arrivalTime]);

    res.json({
      success: true,
      message: 'Schedule added successfully',
      data: { scheduleId: result.insertId }
    });
  } catch (error) {
    console.error('Error adding schedule:', error);
    res.status(500).json({ success: false, message: 'Failed to add schedule' });
  }
});

// CREATE new driver (Depot Admin)
router.post('/drivers', auth, roleAuth('depot_admin', 'super_admin'), async (req, res) => {
  try {
    const depotId = req.user.depot_id || req.body.depot_id;
    const { username, full_name, phone, email, password } = req.body;

    if (!username || !full_name || !phone || !email || !password) {
      return res.status(400).json({ success: false, error: 'All fields required' });
    }

    // Check if username/email exists
    const [existing] = await db.query('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'Username or email already exists' });
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert driver
    const [result] = await db.query(`
      INSERT INTO users (username, full_name, phone, email, password_hash, role, depot_id, is_active)
      VALUES (?, ?, ?, ?, ?, 'driver', ?, 1)
    `, [username, full_name, phone, email, hashedPassword, depotId]);

    res.json({
      success: true,
      message: 'Driver created successfully',
      data: { id: result.insertId, username, full_name, phone, email, depot_id: depotId }
    });
  } catch (error) {
    console.error('Error creating driver:', error);
    res.status(500).json({ success: false, error: 'Failed to create driver' });
  }
});

// CREATE new bus (Depot Admin & Super Admin)
router.post('/buses', auth, roleAuth('depot_admin', 'super_admin'), async (req, res) => {
  try {
    const depotId = req.user.depot_id || req.body.depot_id;
    const { bus_number, number_plate, bus_type, capacity, driver_id } = req.body;

    if (!bus_number || !number_plate) {
      return res.status(400).json({ success: false, error: 'Bus number and plate required' });
    }

    // Check if number plate exists
    const [existing] = await db.query('SELECT id FROM buses WHERE number_plate = ?', [number_plate]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'Number plate already exists' });
    }

    // Insert bus
    const [result] = await db.query(`
      INSERT INTO buses (bus_number, number_plate, bus_type, capacity, depot_id, driver_id, status, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 'AVAILABLE', 1)
    `, [bus_number, number_plate, bus_type || 'ORDINARY', capacity || 40, depotId, driver_id || null]);

    res.json({
      success: true,
      message: 'Bus created successfully',
      data: { id: result.insertId, bus_number, number_plate, depot_id: depotId }
    });
  } catch (error) {
    console.error('Error creating bus:', error);
    res.status(500).json({ success: false, error: 'Failed to create bus' });
  }
});

// Create new schedule (assignment)
router.post('/schedules', auth, roleAuth('depot_admin', 'super_admin'), async (req, res) => {
  try {
    const { route_id, bus_id, driver_id, departure_time, assigned_date } = req.body;
    const depotId = req.user.depot_id;

    // Validate required fields
    if (!route_id || !bus_id || !driver_id || !departure_time || !assigned_date) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    // Insert into driver_assignments table
    const [result] = await db.query(`
      INSERT INTO driver_assignments (driver_id, bus_id, route_id, assigned_date, departure_time, status)
      VALUES (?, ?, ?, ?, ?, 'PENDING')
    `, [driver_id, bus_id, route_id, assigned_date, departure_time]);

    res.json({
      success: true,
      message: 'Schedule created successfully',
      data: { id: result.insertId, driver_id, bus_id, route_id, assigned_date, departure_time }
    });
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ success: false, error: 'Failed to create schedule' });
  }
});

module.exports = router;
