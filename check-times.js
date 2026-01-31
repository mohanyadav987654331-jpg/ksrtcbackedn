const mysql = require('mysql2/promise');

async function checkTimes() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'ksrtc_smart_transport'
    });

    console.log('⏰ Checking bus departure times...\n');

    // Get earliest and latest departure times
    const [stats] = await connection.execute(`
      SELECT 
        MIN(departure_time) as earliest,
        MAX(departure_time) as latest,
        COUNT(*) as total
      FROM schedules
    `);

    console.log('📊 Schedule Statistics:');
    console.log(`  Total schedules: ${stats[0].total}`);
    console.log(`  Earliest departure: ${stats[0].earliest}`);
    console.log(`  Latest departure: ${stats[0].latest}`);

    // Count buses starting at different hours
    const [hourCounts] = await connection.execute(`
      SELECT 
        HOUR(departure_time) as hour,
        COUNT(*) as count
      FROM schedules
      GROUP BY HOUR(departure_time)
      ORDER BY hour
    `);

    console.log('\n⏰ Buses by hour:');
    hourCounts.forEach(row => {
      console.log(`  ${String(row.hour).padStart(2, '0')}:00 - ${row.count} buses`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

checkTimes();
