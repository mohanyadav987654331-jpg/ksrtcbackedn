const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Update bus location (Driver sends GPS coordinates every 5 seconds)
router.post('/update-location', async (req, res) => {
  try {
    const { tripId, busNumber, latitude, longitude, speed, accuracy } = req.body;

    if (!tripId || !busNumber || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const connection = await pool.getConnection();

    // Insert into bus_locations table (keeps history)
    await connection.execute(
      `INSERT INTO bus_locations (trip_id, bus_number, latitude, longitude, speed, accuracy, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [tripId, busNumber, latitude, longitude, speed || 0, accuracy || 0]
    );

    // Update latest location in trips table for quick access
    await connection.execute(
      `UPDATE trips SET current_latitude = ?, current_longitude = ?, last_location_update = NOW()
       WHERE id = ? AND status = 'running'`,
      [latitude, longitude, tripId]
    );

    connection.release();

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: {
        tripId,
        busNumber,
        latitude,
        longitude,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Get live bus location by bus number
router.get('/live-location/:busNumber', async (req, res) => {
  try {
    const { busNumber } = req.params;

    if (!busNumber) {
      return res.status(400).json({ error: 'Bus number is required' });
    }

    const connection = await pool.getConnection();

    // Get latest location from trips table
    const [rows] = await connection.execute(
      `SELECT id as tripId, bus_number, current_latitude as latitude, current_longitude as longitude,
              crowd_level, next_stop, status, last_location_update, driver_name
       FROM trips
       WHERE bus_number = ? AND status = 'running'
       LIMIT 1`,
      [busNumber]
    );

    connection.release();

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Bus not found or not in service' });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Get live location error:', error);
    res.status(500).json({ error: 'Failed to fetch location' });
  }
});

// Update crowd level
router.post('/update-crowd-level', async (req, res) => {
  try {
    const { tripId, crowdLevel } = req.body;

    if (!tripId || !crowdLevel) {
      return res.status(400).json({ error: 'Trip ID and crowd level are required' });
    }

    const validLevels = ['Low', 'Medium', 'High'];
    if (!validLevels.includes(crowdLevel)) {
      return res.status(400).json({ error: 'Invalid crowd level' });
    }

    const connection = await pool.getConnection();

    await connection.execute(
      `UPDATE trips SET crowd_level = ?, updated_at = NOW() WHERE id = ?`,
      [crowdLevel, tripId]
    );

    connection.release();

    res.json({
      success: true,
      message: 'Crowd level updated successfully',
      data: { tripId, crowdLevel }
    });
  } catch (error) {
    console.error('Update crowd level error:', error);
    res.status(500).json({ error: 'Failed to update crowd level' });
  }
});

// Update next stop
router.post('/update-next-stop', async (req, res) => {
  try {
    const { tripId, nextStop } = req.body;

    if (!tripId || !nextStop) {
      return res.status(400).json({ error: 'Trip ID and next stop are required' });
    }

    const connection = await pool.getConnection();

    await connection.execute(
      `UPDATE trips SET next_stop = ?, updated_at = NOW() WHERE id = ?`,
      [nextStop, tripId]
    );

    connection.release();

    res.json({
      success: true,
      message: 'Next stop updated successfully',
      data: { tripId, nextStop }
    });
  } catch (error) {
    console.error('Update next stop error:', error);
    res.status(500).json({ error: 'Failed to update next stop' });
  }
});

// Start trip
router.post('/start-trip', async (req, res) => {
  try {
    const { tripId } = req.body;

    if (!tripId) {
      return res.status(400).json({ error: 'Trip ID is required' });
    }

    const connection = await pool.getConnection();

    await connection.execute(
      `UPDATE trips SET status = 'running', started_at = NOW(), updated_at = NOW() WHERE id = ?`,
      [tripId]
    );

    connection.release();

    res.json({
      success: true,
      message: 'Trip started successfully',
      data: { tripId, status: 'running' }
    });
  } catch (error) {
    console.error('Start trip error:', error);
    res.status(500).json({ error: 'Failed to start trip' });
  }
});

// End trip
router.post('/end-trip', async (req, res) => {
  try {
    const { tripId } = req.body;

    if (!tripId) {
      return res.status(400).json({ error: 'Trip ID is required' });
    }

    const connection = await pool.getConnection();

    await connection.execute(
      `UPDATE trips SET status = 'completed', ended_at = NOW(), updated_at = NOW() WHERE id = ?`,
      [tripId]
    );

    connection.release();

    res.json({
      success: true,
      message: 'Trip ended successfully',
      data: { tripId, status: 'completed' }
    });
  } catch (error) {
    console.error('End trip error:', error);
    res.status(500).json({ error: 'Failed to end trip' });
  }
});

// Get location history for a trip
router.get('/location-history/:tripId', async (req, res) => {
  try {
    const { tripId } = req.params;

    if (!tripId) {
      return res.status(400).json({ error: 'Trip ID is required' });
    }

    const connection = await pool.getConnection();

    const [rows] = await connection.execute(
      `SELECT id, trip_id, bus_number, latitude, longitude, speed, accuracy, timestamp
       FROM bus_locations
       WHERE trip_id = ?
       ORDER BY timestamp DESC
       LIMIT 100`,
      [tripId]
    );

    connection.release();

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Get location history error:', error);
    res.status(500).json({ error: 'Failed to fetch location history' });
  }
});

module.exports = router;
