const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const db = require('../config/database');

// ============================================
// TRACK BUS BY NUMBER PLATE - REAL WORLD
// ============================================

router.get('/buses/track', auth, async (req, res) => {
  const { number_plate } = req.query;

  if (!number_plate) {
    return res.status(400).json({
      success: false,
      error: 'Number plate required'
    });
  }

  try {
    const [trip] = await db.query(`
      SELECT 
        at.id,
        b.id as bus_id,
        b.bus_number,
        b.number_plate,
        b.current_lat,
        b.current_lng,
        b.speedKmph as current_speed,
        at.crowd_level,
        at.delay_minutes,
        at.status,
        at.schedule_id,
        s.departure_time,
        s.arrival_time,
        s.route_id,
        r.origin,
        r.destination,
        r.distance,
        u.full_name as driver_name,
        u.phone as driver_phone,
        u.id as driver_id
      FROM active_trips at
      INNER JOIN buses b ON at.bus_id = b.id
      INNER JOIN schedules s ON at.schedule_id = s.id
      INNER JOIN routes r ON s.route_id = r.id
      INNER JOIN users u ON at.driver_id = u.id
      WHERE UPPER(b.number_plate) = UPPER(?)
        AND at.status = 'STARTED'
      LIMIT 1
    `, [number_plate]);

    if (trip.length === 0) {
      return res.json({
        success: true,
        trip: {
          is_active: false
        }
      });
    }

    const tripData = trip[0];

    // Get route stops
    const [stops] = await db.query(`
      SELECT 
        id,
        route_id,
        stop_name,
        stop_order,
        latitude as lat,
        longitude as lng,
        estimated_minutes_from_origin
      FROM route_stops
      WHERE route_id = ?
      ORDER BY stop_order ASC
    `, [tripData.route_id]);

    // Get origin and destination coordinates from route_stops
    const [originStop] = await db.query(`
      SELECT latitude, longitude FROM route_stops
      WHERE route_id = ? AND stop_order = 1
      LIMIT 1
    `, [tripData.route_id]);

    const [destStop] = await db.query(`
      SELECT latitude, longitude FROM route_stops
      WHERE route_id = ? AND stop_order = (
        SELECT MAX(stop_order) FROM route_stops WHERE route_id = ?
      )
      LIMIT 1
    `, [tripData.route_id, tripData.route_id]);

    res.json({
      success: true,
      trip: {
        id: tripData.id,
        bus_number: tripData.bus_number,
        bus_id: tripData.bus_id,
        number_plate: tripData.number_plate,
        driver_name: tripData.driver_name,
        driver_phone: tripData.driver_phone,
        driver_id: tripData.driver_id,
        current_lat: parseFloat(tripData.current_lat),
        current_lng: parseFloat(tripData.current_lng),
        current_speed: tripData.current_speed,
        crowd_level: tripData.crowd_level,
        delay_minutes: tripData.delay_minutes,
        is_active: true,
        origin: tripData.origin,
        destination: tripData.destination,
        origin_lat: originStop.length > 0 ? parseFloat(originStop[0].latitude) : null,
        origin_lng: originStop.length > 0 ? parseFloat(originStop[0].longitude) : null,
        destination_lat: destStop.length > 0 ? parseFloat(destStop[0].latitude) : null,
        destination_lng: destStop.length > 0 ? parseFloat(destStop[0].longitude) : null,
        distance: tripData.distance,
        departure_time: tripData.departure_time,
        arrival_time: tripData.arrival_time,
        route_stops: stops.map(s => ({
          id: s.id,
          stop_name: s.stop_name,
          order: s.stop_order,
          lat: parseFloat(s.lat),
          lng: parseFloat(s.lng),
          minutes_from_origin: s.estimated_minutes_from_origin
        }))
      }
    });
  } catch (error) {
    console.error('Track bus error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// NEARBY BUS STOPS
// ============================================

router.get('/nearby/stops', auth, async (req, res) => {
  const { lat, lng, radius } = req.query;

  if (!lat || !lng || !radius) {
    return res.status(400).json({
      success: false,
      error: 'lat, lng, radius required'
    });
  }

  try {
    const [stops] = await db.query(`
      SELECT 
        id,
        stop_name,
        latitude,
        longitude,
        address,
        city,
        is_active,
        (
          6371 * ACOS(
            COS(RADIANS(?)) * 
            COS(RADIANS(latitude)) * 
            COS(RADIANS(longitude) - RADIANS(?)) + 
            SIN(RADIANS(?)) * 
            SIN(RADIANS(latitude))
          )
        ) as distance
      FROM bus_stops
      WHERE is_active = 1
        AND (
          6371 * ACOS(
            COS(RADIANS(?)) * 
            COS(RADIANS(latitude)) * 
            COS(RADIANS(longitude) - RADIANS(?)) + 
            SIN(RADIANS(?)) * 
            SIN(RADIANS(latitude))
          )
        ) <= ?
      ORDER BY distance ASC
      LIMIT 20
    `, [lat, lng, lat, lat, lng, lat, radius]);

    const formattedStops = stops.map(s => ({
      id: s.id,
      stop_name: s.stop_name,
      latitude: parseFloat(s.latitude),
      longitude: parseFloat(s.longitude),
      address: s.address,
      city: s.city,
      distance: parseFloat(s.distance)
    }));

    res.json({
      success: true,
      data: formattedStops
    });
  } catch (error) {
    console.error('Nearby stops error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// NEARBY DEPOTS
// ============================================

router.get('/nearby/depots', auth, async (req, res) => {
  const { lat, lng, radius } = req.query;

  if (!lat || !lng || !radius) {
    return res.status(400).json({
      success: false,
      error: 'lat, lng, radius required'
    });
  }

  try {
    const [depots] = await db.query(`
      SELECT 
        id,
        depot_name,
        latitude,
        longitude,
        address,
        city,
        phone,
        (
          6371 * ACOS(
            COS(RADIANS(?)) * 
            COS(RADIANS(latitude)) * 
            COS(RADIANS(longitude) - RADIANS(?)) + 
            SIN(RADIANS(?)) * 
            SIN(RADIANS(latitude))
          )
        ) as distance
      FROM depots
      WHERE (
        6371 * ACOS(
          COS(RADIANS(?)) * 
          COS(RADIANS(latitude)) * 
          COS(RADIANS(longitude) - RADIANS(?)) + 
          SIN(RADIANS(?)) * 
          SIN(RADIANS(latitude))
        )
      ) <= ?
      ORDER BY distance ASC
      LIMIT 20
    `, [lat, lng, lat, lat, lng, lat, radius]);

    const formattedDepots = depots.map(d => ({
      id: d.id,
      depot_name: d.depot_name,
      latitude: parseFloat(d.latitude),
      longitude: parseFloat(d.longitude),
      address: d.address,
      city: d.city,
      phone: d.phone,
      distance: parseFloat(d.distance)
    }));

    res.json({
      success: true,
      data: formattedDepots
    });
  } catch (error) {
    console.error('Nearby depots error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// GET ALL ACTIVE BUSES (FOR USER TRACKING)
// ============================================

router.get('/buses/active', auth, async (req, res) => {
  const { city } = req.query;

  try {
    let query = `
      SELECT 
        at.id,
        b.id as bus_id,
        b.bus_number,
        b.number_plate,
        b.current_lat,
        b.current_lng,
        b.speedKmph as current_speed,
        at.crowd_level,
        at.delay_minutes,
        r.origin,
        r.destination,
        u.full_name as driver_name,
        d.depot_name
      FROM active_trips at
      INNER JOIN buses b ON at.bus_id = b.id
      INNER JOIN schedules s ON at.schedule_id = s.id
      INNER JOIN routes r ON s.route_id = r.id
      INNER JOIN users u ON at.driver_id = u.id
      INNER JOIN depots d ON b.depot_id = d.id
      WHERE at.status = 'STARTED'
    `;

    const params = [];

    if (city) {
      query += ` AND d.city = ?`;
      params.push(city);
    }

    query += ` ORDER BY at.updated_at DESC LIMIT 50`;

    const [buses] = await db.query(query, params);

    const formatted = buses.map(b => ({
      id: b.id,
      bus_number: b.bus_number,
      number_plate: b.number_plate,
      current_lat: parseFloat(b.current_lat),
      current_lng: parseFloat(b.current_lng),
      current_speed: b.current_speed,
      crowd_level: b.crowd_level,
      delay_minutes: b.delay_minutes,
      origin: b.origin,
      destination: b.destination,
      driver_name: b.driver_name,
      depot_name: b.depot_name
    }));

    res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    console.error('Get active buses error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// GET ROUTE DETAILS WITH STOPS
// ============================================

router.get('/routes/:routeId/details', auth, async (req, res) => {
  const { routeId } = req.params;

  try {
    const [route] = await db.query(
      'SELECT * FROM routes WHERE id = ?',
      [routeId]
    );

    if (route.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Route not found'
      });
    }

    const [stops] = await db.query(
      `SELECT * FROM route_stops WHERE route_id = ? ORDER BY stop_order ASC`,
      [routeId]
    );

    res.json({
      success: true,
      route: route[0],
      stops: stops.map(s => ({
        id: s.id,
        stop_name: s.stop_name,
        order: s.stop_order,
        lat: parseFloat(s.latitude),
        lng: parseFloat(s.longitude),
        minutes_from_origin: s.estimated_minutes_from_origin
      }))
    });
  } catch (error) {
    console.error('Get route details error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all driver locations (those who have opened/shared their location)
router.get('/drivers/locations', auth, async (req, res) => {
  try {
    const [drivers] = await db.query(`
      SELECT u.id, u.full_name, u.phone, u.depot_id, u.is_active,
             s.id as schedule_id, s.bus_id, s.driver_id,
             b.bus_number, b.bus_type,
             r.id as route_id, r.origin, r.destination,
             da.status as assignment_status,
             -- For now, use a default location; in production, use actual GPS data
             COALESCE(da.latitude, r.origin) as current_location,
             COALESCE(da.longitude, '') as longitude
      FROM users u
      LEFT JOIN schedules s ON u.id = s.driver_id AND s.is_active = 1
      LEFT JOIN buses b ON s.bus_id = b.id
      LEFT JOIN routes r ON s.route_id = r.id
      LEFT JOIN driver_assignments da ON s.id = da.schedule_id
      WHERE u.role = 'driver' AND u.is_active = 1
      ORDER BY u.full_name
    `);

    res.json({ success: true, data: drivers });
  } catch (error) {
    console.error('Get driver locations error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch driver locations' });
  }
});

// Get live bus locations for a route (mock data for now)
// In production, this would connect to GPS tracking system
router.get('/tracking/:routeId', auth, async (req, res) => {
  try {
    const { routeId } = req.params;
    const assignedDate = req.query.assigned_date || req.query.date || new Date().toISOString().slice(0, 10);

    // Get route details with stops
    const [routes] = await db.query(
      `SELECT r.id, r.route_id, r.origin, r.destination, r.distance, r.estimated_duration,
              GROUP_CONCAT(CONCAT(rs.latitude,'|',rs.longitude,'|',rs.stop_name,'|',rs.stop_order)
                ORDER BY rs.stop_order SEPARATOR '::') as stops_data
       FROM routes r
       LEFT JOIN route_stops rs ON r.route_id = rs.route_id
       WHERE r.id = ?
       GROUP BY r.id`,
      [routeId]
    );

    if (routes.length === 0) {
      return res.status(404).json({ success: false, error: 'Route not found' });
    }

    const route = routes[0];
    const stopsArray = route.stops_data
      ? route.stops_data.split('::').map(s => {
          const [lat, lng, name, order] = s.split('|');
          return {
            latitude: parseFloat(lat),
            longitude: parseFloat(lng),
            stopName: name,
            stopOrder: parseInt(order),
          };
        })
      : [];

    // Get all active schedules for this route with bus and driver info
    const [schedules] = await db.query(
      `SELECT s.id, s.bus_id, s.driver_id, s.departure_time, s.arrival_time,
              COALESCE(db.id, b.id) as active_bus_id,
              COALESCE(db.bus_number, b.bus_number) as active_bus_number,
              COALESCE(db.bus_type, b.bus_type) as active_bus_type,
              COALESCE(db.capacity, b.capacity) as active_capacity,
              COALESCE(db.crowd_level, b.crowd_level) as active_crowd_level,
              COALESCE(du.full_name, u.full_name) as active_driver_name,
              COALESCE(du.phone, u.phone) as active_driver_phone,
              da.id as assignment_id,
              da.status as assignment_status,
              da.assigned_date
       FROM schedules s
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
       WHERE s.route_id = ? AND s.is_active = 1
       ORDER BY s.departure_time`,
      [assignedDate, routeId]
    );

    // Mock bus locations: distribute buses along the route based on current time and departure time
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const busesWithLocation = schedules.map((schedule, idx) => {
      const [depHour, depMin] = schedule.departure_time.split(':').map(Number);
      const depMinutes = depHour * 60 + depMin;
      const duration = parseInt(route.estimated_duration) || 180; // minutes
      
      // Determine if bus is in transit or not
      let progress = 0; // 0-1 where 1 is destination
      let status = 'Scheduled';
      
      if (currentMinutes >= depMinutes && currentMinutes < depMinutes + duration) {
        // Bus is in transit
        const elapsed = currentMinutes - depMinutes;
        progress = Math.min(elapsed / duration, 0.95);
        status = 'In Transit';
      } else if (currentMinutes >= depMinutes + duration) {
        // Bus has arrived
        progress = 1;
        status = 'Completed';
      }

      // Calculate bus position along route
      let busLat, busLng;
      if (stopsArray.length >= 2) {
        const firstStop = stopsArray[0];
        const lastStop = stopsArray[stopsArray.length - 1];
        busLat = firstStop.latitude + (lastStop.latitude - firstStop.latitude) * progress;
        busLng = firstStop.longitude + (lastStop.longitude - firstStop.longitude) * progress;
      } else {
        // Fallback if no stops
        busLat = 12.9716 + Math.random() * 0.05;
        busLng = 77.5946 + Math.random() * 0.05;
      }

      return {
        scheduleId: schedule.id,
        busId: schedule.active_bus_id,
        assignmentId: schedule.assignment_id,
        assignmentStatus: schedule.assignment_status,
        busNumber: schedule.active_bus_number,
        busType: schedule.active_bus_type,
        driverName: schedule.active_driver_name,
        driverPhone: schedule.active_driver_phone,
        departureTime: schedule.departure_time,
        arrivalTime: schedule.arrival_time,
        latitude: busLat,
        longitude: busLng,
        capacity: schedule.active_capacity,
        crowdLevel: schedule.active_crowd_level,
        status: status,
        progress: Math.round(progress * 100),
      };
    });

    // Get origin and destination coordinates (first and last stop or defaults)
    const originCoords = stopsArray.length > 0
      ? { latitude: stopsArray[0].latitude, longitude: stopsArray[0].longitude, name: route.origin }
      : { latitude: 12.9716, longitude: 77.5946, name: route.origin };

    const destinationCoords = stopsArray.length > 0
      ? { latitude: stopsArray[stopsArray.length - 1].latitude, longitude: stopsArray[stopsArray.length - 1].longitude, name: route.destination }
      : { latitude: 13.0827, longitude: 77.6054, name: route.destination };

    res.json({
      success: true,
      data: {
        route: {
          id: route.id,
          routeId: route.route_id,
          origin: route.origin,
          destination: route.destination,
          distance: route.distance,
          estimatedDuration: route.estimated_duration,
        },
        origin: originCoords,
        destination: destinationCoords,
        stops: stopsArray,
        buses: busesWithLocation,
      },
    });
  } catch (error) {
    console.error('Bus tracking error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch bus tracking data' });
  }
});

module.exports = router;
