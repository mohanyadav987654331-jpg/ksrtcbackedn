const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const db = require('../config/database');

// Update driver location (real-time tracking)
router.post('/location', auth, async (req, res) => {
  try {
    const { driver_id, bus_id, latitude, longitude, timestamp } = req.body;

    if (!driver_id || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: driver_id, latitude, longitude'
      });
    }

    // Update driver location in drivers table
    await db.query(
      `UPDATE drivers SET 
        current_lat = ?, 
        current_lng = ?,
        last_location_update = NOW()
      WHERE id = ?`,
      [latitude, longitude, driver_id]
    );

    // Update bus location if bus_id provided
    if (bus_id) {
      await db.query(
        `UPDATE buses SET 
          current_lat = ?,
          current_lng = ?,
          last_updated = NOW()
        WHERE id = ?`,
        [latitude, longitude, bus_id]
      );
    }

    console.log(`📍 Location updated for driver ${driver_id}: ${latitude}, ${longitude}`);

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: {
        driver_id,
        latitude,
        longitude,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update location'
    });
  }
});

// Get driver's current assignment (bus, route, next stop)
router.get('/:id/assignment', auth, async (req, res) => {
  try {
    const driverId = req.params.id;

    const [assignments] = await db.query(`
      SELECT 
        d.id as driver_id,
        d.driver_name,
        d.is_on_trip,
        b.id as bus_id,
        b.bus_number,
        b.bus_type,
        b.number_plate,
        b.current_lat as bus_lat,
        b.current_lng as bus_lng,
        depot.depot_name,
        r.id as route_id,
        r.route_id as route_code,
        r.route_name,
        r.origin,
        r.destination,
        s.departure_time,
        s.arrival_time
      FROM drivers d
      LEFT JOIN buses b ON d.current_bus_id = b.id
      LEFT JOIN depots depot ON d.depot_id = depot.id
      LEFT JOIN routes r ON b.route_id = r.id
      LEFT JOIN schedules s ON s.bus_id = b.id AND s.is_active = 1
      WHERE d.id = ? AND d.is_active = 1
      LIMIT 1
    `, [driverId]);

    if (assignments.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'No assignment found'
      });
    }

    const assignment = assignments[0];
    
    // Get next stop from route_stops if route exists
    let nextStop = null;
    if (assignment.route_id) {
      const [stops] = await db.query(`
        SELECT stop_name, latitude, longitude, estimated_minutes_from_origin
        FROM route_stops
        WHERE route_id = (SELECT route_id FROM routes WHERE id = ?)
        ORDER BY stop_order ASC
        LIMIT 1
      `, [assignment.route_id]);
      
      if (stops.length > 0) {
        nextStop = stops[0].stop_name;
      }
    }

    res.json({
      success: true,
      data: {
        bus: assignment.bus_id ? {
          id: assignment.bus_id,
          bus_number: assignment.bus_number,
          bus_type: assignment.bus_type,
          number_plate: assignment.number_plate,
          depot_name: assignment.depot_name,
          current_lat: assignment.bus_lat,
          current_lng: assignment.bus_lng
        } : null,
        route: assignment.route_id ? {
          id: assignment.route_id,
          route_id: assignment.route_code,
          route_name: assignment.route_name,
          origin: assignment.origin,
          destination: assignment.destination
        } : null,
        next_stop: nextStop,
        is_on_trip: assignment.is_on_trip === 1
      }
    });
  } catch (error) {
    console.error('Get assignment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assignment'
    });
  }
});

// Calculate ETA to next stop
router.post('/calculate-eta', auth, async (req, res) => {
  try {
    const { current_lat, current_lng, route_id, next_stop } = req.body;

    if (!current_lat || !current_lng || !route_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Get next stop coordinates
    const [stops] = await db.query(`
      SELECT latitude, longitude, estimated_minutes_from_origin
      FROM route_stops
      WHERE route_id = (SELECT route_id FROM routes WHERE id = ?)
      AND stop_name = ?
      LIMIT 1
    `, [route_id, next_stop]);

    if (stops.length === 0) {
      return res.json({
        success: true,
        data: { eta_minutes: null },
        message: 'Stop coordinates not found'
      });
    }

    const stop = stops[0];
    
    // Calculate distance using Haversine formula
    const distance = calculateDistance(
      current_lat,
      current_lng,
      stop.latitude,
      stop.longitude
    );

    // Assume average speed of 40 km/h in city
    const avgSpeed = 40; // km/h
    const etaMinutes = Math.round((distance / avgSpeed) * 60);

    res.json({
      success: true,
      data: {
        eta_minutes: etaMinutes,
        distance_km: distance.toFixed(2),
        next_stop_lat: stop.latitude,
        next_stop_lng: stop.longitude
      }
    });
  } catch (error) {
    console.error('ETA calculation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate ETA'
    });
  }
});

// Update driver status (ON_TRIP, OFF_DUTY, etc.)
router.post('/status', auth, async (req, res) => {
  try {
    const { driver_id, status, is_on_trip } = req.body;

    await db.query(
      `UPDATE drivers SET 
        is_on_trip = ?,
        trip_start_time = CASE 
          WHEN ? = 1 AND is_on_trip = 0 THEN NOW()
          ELSE trip_start_time
        END
      WHERE id = ?`,
      [is_on_trip ? 1 : 0, is_on_trip ? 1 : 0, driver_id]
    );

    res.json({
      success: true,
      message: 'Status updated successfully'
    });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update status'
    });
  }
});

// Get all active drivers with locations (for map display)
router.get('/active-locations', auth, async (req, res) => {
  try {
    const [drivers] = await db.query(`
      SELECT 
        d.id,
        d.driver_name,
        d.current_lat,
        d.current_lng,
        d.is_on_trip,
        d.last_location_update,
        b.id as bus_id,
        b.bus_number,
        b.number_plate,
        b.bus_type,
        r.route_name,
        r.origin,
        r.destination,
        depot.depot_name
      FROM drivers d
      LEFT JOIN buses b ON d.current_bus_id = b.id
      LEFT JOIN routes r ON b.route_id = r.id
      LEFT JOIN depots depot ON d.depot_id = depot.id
      WHERE d.is_active = 1 
        AND d.is_on_trip = 1
        AND d.current_lat IS NOT NULL 
        AND d.current_lng IS NOT NULL
        AND d.last_location_update > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
      ORDER BY d.last_location_update DESC
    `);

    res.json({
      success: true,
      data: drivers.map(d => ({
        driver_id: d.id,
        driver_name: d.driver_name,
        latitude: d.current_lat,
        longitude: d.current_lng,
        is_on_trip: d.is_on_trip === 1,
        last_update: d.last_location_update,
        bus: d.bus_id ? {
          id: d.bus_id,
          bus_number: d.bus_number,
          number_plate: d.number_plate,
          bus_type: d.bus_type
        } : null,
        route: d.route_name ? {
          route_name: d.route_name,
          origin: d.origin,
          destination: d.destination
        } : null,
        depot_name: d.depot_name
      }))
    });
  } catch (error) {
    console.error('Get active drivers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active drivers'
    });
  }
});

// Haversine formula for distance calculation
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

module.exports = router;
