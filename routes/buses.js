const express = require('express');
const router = express.Router();
const { auth, roleAuth } = require('../middleware/auth');
const db = require('../config/database');

// Get all buses (with optional filters)
router.get('/', auth, async (req, res) => {
  try {
    const { status, routeId, depotId, origin, destination, busType, date } = req.query;
    
    console.log('🔍 Bus Search Request:', { origin, destination, busType });
    
    // If searching by origin and destination, use schedules query
    if (origin && destination) {
      let query = `
        SELECT DISTINCT
          s.id as schedule_id,
          s.departure_time,
          s.arrival_time,
          s.days_of_week,
          b.id as bus_id,
          b.bus_number,
          b.bus_type,
          b.capacity,
          r.route_id,
          r.route_name,
          r.origin,
          r.destination,
          r.distance,
          r.estimated_duration,
          u.full_name as driver_name,
          u.phone as driver_phone,
          GROUP_CONCAT(DISTINCT CONCAT(rs.stop_name,'|',rs.stop_order,'|',rs.estimated_minutes_from_origin)
            ORDER BY rs.stop_order SEPARATOR '::') as stops_data
        FROM schedules s
        JOIN routes r ON s.route_id = r.id
        JOIN buses b ON s.bus_id = b.id
        LEFT JOIN users u ON s.driver_id = u.id
        LEFT JOIN route_stops rs ON r.route_id = rs.route_id
        WHERE r.origin = ? 
          AND r.destination = ?
          AND s.is_active = TRUE
          AND b.is_active = TRUE
          AND TIME(s.departure_time) >= '04:30:00'
          AND TIME(s.departure_time) <= '23:00:00'
      `;
      const params = [origin, destination];
      
      if (busType && busType !== 'ALL') {
        query += ' AND b.bus_type = ?';
        params.push(busType);
      }
      
      query += ' GROUP BY s.id, b.id, r.id ORDER BY s.departure_time';
      
      console.log('📊 Executing query with params:', params);
      const [results] = await db.query(query, params);
      console.log(`✅ Found ${results.length} buses`);
      
      // Process stops data
      const processedResults = results.map(bus => {
        const stops = bus.stops_data ? bus.stops_data.split('::').map(stop => {
          const [name, order, minutes] = stop.split('|');
          return {
            stopName: name,
            stopOrder: parseInt(order),
            estimatedMinutesFromOrigin: parseInt(minutes)
          };
        }) : [];
        
        return {
          ...bus,
          stops,
          stops_data: undefined
        };
      });
      
      return res.json({ success: true, data: processedResults });
    }
    
    // Regular bus query
    let query = 'SELECT * FROM buses WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (routeId) {
      query += ' AND route_id = ?';
      params.push(routeId);
    }
    if (depotId) {
      query += ' AND depot_id = ?';
      params.push(depotId);
    }

    const [buses] = await db.query(query, params);
    res.json(buses);
  } catch (error) {
    console.error('Get buses error:', error);
    res.status(500).json({ error: 'Failed to fetch buses' });
  }
});

// Get bus by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const [buses] = await db.query('SELECT * FROM buses WHERE id = ?', [req.params.id]);
    if (buses.length === 0) {
      return res.status(404).json({ error: 'Bus not found' });
    }
    res.json(buses[0]);
  } catch (error) {
    console.error('Get bus error:', error);
    res.status(500).json({ error: 'Failed to fetch bus' });
  }
});

// Get bus location with crowd info
router.get('/:id/location', auth, async (req, res) => {
  try {
    const [buses] = await db.query(`
      SELECT 
        b.id,
        b.bus_number,
        b.current_lat as latitude,
        b.current_lng as longitude,
        b.current_lat,
        b.current_lng,
        b.status,
        b.crowd_level,
        b.next_stop,
        b.last_updated,
        b.delay_minutes,
        0 as speed
      FROM buses b
      WHERE b.id = ?
    `, [req.params.id]);
    
    if (buses.length === 0) {
      return res.status(404).json({ error: 'Bus not found' });
    }
    
    res.json(buses[0]);
  } catch (error) {
    console.error('Get bus location error:', error);
    res.status(500).json({ error: 'Failed to fetch bus location' });
  }
});

// Get buses by route
router.get('/route/:routeId', auth, async (req, res) => {
  try {
    const [buses] = await db.query(
      'SELECT * FROM buses WHERE route_id = ? AND is_active = 1',
      [req.params.routeId]
    );
    res.json(buses);
  } catch (error) {
    console.error('Get buses by route error:', error);
    res.status(500).json({ error: 'Failed to fetch buses' });
  }
});

// Update bus location (Driver only)
router.put('/:id/location', auth, roleAuth('driver', 'DRIVER'), async (req, res) => {
  try {
    const { latitude, longitude, status, crowdLevel, nextStop, estimatedArrival, delayMinutes } = req.body;

    await db.query(
      `UPDATE buses SET 
        current_lat = ?, 
        current_lng = ?, 
        status = COALESCE(?, status),
        crowd_level = COALESCE(?, crowd_level),
        next_stop = COALESCE(?, next_stop),
        estimated_arrival = COALESCE(?, estimated_arrival),
        delay_minutes = COALESCE(?, delay_minutes),
        last_updated = NOW()
      WHERE id = ?`,
      [latitude, longitude, status, crowdLevel, nextStop, estimatedArrival, delayMinutes, req.params.id]
    );

    // Keep active_trips in sync for user tracking (separate query to avoid MySQL subquery limitation)
    await db.query(
      `UPDATE active_trips
       SET current_lat = ?, current_lng = ?, last_location_update = NOW(),
           crowd_level = COALESCE(?, crowd_level),
           delay_minutes = COALESCE(?, delay_minutes)
       WHERE bus_id = ? AND status = 'STARTED'
       ORDER BY id DESC LIMIT 1`,
      [latitude, longitude, crowdLevel, delayMinutes, req.params.id]
    );

    // Emit to WebSocket for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('busLocationUpdate', {
        busId: req.params.id,
        latitude,
        longitude,
        status,
        crowdLevel,
        nextStop,
        estimatedArrival,
        delayMinutes,
        timestamp: new Date()
      });
    }

    res.json({ message: 'Location updated successfully' });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Update bus status (Depot admin only)
router.put('/:id/status', auth, roleAuth('DEPOT', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { status, isActive } = req.body;

    await db.query(
      'UPDATE buses SET status = COALESCE(?, status), is_active = COALESCE(?, is_active) WHERE id = ?',
      [status, isActive, req.params.id]
    );

    res.json({ message: 'Bus status updated successfully' });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Assign driver to bus (Depot admin only)
router.put('/:id/driver', auth, roleAuth('DEPOT', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { driverId } = req.body;

    // Get driver name
    const [drivers] = await db.query('SELECT username FROM users WHERE id = ? AND role = "DRIVER"', [driverId]);
    if (drivers.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    await db.query(
      'UPDATE buses SET driver_id = ?, driver_name = ? WHERE id = ?',
      [driverId, drivers[0].username, req.params.id]
    );

    res.json({ message: 'Driver assigned successfully' });
  } catch (error) {
    console.error('Assign driver error:', error);
    res.status(500).json({ error: 'Failed to assign driver' });
  }
});

// Get active buses with live driver locations (for real-time tracking)
router.get('/active-with-location', auth, async (req, res) => {
  try {
    const { query } = req.query;
    
    console.log('🔍 Active Bus Search Request:', { query });
    
    // Query buses that have active trips (from driver_assignments with IN_PROGRESS status)
    let sqlQuery = `
      SELECT 
        b.id as bus_id,
        b.bus_number,
        COALESCE(b.number_plate, b.bus_number) as number_plate,
        b.bus_type,
        b.current_lat,
        b.current_lng,
        b.last_updated as last_location_update,
        b.status,
        b.crowd_level,
        b.next_stop,
        b.delay_minutes,
        u.id as driver_id,
        u.full_name as driver_name,
        r.route_name,
        r.origin,
        r.destination,
        depot.depot_name,
        da.schedule_id,
        da.started_at
      FROM driver_assignments da
      INNER JOIN buses b ON da.bus_id = b.id
      INNER JOIN users u ON da.driver_id = u.id
      LEFT JOIN schedules s ON da.schedule_id = s.id
      LEFT JOIN routes r ON s.route_id = r.id
      LEFT JOIN depots depot ON b.depot_id = depot.id
      WHERE da.status = 'IN_PROGRESS'
        AND b.is_active = 1
        AND u.is_active = 1
        AND b.current_lat IS NOT NULL 
        AND b.current_lng IS NOT NULL
        AND b.last_updated > DATE_SUB(NOW(), INTERVAL 30 MINUTE)
    `;
    
    const params = [];
    
    // Add search filter if query provided
    if (query) {
      sqlQuery += ` AND (
        b.bus_number LIKE ? OR
        b.number_plate LIKE ? OR
        r.origin LIKE ? OR
        r.destination LIKE ? OR
        r.route_name LIKE ? OR
        depot.depot_name LIKE ? OR
        u.full_name LIKE ?
      )`;
      const searchTerm = `%${query}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    sqlQuery += ' ORDER BY b.last_updated DESC LIMIT 50';
    
    const [buses] = await db.query(sqlQuery, params);
    
    console.log(`✅ Found ${buses.length} active buses with live locations`);
    
    res.json({
      success: true,
      data: buses,
      message: buses.length === 0 
        ? 'No active buses found with drivers on duty' 
        : `${buses.length} active bus(es) found`
    });
  } catch (error) {
    console.error('Active buses error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch active buses' 
    });
  }
});

module.exports = router;
