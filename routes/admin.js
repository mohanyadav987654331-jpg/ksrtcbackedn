const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth, roleAuth } = require('../middleware/auth');

// GET all statistics for super admin dashboard
router.get('/statistics', auth, roleAuth('super_admin'), async (req, res) => {
  try {
    const [depots] = await db.query('SELECT COUNT(*) as count FROM depots WHERE is_active = 1');
    const [users] = await db.query('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
    const [drivers] = await db.query('SELECT COUNT(*) as count FROM users WHERE role = "driver" AND is_active = 1');
    const [buses] = await db.query('SELECT COUNT(*) as count FROM buses WHERE is_active = 1');

    res.json({
      success: true,
      data: {
        total_depots: depots[0].count,
        total_users: users[0].count,
        total_drivers: drivers[0].count,
        total_buses: buses[0].count,
      },
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

// GET all users (for super admin)
router.get('/users', auth, roleAuth('super_admin'), async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT id, username, full_name, phone, role, depot_id, is_active, created_at
      FROM users
      WHERE is_active = 1
      ORDER BY role DESC, full_name ASC
    `);

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// UPDATE user details (for super admin)
router.put('/users/:userId', auth, roleAuth('super_admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { full_name, phone, role } = req.body;

    const [result] = await db.query(
      'UPDATE users SET full_name = ?, phone = ?, role = ? WHERE id = ?',
      [full_name, phone, role, userId]
    );

    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

// GET all drivers with their locations and assignments
router.get('/all-drivers', auth, roleAuth('super_admin'), async (req, res) => {
  try {
    const [drivers] = await db.query(`
      SELECT u.id, u.full_name, u.phone, u.depot_id, u.is_active, u.created_at,
             GROUP_CONCAT(DISTINCT b.bus_number) as assigned_buses,
             GROUP_CONCAT(DISTINCT CONCAT(r.origin, ' → ', r.destination)) as routes
      FROM users u
      LEFT JOIN schedules s ON u.id = s.driver_id
      LEFT JOIN buses b ON s.bus_id = b.id
      LEFT JOIN routes r ON s.route_id = r.id
      WHERE u.role = 'driver'
      GROUP BY u.id
      ORDER BY u.depot_id, u.full_name
    `);

    res.json({ success: true, data: drivers });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch drivers' });
  }
});

// GET depot admin's drivers with location
router.get('/depot-drivers/:depotId', auth, roleAuth('depot_admin', 'super_admin'), async (req, res) => {
  try {
    const { depotId } = req.params;
    
    // Verify user has access to this depot
    if (req.user.role === 'depot_admin' && req.user.depot_id != depotId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const [drivers] = await db.query(`
      SELECT u.id, u.full_name, u.phone, u.depot_id, u.is_active,
             u.current_lat, u.current_lng,
             GROUP_CONCAT(DISTINCT b.bus_number) as assigned_buses,
             GROUP_CONCAT(DISTINCT CONCAT(r.origin, ' → ', r.destination)) as routes,
             COUNT(DISTINCT s.id) as total_assignments
      FROM users u
      LEFT JOIN schedules s ON u.id = s.driver_id AND s.depot_id = ?
      LEFT JOIN buses b ON s.bus_id = b.id
      LEFT JOIN routes r ON s.route_id = r.id
      WHERE u.depot_id = ? AND u.role = 'driver'
      GROUP BY u.id
      ORDER BY u.full_name
    `, [depotId, depotId]);

    res.json({ success: true, data: drivers });
  } catch (error) {
    console.error('Error fetching depot drivers:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch drivers' });
  }
});

// GET upcoming buses for a depot
router.get('/upcoming-buses/:depotId', auth, async (req, res) => {
  try {
    const { depotId } = req.params;

    const [buses] = await db.query(`
      SELECT s.id as schedule_id, s.departure_time, s.arrival_time,
             b.id, b.bus_number, b.bus_type, b.capacity, b.status,
             r.origin, r.destination, r.distance,
             u.full_name as driver_name, u.phone as driver_phone,
             TIMESTAMPDIFF(MINUTE, NOW(), s.departure_time) as minutes_until_departure
      FROM schedules s
      JOIN buses b ON s.bus_id = b.id
      JOIN routes r ON s.route_id = r.id
      JOIN users u ON s.driver_id = u.id
      WHERE s.depot_id = ? AND s.departure_time > NOW() AND s.is_active = 1
      ORDER BY s.departure_time ASC
      LIMIT 20
    `, [depotId]);

    res.json({ success: true, data: buses });
  } catch (error) {
    console.error('Error fetching upcoming buses:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch buses' });
  }
});

// GET reports data
router.get('/reports', auth, roleAuth('super_admin', 'depot_admin'), async (req, res) => {
  try {
    const depotId = req.user.role === 'super_admin' ? req.query.depot_id : req.user.depot_id;

    // Get overall statistics
    let whereClause = depotId ? 'WHERE s.depot_id = ?' : '';
    let queryParams = depotId ? [depotId] : [];

    const [dailyStats] = await db.query(`
      SELECT DATE(s.departure_time) as date,
             COUNT(DISTINCT s.id) as total_trips,
             COUNT(DISTINCT s.bus_id) as buses_used,
             COUNT(DISTINCT s.driver_id) as drivers_deployed,
             SUM(CASE WHEN s.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_trips,
             ROUND(AVG(r.distance), 2) as avg_distance
      FROM schedules s
      LEFT JOIN routes r ON s.route_id = r.id
      ${whereClause}
      ${whereClause ? 'AND' : 'WHERE'} DATE(s.departure_time) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(s.departure_time)
      ORDER BY date DESC
    `, queryParams);

    // Get summary stats (all time if super admin, depot if depot admin)
    const [[summary]] = await db.query(`
      SELECT 
        COUNT(DISTINCT s.id) as total_schedules,
        COUNT(DISTINCT s.bus_id) as total_buses_deployed,
        COUNT(DISTINCT s.driver_id) as total_drivers_deployed,
        SUM(CASE WHEN s.status = 'COMPLETED' THEN 1 ELSE 0 END) as total_completed,
        SUM(CASE WHEN s.status = 'RUNNING' THEN 1 ELSE 0 END) as currently_running,
        ROUND(AVG(r.distance), 2) as overall_avg_distance
      FROM schedules s
      LEFT JOIN routes r ON s.route_id = r.id
      ${whereClause}
    `, queryParams);

    res.json({ success: true, data: { dailyStats, summary: summary || {} } });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reports' });
  }
});

module.exports = router;
