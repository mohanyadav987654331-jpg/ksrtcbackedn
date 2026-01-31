const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const db = require('../config/database');

// Get stops for a route
router.get('/:routeId', auth, async (req, res) => {
  try {
    const { routeId } = req.params;

    const [stops] = await db.query(
      `SELECT * FROM route_stops 
       WHERE route_id = ? 
       ORDER BY stop_order ASC`,
      [routeId]
    );

    res.json({
      success: true,
      data: stops,
    });
  } catch (error) {
    console.error('Get route stops error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch route stops' 
    });
  }
});

module.exports = router;
