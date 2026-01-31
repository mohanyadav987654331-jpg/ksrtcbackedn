const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'ksrtc_smart_transport'
};

// Sample locations for real-time simulation
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

async function seedBusTracking() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');

    // Clear existing tracking data
    await connection.query('DELETE FROM bus_tracking');
    await connection.query('DELETE FROM schedule_stops_tracking');
    console.log('Cleared existing tracking data');

    // Get all active trips (IN_PROGRESS) for today
    const [activeTrips] = await connection.query(`
      SELECT da.id as assignment_id, da.driver_id, da.bus_id, da.schedule_id,
             s.departure_time, s.arrival_time, s.route_id,
             r.origin, r.destination, b.bus_number,
             u.full_name as driver_name
      FROM driver_assignments da
      JOIN schedules s ON da.schedule_id = s.id
      JOIN routes r ON s.route_id = r.id
      JOIN buses b ON da.bus_id = b.id
      JOIN users u ON da.driver_id = u.id
      WHERE da.assigned_date = CURDATE()
      AND da.status = 'IN_PROGRESS'
    `);

    console.log(`Found ${activeTrips.length} active trips`);

    if (activeTrips.length === 0) {
      console.log('No active trips found. Run seed-driver-assignments.js first.');
      return;
    }

    // Create bus tracking entries for active trips
    const trackingData = [];
    const stopTrackingData = [];

    for (const trip of activeTrips) {
      const origin = locationData[trip.origin] || locationData['Bangalore'];
      const destination = locationData[trip.destination] || locationData['Mysore'];

      // Calculate intermediate position (simulate bus in transit)
      const progress = Math.random() * 0.7 + 0.15; // 15% to 85% progress
      const currentLat = origin.lat + (destination.lat - origin.lat) * progress;
      const currentLng = origin.lng + (destination.lng - origin.lng) * progress;

      const speed = Math.floor(Math.random() * 30) + 40; // 40-70 km/h
      const bearing = Math.floor(Math.random() * 360);

      trackingData.push([
        trip.bus_id,
        trip.driver_id,
        trip.assignment_id,
        currentLat,
        currentLng,
        speed,
        bearing,
        new Date()
      ]);

      // Get stops for this route
      const [stops] = await connection.query(`
        SELECT id, stop_name, stop_sequence, arrival_time
        FROM schedule_stops
        WHERE schedule_id = ?
        ORDER BY stop_sequence
      `, [trip.schedule_id]);

      // Create stop tracking data
      const totalStops = stops.length;
      const currentStopIndex = Math.floor(progress * totalStops);

      stops.forEach((stop, index) => {
        let status = 'PENDING';
        let actualArrival = null;

        if (index < currentStopIndex) {
          status = 'COMPLETED';
          // Simulate past arrival times
          actualArrival = new Date(Date.now() - (currentStopIndex - index) * 10 * 60000);
        } else if (index === currentStopIndex) {
          status = 'IN_PROGRESS';
        }

        stopTrackingData.push([
          trip.assignment_id,
          stop.id,
          status,
          actualArrival
        ]);
      });
    }

    // Insert bus tracking data
    if (trackingData.length > 0) {
      await connection.query(`
        INSERT INTO bus_tracking 
        (bus_id, driver_id, assignment_id, latitude, longitude, speed, bearing, timestamp)
        VALUES ?
      `, [trackingData]);
      console.log(`Inserted ${trackingData.length} bus tracking records`);
    }

    // Insert stop tracking data
    if (stopTrackingData.length > 0) {
      await connection.query(`
        INSERT INTO schedule_stops_tracking 
        (assignment_id, stop_id, status, actual_arrival_time)
        VALUES ?
      `, [stopTrackingData]);
      console.log(`Inserted ${stopTrackingData.length} stop tracking records`);
    }

    // Display real-time status
    console.log('\n=== REAL-TIME BUS TRACKING ===');
    for (const trip of activeTrips) {
      const [tracking] = await connection.query(`
        SELECT latitude, longitude, speed, bearing, timestamp
        FROM bus_tracking
        WHERE assignment_id = ?
      `, [trip.assignment_id]);

      if (tracking.length > 0) {
        const t = tracking[0];
        console.log(`\n${trip.driver_name} - Bus ${trip.bus_number}`);
        console.log(`  Route: ${trip.origin} → ${trip.destination}`);
        console.log(`  Location: ${t.latitude.toFixed(4)}, ${t.longitude.toFixed(4)}`);
        console.log(`  Speed: ${t.speed} km/h, Bearing: ${t.bearing}°`);
        console.log(`  Last Update: ${new Date(t.timestamp).toLocaleTimeString()}`);

        // Show stop progress
        const [stopProgress] = await connection.query(`
          SELECT 
            SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as in_progress,
            SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
            COUNT(*) as total
          FROM schedule_stops_tracking
          WHERE assignment_id = ?
        `, [trip.assignment_id]);

        if (stopProgress.length > 0) {
          const p = stopProgress[0];
          console.log(`  Stops: ${p.completed}/${p.total} completed, ${p.in_progress} in progress`);
        }
      }
    }

    console.log('\n✅ Bus tracking data seeded successfully!');

  } catch (error) {
    console.error('Error seeding bus tracking:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the seeding
seedBusTracking().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
