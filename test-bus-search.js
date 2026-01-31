const db = require('./config/database');

async function testBusSearch() {
  try {
    console.log('🔍 Testing bus search...\n');
    
    // Test 1: Check available routes
    const [routes] = await db.query('SELECT DISTINCT origin, destination FROM routes LIMIT 10');
    console.log('📍 Available routes in database:');
    routes.forEach(r => console.log(`  ${r.origin} → ${r.destination}`));
    
    // Test 2: Search Bangalore to Mysore
    const origin = 'Bangalore';
    const destination = 'Mysore';
    
    console.log(`\n🚌 Searching buses: ${origin} → ${destination}`);
    
    const query = `
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
        r.destination
      FROM schedules s
      JOIN routes r ON s.route_id = r.id
      JOIN buses b ON s.bus_id = b.id
      WHERE r.origin = ? 
        AND r.destination = ?
        AND s.is_active = TRUE
        AND b.is_active = TRUE
      LIMIT 5
    `;
    
    const [buses] = await db.query(query, [origin, destination]);
    console.log(`\n✅ Found ${buses.length} buses`);
    
    if (buses.length > 0) {
      console.log('\n📊 Sample buses:');
      buses.forEach((bus, i) => {
        console.log(`${i + 1}. Bus ${bus.bus_number} (${bus.bus_type}) - Departs: ${bus.departure_time}`);
      });
    } else {
      console.log('❌ No buses found. Checking why...');
      
      // Debug: Check if route exists
      const [routeCheck] = await db.query(
        'SELECT * FROM routes WHERE origin = ? AND destination = ?',
        [origin, destination]
      );
      console.log(`\n  Routes for ${origin} → ${destination}: ${routeCheck.length}`);
      
      if (routeCheck.length > 0) {
        console.log('  ✓ Route exists');
        
        // Check schedules
        const [schedCheck] = await db.query(
          'SELECT COUNT(*) as count FROM schedules WHERE route_id = ?',
          [routeCheck[0].id]
        );
        console.log(`  Schedules for this route: ${schedCheck[0].count}`);
      } else {
        console.log('  ✗ Route does not exist');
        console.log('\n  💡 Try one of the available routes listed above');
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test error:', error);
    process.exit(1);
  }
}

testBusSearch();
