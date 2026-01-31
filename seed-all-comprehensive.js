const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'ksrtc_smart_transport'
};

// All comprehensive route configurations
const routeConfigs = [
  {
    origin: 'Bangalore', destination: 'Mysore', distance: 145, duration: 180,
    regularInterval: 5, expressInterval: 15,
    regularStops: ['Bangalore', 'Bidadi', 'Ramanagara', 'Channapatna', 'Maddur', 'Mandya', 'Mysore'],
    expressStops: ['Bangalore', 'Mysore']
  },
  {
    origin: 'Mysore', destination: 'Bangalore', distance: 145, duration: 180,
    regularInterval: 7, expressInterval: 15,
    regularStops: ['Mysore', 'Mandya', 'Maddur', 'Channapatna', 'Ramanagara', 'Bidadi', 'Bangalore'],
    expressStops: ['Mysore', 'Bangalore']
  },
  {
    origin: 'Bangalore', destination: 'Kollegal', distance: 120, duration: 160,
    regularInterval: 8, expressInterval: null,
    regularStops: ['Bangalore', 'Banashankari', 'Harohalli', 'Kanakapura', 'Maddur', 'Kollegal'],
    expressStops: null
  },
  {
    origin: 'Kollegal', destination: 'Mysore', distance: 100, duration: 140,
    regularInterval: 5, expressInterval: null,
    regularStops: ['Kollegal', 'Maddur', 'Kanakapura', 'Harohalli', 'Banashankari', 'Bangalore'],
    expressStops: null
  },
  {
    origin: 'Bangalore', destination: 'Hosur', distance: 60, duration: 90,
    regularInterval: 10, expressInterval: 25,
    regularStops: ['Bangalore', 'Shivajinagar', 'Koramangala', 'St Johns', 'Roopena Agrahara', 'Electronic City', 'Attibele', 'Hosur'],
    expressStops: ['Bangalore', 'Roopena Agrahara', 'Hosur']
  },
  {
    origin: 'Hosur', destination: 'Bangalore', distance: 60, duration: 90,
    regularInterval: 10, expressInterval: 25,
    regularStops: ['Hosur', 'Attibele', 'Electronic City', 'Roopena Agrahara', 'St Johns', 'Koramangala', 'Shivajinagar', 'Bangalore'],
    expressStops: ['Hosur', 'Roopena Agrahara', 'Bangalore']
  },
  {
    origin: 'Bangalore', destination: 'Kolar', distance: 100, duration: 140,
    regularInterval: 10, expressInterval: 30,
    regularStops: ['Bangalore', 'Ramamurthy Nagar', 'KR Puram', 'Hoskote', 'Dasarahalli', 'Yelachenahalli', 'Kondarajanahalli', 'Kolar'],
    expressStops: ['Bangalore', 'KR Puram', 'Hoskote', 'Kolar']
  },
  {
    origin: 'Kolar', destination: 'Bangalore', distance: 100, duration: 140,
    regularInterval: 15, expressInterval: 30,
    regularStops: ['Kolar', 'Kondarajanahalli', 'Yelachenahalli', 'Dasarahalli', 'Hoskote', 'KR Puram', 'Ramamurthy Nagar', 'Bangalore'],
    expressStops: ['Kolar', 'Hoskote', 'KR Puram', 'Bangalore']
  },
  {
    origin: 'Kanakapura', destination: 'Harohalli', distance: 30, duration: 45,
    regularInterval: 15, expressInterval: null,
    regularStops: ['Kanakapura', 'Harohalli'],
    expressStops: null
  },
  {
    origin: 'Kanakapura', destination: 'Bangalore', distance: 55, duration: 80,
    regularInterval: 15, expressInterval: null,
    regularStops: ['Kanakapura', 'Harohalli', 'Kaggalipura', 'Silk Institute', 'Talaghattapura', 'JP Nagar', 'Banashankari', 'Bangalore'],
    expressStops: null
  },
  {
    origin: 'Bangalore', destination: 'Kanakapura', distance: 55, duration: 80,
    regularInterval: 15, expressInterval: null,
    regularStops: ['Bangalore', 'Banashankari', 'JP Nagar', 'Talaghattapura', 'Silk Institute', 'Kaggalipura', 'Harohalli', 'Kanakapura'],
    expressStops: null
  },
  {
    origin: 'Mysore', destination: 'Ramanagara', distance: 50, duration: 75,
    regularInterval: 15, expressInterval: null,
    regularStops: ['Mysore', 'Mandya', 'Maddur', 'Channapatna', 'Ramanagara'],
    expressStops: null
  },
  {
    origin: 'Ramanagara', destination: 'Mysore', distance: 50, duration: 75,
    regularInterval: 25, expressInterval: null,
    regularStops: ['Ramanagara', 'Channapatna', 'Maddur', 'Mandya', 'Mysore'],
    expressStops: null
  },
  {
    origin: 'Ramanagara', destination: 'Bidadi', distance: 40, duration: 60,
    regularInterval: 25, expressInterval: null,
    regularStops: ['Ramanagara', 'Bidadi'],
    expressStops: null
  },
  {
    origin: 'Bidadi', destination: 'Ramanagara', distance: 40, duration: 60,
    regularInterval: 25, expressInterval: null,
    regularStops: ['Bidadi', 'Ramanagara'],
    expressStops: null
  },
  {
    origin: 'Bangalore', destination: 'Maddur', distance: 85, duration: 120,
    regularInterval: 15, expressInterval: null,
    regularStops: ['Bangalore', 'Bidadi', 'Ramanagara', 'Channapatna', 'Maddur'],
    expressStops: null
  },
  {
    origin: 'Mysore', destination: 'Srirangapatna', distance: 25, duration: 40,
    regularInterval: 5, expressInterval: null,
    regularStops: ['Mysore', 'Srirangapatna'],
    expressStops: null
  },
  {
    origin: 'Srirangapatna', destination: 'Mysore', distance: 25, duration: 40,
    regularInterval: 15, expressInterval: null,
    regularStops: ['Srirangapatna', 'Mysore'],
    expressStops: null
  },
  {
    origin: 'Bangalore', destination: 'Tumkur', distance: 75, duration: 110,
    regularInterval: null, expressInterval: 15,
    regularStops: null,
    expressStops: ['Bangalore', 'Tumkur'],
    specialDays: ['Tuesday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday']
  },
  {
    origin: 'Tumkur', destination: 'Bangalore', distance: 75, duration: 110,
    regularInterval: null, expressInterval: 20,
    regularStops: null,
    expressStops: ['Tumkur', 'Bangalore'],
    specialDays: ['Tuesday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday']
  }
];

async function seedDatabase() {
  let connection;
  
  try {
    console.log('🚀 Starting comprehensive database seeding...\n');
    connection = await mysql.createConnection(dbConfig);
    
    // Get or create depot
    const [depots] = await connection.execute('SELECT id FROM depots LIMIT 1');
    let depotId;
    if (depots.length === 0) {
      const [result] = await connection.execute(
        'INSERT INTO depots (depot_name, location, latitude, longitude) VALUES (?, ?, ?, ?)',
        ['Main Depot', 'Bangalore', 12.9716, 77.5946]
      );
      depotId = result.insertId;
      console.log('✓ Created new depot:', depotId);
    } else {
      depotId = depots[0].id;
      console.log('✓ Using existing depot:', depotId);
    }
    
    // Create drivers if they don't exist
    console.log('\n📋 Setting up drivers...');
    const [existingDrivers] = await connection.execute('SELECT id FROM users WHERE role = ? LIMIT 1', ['driver']);
    let driverIds = [];
    
    if (existingDrivers.length === 0) {
      const drivers = [
        'Rajesh Kumar', 'Suresh Babu', 'Mahesh Gowda', 'Ramesh Reddy', 'Kumar Swamy',
        'Venkatesh Murthy', 'Prakash Rao', 'Ganesh Hegde', 'Mohan Das', 'Santhosh Kumar',
        'Naveen Gowda', 'Praveen Kumar', 'Ravi Shankar', 'Krishna Murthy', 'Shiva Kumar'
      ];
      
      for (let i = 0; i < drivers.length; i++) {
        const [result] = await connection.execute(
          'INSERT INTO users (username, email, password_hash, full_name, phone, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [`driver${i+1}`, `driver${i+1}@ksrtc.com`, '$2a$10$dummyhash', drivers[i], `98765432${i.toString().padStart(2, '0')}`, 'driver', true]
        );
        driverIds.push(result.insertId);
      }
      console.log(`✓ Created ${driverIds.length} drivers`);
    } else {
      const [allDrivers] = await connection.execute('SELECT id FROM users WHERE role = ?', ['driver']);
      driverIds = allDrivers.map(d => d.id);
      console.log(`✓ Using ${driverIds.length} existing drivers`);
    }
    
    // Clear old data
    console.log('\n🗑️  Clearing old data...');
    await connection.execute('DELETE FROM schedules');
    await connection.execute('DELETE FROM buses');
    await connection.execute('DELETE FROM route_stops');
    await connection.execute('DELETE FROM routes');
    console.log('✓ Cleared old routes, buses, and schedules');
    
    let totalRoutes = 0;
    let totalBuses = 0;
    let totalSchedules = 0;
    let busCounter = 1000;
    let driverIndex = 0;
    
    // Process each route configuration
    for (let routeIndex = 0; routeIndex < routeConfigs.length; routeIndex++) {
      const config = routeConfigs[routeIndex];
      console.log(`\n🛣️  Processing: ${config.origin} → ${config.destination}`);
      
      // Create regular/normal route
      if (config.regularInterval && config.regularStops) {
        const routeId = `R${(routeIndex * 2 + 1).toString().padStart(3, '0')}-${config.origin.substring(0, 2).toUpperCase()}${config.destination.substring(0, 2).toUpperCase()}`;
        const routeName = `${config.origin} - ${config.destination}`;
        
        const [routeResult] = await connection.execute(
          'INSERT INTO routes (route_id, route_name, origin, destination, distance, estimated_duration, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [routeId, routeName, config.origin, config.destination, config.distance, config.duration, true]
        );
        const routeDbId = routeResult.insertId;
        totalRoutes++;
        
        // Insert route stops
        for (let i = 0; i < config.regularStops.length; i++) {
          await connection.execute(
            'INSERT INTO route_stops (route_id, stop_name, latitude, longitude, stop_order, estimated_minutes_from_origin) VALUES (?, ?, ?, ?, ?, ?)',
            [routeId, config.regularStops[i], 12.9716 + (i * 0.05), 77.5946 + (i * 0.05), i + 1, Math.floor((config.duration / config.regularStops.length) * i)]
          );
        }
        
        // Generate buses
        const buses = generateBuses(config.regularInterval, 'NORMAL', busCounter, driverIds, driverIndex);
        for (const bus of buses) {
          await insertBus(connection, bus, routeDbId, depotId, config.duration);
          totalBuses++;
          totalSchedules++;
          busCounter++;
          driverIndex = (driverIndex + 1) % driverIds.length;
        }
        
        console.log(`  ✓ Regular: ${buses.length} buses (every ${config.regularInterval} min)`);
      }
      
      // Create express route
      if (config.expressInterval && config.expressStops) {
        const routeId = `E${(routeIndex * 2 + 2).toString().padStart(3, '0')}-${config.origin.substring(0, 2).toUpperCase()}${config.destination.substring(0, 2).toUpperCase()}`;
        const routeName = `${config.origin} - ${config.destination} Express`;
        
        const [routeResult] = await connection.execute(
          'INSERT INTO routes (route_id, route_name, origin, destination, distance, estimated_duration, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [routeId, routeName, config.origin, config.destination, config.distance, Math.floor(config.duration * 0.75), true]
        );
        const routeDbId = routeResult.insertId;
        totalRoutes++;
        
        // Insert route stops for express
        for (let i = 0; i < config.expressStops.length; i++) {
          await connection.execute(
            'INSERT INTO route_stops (route_id, stop_name, latitude, longitude, stop_order, estimated_minutes_from_origin) VALUES (?, ?, ?, ?, ?, ?)',
            [routeId, config.expressStops[i], 12.9716 + (i * 0.15), 77.5946 + (i * 0.15), i + 1, Math.floor((config.duration * 0.75 / config.expressStops.length) * i)]
          );
        }
        
        // Generate buses
        const daysOfWeek = config.specialDays ? config.specialDays.map(d => d.substring(0, 3)) : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const buses = generateBuses(config.expressInterval, 'EXPRESS', busCounter, driverIds, driverIndex, daysOfWeek);
        for (const bus of buses) {
          await insertBus(connection, bus, routeDbId, depotId, Math.floor(config.duration * 0.75), daysOfWeek);
          totalBuses++;
          totalSchedules++;
          busCounter++;
          driverIndex = (driverIndex + 1) % driverIds.length;
        }
        
        console.log(`  ✓ Express: ${buses.length} buses (every ${config.expressInterval} min)`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ SEEDING COMPLETE!');
    console.log('='.repeat(60));
    console.log(`📊 Statistics:`);
    console.log(`   Routes: ${totalRoutes}`);
    console.log(`   Buses: ${totalBuses}`);
    console.log(`   Schedules: ${totalSchedules}`);
    console.log(`   Drivers: ${driverIds.length}`);
    console.log(`   Operating hours: 05:00 AM - 11:00 PM`);
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    if (connection) await connection.end();
  }
}

function generateBuses(interval, busType, startCounter, driverIds, startDriverIndex, daysOfWeek = null) {
  const buses = [];
  const startTime = 4 * 60 + 30; // 4:30 AM
  const endTime = 22 * 60;  // 10:00 PM (last departure)
  
  let currentTime = startTime;
  let counter = startCounter;
  let driverIdx = startDriverIndex;
  
  while (currentTime < endTime) {
    const hours = Math.floor(currentTime / 60);
    const minutes = currentTime % 60;
    const departureTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
    
    buses.push({
      busNumber: `KA-${counter}`,
      busType: busType,
      capacity: busType === 'EXPRESS' ? 45 : 52,
      departureTime: departureTime,
      driverId: driverIds[driverIdx],
      daysOfWeek: daysOfWeek
    });
    
    currentTime += interval;
    counter++;
    driverIdx = (driverIdx + 1) % driverIds.length;
  }
  
  return buses;
}

async function insertBus(connection, bus, routeDbId, depotId, estimatedDuration, daysOfWeek = null) {
  // Insert bus
  const [busResult] = await connection.execute(
    'INSERT INTO buses (bus_number, bus_type, route_id, depot_id, capacity, driver_id, status, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [bus.busNumber, bus.busType, routeDbId, depotId, bus.capacity, bus.driverId, 'AVAILABLE', true]
  );
  const busId = busResult.insertId;
  
  // Calculate arrival time
  const [hours, minutes] = bus.departureTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + estimatedDuration;
  const arrivalHours = Math.floor(totalMinutes / 60) % 24;
  const arrivalMinutes = totalMinutes % 60;
  const arrivalTime = `${arrivalHours.toString().padStart(2, '0')}:${arrivalMinutes.toString().padStart(2, '0')}:00`;
  
  // Insert schedule
  const days = daysOfWeek || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  await connection.execute(
    'INSERT INTO schedules (route_id, bus_id, driver_id, departure_time, arrival_time, days_of_week, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [routeDbId, busId, bus.driverId, bus.departureTime, arrivalTime, days.join(','), true]
  );
}

// Run seeding
seedDatabase()
  .then(() => {
    console.log('✅ Database seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  });
