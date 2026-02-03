const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'ksrtc_smart_transport'
};

// Location data for different cities
const locationData = {
  'Bangalore': { lat: 12.9716, lng: 77.5946 },
  'Mysore': { lat: 12.2958, lng: 76.6394 },
  'Mangalore': { lat: 12.9141, lng: 74.8560 },
  'Hubli': { lat: 15.3647, lng: 75.1240 },
  'Belgaum': { lat: 15.8497, lng: 74.4977 },
  'Tumkur': { lat: 13.3392, lng: 77.1006 },
  'Hassan': { lat: 13.0072, lng: 76.1004 },
  'Shimoga': { lat: 13.9299, lng: 75.5681 },
  'Dharwad': { lat: 15.4589, lng: 75.0078 },
  'Gulbarga': { lat: 17.3297, lng: 76.8343 },
  'Bijapur': { lat: 16.8302, lng: 75.7100 },
  'Davangere': { lat: 14.4644, lng: 75.9218 },
  'Bellary': { lat: 15.1394, lng: 76.9214 },
  'Raichur': { lat: 16.2120, lng: 77.3439 },
  'Chikmagalur': { lat: 13.3161, lng: 75.7720 },
  'Udupi': { lat: 13.3409, lng: 74.7421 },
  'Hospet': { lat: 15.2695, lng: 76.3871 },
  'Karwar': { lat: 14.8137, lng: 74.1290 },
  'Mandya': { lat: 12.5244, lng: 76.8958 },
  'Kolar': { lat: 13.1358, lng: 78.1297 }
};

async function updateBusLocations() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database\n');

    // Get all buses with their depot locations
    const [buses] = await connection.query(`
      SELECT b.id, b.bus_number, d.location 
      FROM buses b 
      LEFT JOIN depots d ON b.depot_id = d.id
    `);

    console.log(`Found ${buses.length} buses\n`);

    let updated = 0;
    for (const bus of buses) {
      const location = bus.location || 'Bangalore'; // Default to Bangalore
      const coords = locationData[location] || locationData['Bangalore'];

      // Add some randomization to make each bus in the same city slightly different
      const latVariation = (Math.random() - 0.5) * 0.05;
      const lngVariation = (Math.random() - 0.5) * 0.05;
      const randomLat = coords.lat + latVariation;
      const randomLng = coords.lng + lngVariation;

      await connection.query(
        'UPDATE buses SET current_lat = ?, current_lng = ? WHERE id = ?',
        [randomLat, randomLng, bus.id]
      );

      updated++;
      if (updated % 10 === 0) {
        process.stdout.write(`✓ Updated ${updated}/${buses.length} buses\r`);
      }
    }

    console.log(`\n✅ Successfully updated ${updated} buses with locations!\n`);
    console.log('Sample updated buses:');
    
    const [updatedBuses] = await connection.query(`
      SELECT bus_number, current_lat, current_lng FROM buses LIMIT 5
    `);
    
    updatedBuses.forEach(bus => {
      console.log(`  📍 ${bus.bus_number}: (${bus.current_lat.toFixed(4)}, ${bus.current_lng.toFixed(4)})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) await connection.end();
    process.exit(0);
  }
}

updateBusLocations();
