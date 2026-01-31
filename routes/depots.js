const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth, roleAuth } = require('../middleware/auth');

// GET all depots with statistics (public - needed for login screen)
router.get('/', async (req, res) => {
  try {
    const q = (req.query.query || '').trim();
    let query = `
      SELECT d.*, 
        COUNT(DISTINCT u.id) as total_drivers,
        COUNT(DISTINCT IF(u.role = 'driver', u.id, NULL)) as active_drivers,
        COUNT(DISTINCT s.id) as today_buses
      FROM depots d
      LEFT JOIN users u ON d.id = u.depot_id
      LEFT JOIN buses b ON d.id = b.depot_id
      LEFT JOIN schedules s ON b.id = s.bus_id AND s.is_active = 1
      WHERE d.is_active = 1
    `;
    let params = [];
    
    if (q.length > 0) {
      query += ` AND (d.depot_name LIKE ? OR d.location LIKE ?)`;
      const like = `%${q}%`;
      params = [like, like];
    }
    
    query += ` GROUP BY d.id ORDER BY d.depot_name LIMIT 50`;
    const [rows] = await db.query(query, params);
    
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Depots list error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch depots' });
  }
});

// GET depot by ID with full details (requires auth)
router.get('/:depotId', auth, async (req, res) => {
  try {
    const { depotId } = req.params;
    
    const [depot] = await db.query(`
      SELECT d.*, 
        COUNT(DISTINCT u.id) as total_drivers,
        COUNT(DISTINCT IF(u.role = 'driver', u.id, NULL)) as active_drivers,
        COUNT(DISTINCT s.id) as scheduled_buses
      FROM depots d
      LEFT JOIN users u ON d.id = u.depot_id
      LEFT JOIN schedules s ON d.id = s.depot_id AND DATE(s.created_at) = CURDATE()
      WHERE d.id = ? AND d.is_active = 1
      GROUP BY d.id
    `, [depotId]);
    
    if (!depot || depot.length === 0) {
      return res.status(404).json({ success: false, message: 'Depot not found' });
    }
    
    // Get today's schedule
    const [todaySchedules] = await db.query(`
      SELECT s.*, b.bus_number, b.bus_type, u.full_name as driver_name,
        r.origin, r.destination, r.distance, r.estimated_duration,
        da.status as assignment_status, da.crowd_level, da.delay_minutes
      FROM schedules s
      JOIN routes r ON s.route_id = r.id
      JOIN buses b ON s.bus_id = b.id
      LEFT JOIN users u ON s.driver_id = u.id
      LEFT JOIN driver_assignments da ON s.id = da.schedule_id 
        AND da.assigned_date = CURDATE()
      WHERE s.depot_id = ? AND DATE(s.created_at) = CURDATE()
      ORDER BY s.departure_time
    `, [depotId]);
    
    res.json({ 
      success: true, 
      depot: depot[0],
      todaySchedules 
    });
  } catch (error) {
    console.error('Error fetching depot details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch depot details' });
  }
});

// POST - create depot (super admin only)
router.post('/', auth, roleAuth('super_admin'), async (req, res) => {
  try {
    const { depotName, location, location_string, latitude, longitude, phone } = req.body;
    if (!depotName || !location) {
      return res.status(400).json({ success: false, error: 'depotName and location are required' });
    }

    const [result] = await db.query(
      'INSERT INTO depots (depot_name, location, location_string, latitude, longitude, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [depotName.trim(), location.trim(), location_string || location.trim(), latitude ?? null, longitude ?? null, phone ?? null]
    );

    const [rows] = await db.query(
      'SELECT * FROM depots WHERE id = ?',
      [result.insertId]
    );

    return res.json({ success: true, message: 'Depot created', data: rows[0] });
  } catch (err) {
    console.error('Create depot error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to create depot' });
  }
});

module.exports = router;
