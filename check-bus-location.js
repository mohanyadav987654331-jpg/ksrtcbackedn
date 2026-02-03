const pool = require('./config/database');

async function checkBusLocation() {
  try {
    const [buses] = await pool.query(`
      SELECT id, bus_number, number_plate, current_lat, current_lng, status 
      FROM buses 
      WHERE bus_number LIKE '%5000%' 
      LIMIT 5
    `);
    
    console.log('Bus KA-5000 data:');
    console.log(JSON.stringify(buses, null, 2));
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkBusLocation();
