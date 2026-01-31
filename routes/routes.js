const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const db = require('../config/database');

// Search routes by origin and destination
router.get('/search', auth, async (req, res) => {
  try {
    console.log('🔍 Search endpoint called with query:', req.query);
    const { origin, destination } = req.query;
    if (!origin || !destination) {
      console.log('❌ Missing origin or destination');
      return res.status(400).json({ success: false, error: 'origin and destination required' });
    }

    const originL = origin.toLowerCase().trim();
    const destinationL = destination.toLowerCase().trim();
    console.log(`🔍 Searching for routes: ${originL} -> ${destinationL}`);

    // Find all routes with their stops
    const [allRoutes] = await db.query(`
      SELECT r.id, r.route_id, r.route_name, r.origin, r.destination, r.distance, r.estimated_duration, r.is_active, 
             GROUP_CONCAT(CONCAT(rs.id,'|',rs.stop_name,'|',rs.latitude,'|',rs.longitude,'|',rs.stop_order,'|',COALESCE(rs.estimated_minutes_from_origin,0))
        ORDER BY rs.stop_order SEPARATOR '::') as stops_data
      FROM routes r
      LEFT JOIN route_stops rs ON r.route_id = rs.route_id
      GROUP BY r.id
    `);

    // Filter and process routes for direct matches
    const directRoutes = [];
    for (const route of allRoutes) {
      const stopsData = route.stops_data ? route.stops_data.split('::').map(s => {
        const [id, name, lat, lng, order, minutes] = s.split('|');
        return { id: parseInt(id), stopName: name, latitude: parseFloat(lat), longitude: parseFloat(lng), stopOrder: parseInt(order), estimatedMinutesFromOrigin: parseInt(minutes) };
      }) : [];

      console.log(`\n  [${route.route_id}] Checking route: ${route.origin} -> ${route.destination}, stops: ${stopsData.length}`);

      // Check if route has origin and destination in correct order
      let originIdx = -1, destIdx = -1;
      
      const routeOriginWords = route.origin.toLowerCase().split(/\s+/);
      const routeDestWords = route.destination.toLowerCase().split(/\s+/);
      const originWords = originL.split(/\s+/);
      const destWords = destinationL.split(/\s+/);
      
      // Check route origin
      const matchesRouteOrigin = originWords.some(word => 
        routeOriginWords.some(rword => rword.includes(word) || word.includes(rword))
      );
      if (matchesRouteOrigin) {
        originIdx = 0;
        console.log(`    ✓ Route origin "${route.origin}" matches "${originL}"`);
      }
      
      // Check route destination
      const matchesRouteDest = destWords.some(word => 
        routeDestWords.some(rword => rword.includes(word) || word.includes(rword))
      );
      if (matchesRouteDest) {
        destIdx = stopsData.length + 1;
        console.log(`    ✓ Route destination "${route.destination}" matches "${destinationL}"`);
      }
      
      // Check stops - look for ANY match in words
      for (let i = 0; i < stopsData.length; i++) {
        const stopWords = stopsData[i].stopName.toLowerCase().split(/\s+/);
        const originWords = originL.split(/\s+/);
        const destWords = destinationL.split(/\s+/);
        
        // Check if stop name contains origin search terms
        if (originIdx === -1) {
          const matchesOrigin = originWords.some(word => 
            stopWords.some(stopWord => stopWord.includes(word) || word.includes(stopWord))
          );
          if (matchesOrigin) {
            originIdx = i + 1;
            console.log(`    ✓ Stop[${i}] "${stopsData[i].stopName}" matches origin "${originL}"`);
          }
        }
        
        // Check if stop name contains destination search terms
        const matchesDest = destWords.some(word => 
          stopWords.some(stopWord => stopWord.includes(word) || word.includes(stopWord))
        );
        if (matchesDest && destIdx === -1) {
          destIdx = i + 1;
          console.log(`    ✓ Stop[${i}] "${stopsData[i].stopName}" matches dest "${destinationL}"`);
        }
      }

      console.log(`    Result: originIdx=${originIdx}, destIdx=${destIdx}`);

      if (originIdx >= 0 && destIdx > originIdx) {
        // Get bus data for this route to get crowd level
        const [busList] = await db.query(
          'SELECT crowd_level FROM buses WHERE route_id = ? LIMIT 1',
          [route.id]
        );
        const crowdLevel = busList.length > 0 ? busList[0].crowd_level : 'MEDIUM';

        directRoutes.push({
          routeDbId: route.id,
          routeId: route.route_id,
          routeName: route.route_name,
          origin: route.origin,
          destination: route.destination,
          distance: parseFloat(route.distance),
          estimatedDuration: parseInt(route.estimated_duration),
          stops: stopsData,
          isActive: route.is_active === 1,
          crowdLevel: crowdLevel
        });
        console.log(`    ✓ Added direct route: ${route.route_id} (crowd: ${crowdLevel})`);
      }
    }

    // Find connecting routes (if no direct)
    let connectingRoutes = [];
    if (directRoutes.length === 0) {
      const firstLegs = allRoutes.filter(r => {
        const stopsData = r.stops_data ? r.stops_data.split('::').map(s => {
          const [, name] = s.split('|');
          return name;
        }) : [];
        return r.origin.toLowerCase().includes(originL) || stopsData.some(s => s.toLowerCase().includes(originL));
      });

      for (const firstRoute of firstLegs) {
        for (const secondRoute of allRoutes) {
          if (firstRoute.route_id === secondRoute.route_id) continue;

          const stopsData2 = secondRoute.stops_data ? secondRoute.stops_data.split('::').map(s => {
            const [, name] = s.split('|');
            return name;
          }) : [];

          if (secondRoute.destination.toLowerCase().includes(destinationL) || stopsData2.some(s => s.toLowerCase().includes(destinationL))) {
            // Find transfer point
            const firstStops = firstRoute.stops_data ? firstRoute.stops_data.split('::').map(s => s.split('|')[1]) : [];
            let transferPoint = null;
            
            if (firstRoute.destination.toLowerCase() === secondRoute.origin.toLowerCase()) {
              transferPoint = firstRoute.destination;
            } else {
              for (const stop of [...firstStops, firstRoute.destination]) {
                if ([...stopsData2, secondRoute.origin].some(s => s && s.toLowerCase() === stop.toLowerCase())) {
                  transferPoint = stop;
                  break;
                }
              }
            }

            if (transferPoint) {
              connectingRoutes.push({
                firstLeg: {
                  routeDbId: firstRoute.id,
                  routeId: firstRoute.route_id,
                  routeName: firstRoute.route_name,
                  origin: firstRoute.origin,
                  destination: firstRoute.destination,
                  distance: parseFloat(firstRoute.distance),
                  estimatedDuration: parseInt(firstRoute.estimated_duration),
                  stops: firstRoute.stops_data ? firstRoute.stops_data.split('::').map(s => {
                    const [id, name, lat, lng, order, minutes] = s.split('|');
                    return { id: parseInt(id), stopName: name, latitude: parseFloat(lat), longitude: parseFloat(lng), stopOrder: parseInt(order), estimatedMinutesFromOrigin: parseInt(minutes) };
                  }) : [],
                  isActive: firstRoute.is_active === 1
                },
                secondLeg: {
                  routeDbId: secondRoute.id,
                  routeId: secondRoute.route_id,
                  routeName: secondRoute.route_name,
                  origin: secondRoute.origin,
                  destination: secondRoute.destination,
                  distance: parseFloat(secondRoute.distance),
                  estimatedDuration: parseInt(secondRoute.estimated_duration),
                  stops: secondRoute.stops_data ? secondRoute.stops_data.split('::').map(s => {
                    const [id, name, lat, lng, order, minutes] = s.split('|');
                    return { id: parseInt(id), stopName: name, latitude: parseFloat(lat), longitude: parseFloat(lng), stopOrder: parseInt(order), estimatedMinutesFromOrigin: parseInt(minutes) };
                  }) : [],
                  isActive: secondRoute.is_active === 1
                },
                transferPoint: transferPoint
              });
              if (connectingRoutes.length >= 3) break;
            }
          }
        }
        if (connectingRoutes.length >= 3) break;
      }
    }

    res.json({
      success: true,
      data: {
        directRoutes: directRoutes.slice(0, 5),
        connectingRoutes: connectingRoutes.slice(0, 3)
      }
    });
    console.log(`✓ Search result: ${directRoutes.length} direct, ${connectingRoutes.length} connecting`);
  } catch (error) {
    console.error('Search routes error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to search routes' });
  }
});

// Get all routes
router.get('/', auth, async (req, res) => {
  try {
    const [routes] = await db.query('SELECT * FROM routes');
    res.json({ success: true, data: routes });
  } catch (error) {
    console.error('Get routes error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch routes' });
  }
});

// Get route by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const [routes] = await db.query('SELECT * FROM routes WHERE id = ?', [req.params.id]);
    if (routes.length === 0) {
      return res.status(404).json({ success: false, error: 'Route not found' });
    }
    res.json({ success: true, data: routes[0] });
  } catch (error) {
    console.error('Get route error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch route' });
  }
});

// Get route stops
router.get('/:id/stops', auth, async (req, res) => {
  try {
    const [stops] = await db.query(
      'SELECT * FROM route_stops WHERE route_id = ? ORDER BY stop_order',
      [req.params.id]
    );
    res.json({ success: true, data: stops });
  } catch (error) {
    console.error('Get route stops error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stops' });
  }
});

// Get nearby stops
router.get('/nearby/:lat/:lng', auth, async (req, res) => {
  try {
    const { lat, lng } = req.params;
    const radius = req.query.radius || 5; // km

    // Using Haversine formula to find nearby stops
    const [stops] = await db.query(`
      SELECT DISTINCT rs.*, r.route_name,
        (6371 * acos(cos(radians(?)) * cos(radians(rs.latitude)) * 
        cos(radians(rs.longitude) - radians(?)) + 
        sin(radians(?)) * sin(radians(rs.latitude)))) AS distance
      FROM route_stops rs
      JOIN routes r ON rs.route_id = r.route_id
      HAVING distance < ?
      ORDER BY distance
      LIMIT 20
    `, [lat, lng, lat, radius]);

    res.json({ success: true, data: stops });
  } catch (error) {
    console.error('Get nearby stops error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch nearby stops' });
  }
});

// Get nearby depots based on user location
router.get('/nearby/depots/:lat/:lng', auth, async (req, res) => {
  try {
    const { lat, lng } = req.params;
    const radius = req.query.radius || 10; // km

    // Using Haversine formula to find nearby depots
    const [depots] = await db.query(`
      SELECT d.*,
        (6371 * acos(cos(radians(?)) * cos(radians(d.latitude)) * 
        cos(radians(d.longitude) - radians(?)) + 
        sin(radians(?)) * sin(radians(d.latitude)))) AS distance
      FROM depots d
      WHERE d.is_active = 1
      HAVING distance < ?
      ORDER BY distance
      LIMIT 10
    `, [lat, lng, lat, radius]);

    res.json({ success: true, data: depots });
  } catch (error) {
    console.error('Get nearby depots error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch nearby depots' });
  }
});

module.exports = router;
