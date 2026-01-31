const db = require('./config/database');

async function testDateFilter() {
  try {
    console.log('🔍 Testing date filter issue...\n');
    
    // Get sample buses
    const [buses] = await db.query(`
      SELECT 
        b.bus_number,
        b.bus_type,
        s.departure_time,
        s.days_of_week,
        r.origin,
        r.destination
      FROM schedules s
      JOIN buses b ON s.bus_id = b.id
      JOIN routes r ON s.route_id = r.id
      WHERE r.origin = 'Bangalore' AND r.destination = 'Mysore'
      LIMIT 5
    `);
    
    console.log('📊 Sample buses with days_of_week:');
    buses.forEach(bus => {
      console.log(`  ${bus.bus_number} (${bus.bus_type}) - Days: "${bus.days_of_week}"`);
    });
    
    // Test if Tuesday is in the days
    const tuesday = 'Tue';
    console.log(`\n🔍 Checking if "${tuesday}" is in days_of_week:`);
    buses.forEach(bus => {
      const contains = bus.days_of_week.includes(tuesday);
      console.log(`  ${bus.bus_number}: ${contains ? '✅' : '❌'} (${bus.days_of_week})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testDateFilter();
