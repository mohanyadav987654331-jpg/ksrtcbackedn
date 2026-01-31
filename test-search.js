const db = require('./config/database');

async function testSearch() {
  try {
    const [allRoutes] = await db.query(`
      SELECT r.id, r.route_id, r.route_name, r.origin, r.destination, r.distance, r.estimated_duration, r.is_active, 
             GROUP_CONCAT(CONCAT(rs.id,'|',rs.stop_name,'|',rs.latitude,'|',rs.longitude,'|',rs.stop_order,'|',COALESCE(rs.estimated_minutes_from_origin,0))
        ORDER BY rs.stop_order SEPARATOR '::') as stops_data
      FROM routes r
      LEFT JOIN route_stops rs ON r.route_id = rs.route_id
      GROUP BY r.id
    `);

    console.log('All routes fetched:', allRoutes.length);
    
    const originL = 'bangalore';
    const destinationL = 'mysore';

    for (const route of allRoutes) {
      console.log('\n--- Route:', route.route_id, '---');
      console.log('Origin:', route.origin, '| Dest:', route.destination);
      
      const stopsData = route.stops_data ? route.stops_data.split('::').map(s => {
        const [id, name, lat, lng, order, minutes] = s.split('|');
        return { id: parseInt(id), stopName: name, latitude: parseFloat(lat), longitude: parseFloat(lng), stopOrder: parseInt(order), estimatedMinutesFromOrigin: parseInt(minutes) };
      }) : [];
      
      console.log('Stops:', stopsData.length);

      let originIdx = -1, destIdx = -1;
      
      if (route.origin.toLowerCase().includes(originL)) {
        originIdx = 0;
        console.log('✓ Origin matched at index 0');
      }
      if (route.destination.toLowerCase().includes(destinationL)) {
        destIdx = stopsData.length + 1;
        console.log('✓ Destination matched at index', destIdx);
      }
      
      for (let i = 0; i < stopsData.length; i++) {
        if (originIdx === -1 && stopsData[i].stopName.toLowerCase().includes(originL)) {
          originIdx = i + 1;
          console.log('✓ Origin stop matched:', stopsData[i].stopName);
        }
        if (stopsData[i].stopName.toLowerCase().includes(destinationL)) {
          destIdx = i + 1;
          console.log('✓ Destination stop matched:', stopsData[i].stopName);
        }
      }

      console.log('Final: originIdx=', originIdx, 'destIdx=', destIdx);
      if (originIdx >= 0 && destIdx > originIdx) {
        console.log('✓ MATCH - This is a direct route!');
      } else {
        console.log('✗ No match');
      }
    }

    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

testSearch();
