const mysql = require('mysql2/promise');

async function listDepots() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'ksrtc_smart_transport'
    });

    // Check all depots
    const [depots] = await connection.execute('SELECT id, depot_name, location FROM depots ORDER BY location');
    console.log('\n🏢 All depots in database:\n');
    
    depots.forEach(depot => {
      console.log(`  ID: ${depot.id} - ${depot.depot_name} (${depot.location})`);
    });
    
    console.log(`\n📊 Total: ${depots.length} depots`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

listDepots();
