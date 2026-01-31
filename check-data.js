const mysql = require('mysql2/promise');

async function checkData() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'ksrtc_smart_transport'
    });

    // Check routes
    const [routes] = await connection.execute('SELECT COUNT(*) as count FROM routes');
    console.log(`📊 Routes: ${routes[0].count}`);

    // Check buses  
    const [buses] = await connection.execute('SELECT COUNT(*) as count FROM buses');
    console.log(`📊 Buses: ${buses[0].count}`);

    // Check schedules
    const [schedules] = await connection.execute('SELECT COUNT(*) as count FROM schedules');
    console.log(`📊 Schedules: ${schedules[0].count}`);

    // Check sample departure times from buses table
    const [sampleTimes] = await connection.execute(
      'SELECT departure_time, COUNT(*) as count FROM buses WHERE departure_time IS NOT NULL GROUP BY departure_time ORDER BY departure_time LIMIT 10'
    );
    console.log('\n⏰ Sample departure times from buses table:');
    sampleTimes.forEach(row => {
      console.log(`  ${row.departure_time}: ${row.count} buses`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

checkData();
