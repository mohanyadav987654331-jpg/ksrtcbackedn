const db = require('./config/database');

async function fixScheduleDepotIds() {
  try {
    console.log('Fixing schedule depot_ids...');
    
    // Update schedules to match the depot_id from their buses
    const [result1] = await db.query(`
      UPDATE schedules s
      JOIN buses b ON s.bus_id = b.id
      SET s.depot_id = b.depot_id
      WHERE b.depot_id IS NOT NULL
    `);
    console.log(`✅ Updated ${result1.affectedRows} schedules with depot_id from buses`);
    
    // For schedules without buses, try to infer from routes
    // Bangalore routes (origin or destination contains Bangalore) -> depot 30
    const [result2] = await db.query(`
      UPDATE schedules s
      JOIN routes r ON s.route_id = r.id
      SET s.depot_id = 30
      WHERE s.depot_id IS NULL 
      AND (r.origin LIKE '%Bangalore%' OR r.destination LIKE '%Bangalore%')
    `);
    console.log(`✅ Updated ${result2.affectedRows} Bangalore schedules with depot_id 30`);
    
    // Mysore routes -> depot 33
    const [result3] = await db.query(`
      UPDATE schedules s
      JOIN routes r ON s.route_id = r.id
      SET s.depot_id = 33
      WHERE s.depot_id IS NULL
      AND (r.origin LIKE '%Mysore%' OR r.destination LIKE '%Mysore%')
    `);
    console.log(`✅ Updated ${result3.affectedRows} Mysore schedules with depot_id 33`);
    
    // Check final stats
    const [stats] = await db.query(`
      SELECT depot_id, COUNT(*) as count
      FROM schedules
      GROUP BY depot_id
      ORDER BY depot_id
    `);
    console.log('\nFinal schedule distribution:');
    console.table(stats);
    
    process.exit(0);
  } catch (error) {
    console.error('Error fixing depot IDs:', error);
    process.exit(1);
  }
}

fixScheduleDepotIds();
