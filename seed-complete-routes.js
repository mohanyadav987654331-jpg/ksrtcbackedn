const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'ksrtc_smart_transport'
};

// All route configurations with stops and intervals
const routeConfigs = [
  {
    origin: 'Bangalore',
    destination: 'Mysore',
    nonExpressInterval: 5,
    expressInterval: 15,
    nonExpressStops: ['Bangalore', 'Bidadi', 'Ramanagara', 'Channapatna', 'Maddur', 'Mandya', 'Mysore'],
    expressStops: ['Bangalore', 'Mysore']
  },
  {
    origin: 'Mysore',
    destination: 'Bangalore',
    nonExpressInterval: 7,
    expressInterval: 15,
    nonExpressStops: ['Mysore', 'Mandya', 'Maddur', 'Channapatna', 'Ramanagara', 'Bidadi', 'Bangalore'],
    expressStops: ['Mysore', 'Bangalore']
  },
  {
    origin: 'Bangalore',
    destination: 'Kollegal',
    nonExpressInterval: 8,
    expressInterval: null,
    nonExpressStops: ['Bangalore', 'Banashankari', 'Harohalli', 'Kanakapura', 'Maddur', 'Kollegal'],
    expressStops: null
  },
  {
    origin: 'Kollegal',
    destination: 'Mysore',
    nonExpressInterval: 5,
    expressInterval: null,
    nonExpressStops: ['Kollegal', 'Maddur', 'Kanakapura', 'Harohalli', 'Banashankari', 'Bangalore'],
    expressStops: null
  },
  {
    origin: 'Bangalore',
    destination: 'Hosur',
    nonExpressInterval: 10,
    expressInterval: 25,
    nonExpressStops: ['Bangalore', 'Shivajinagar', 'Koramangala', 'St Johns', 'Roopena Agrahara', 'Electronic City', 'Attibele', 'Hosur'],
    expressStops: ['Bangalore', 'Roopena Agrahara', 'Hosur']
  },
  {
    origin: 'Hosur',
    destination: 'Bangalore',
    nonExpressInterval: 10,
    expressInterval: 25,
    nonExpressStops: ['Hosur', 'Attibele', 'Electronic City', 'Roopena Agrahara', 'St Johns', 'Koramangala', 'Shivajinagar', 'Bangalore'],
    expressStops: ['Hosur', 'Roopena Agrahara', 'Bangalore']
  },
  {
    origin: 'Bangalore',
    destination: 'Kolar',
    nonExpressInterval: 10,
    expressInterval: 30,
    nonExpressStops: ['Bangalore', 'Ramamurthy Nagar', 'KR Puram', 'Hoskote', 'Dasarahalli', 'Yelachenahalli', 'Kondarajanahalli', 'Kolar'],
    expressStops: ['Bangalore', 'KR Puram', 'Hoskote', 'Kolar']
  },
  {
    origin: 'Kolar',
    destination: 'Bangalore',
    nonExpressInterval: 15,
    expressInterval: 30,
    nonExpressStops: ['Kolar', 'Kondarajanahalli', 'Yelachenahalli', 'Dasarahalli', 'Hoskote', 'KR Puram', 'Ramamurthy Nagar', 'Bangalore'],
    expressStops: ['Kolar', 'Hoskote', 'KR Puram', 'Bangalore']
  },
  {
    origin: 'Kanakapura',
    destination: 'Harohalli',
    nonExpressInterval: 15,
    expressInterval: null,
    nonExpressStops: ['Kanakapura', 'Harohalli'],
    expressStops: null
  },
  {
    origin: 'Kanakapura',
    destination: 'Bangalore',
    nonExpressInterval: 15,
    expressInterval: null,
    nonExpressStops: ['Kanakapura', 'Harohalli', 'Kaggalipura', 'Silk Institute', 'Talaghattapura', 'JP Nagar', 'Banashankari', 'Bangalore'],
    expressStops: null
  },
  {
    origin: 'Bangalore',
    destination: 'Kanakapura',
    nonExpressInterval: 15,
    expressInterval: null,
    nonExpressStops: ['Bangalore', 'Banashankari', 'JP Nagar', 'Talaghattapura', 'Silk Institute', 'Kaggalipura', 'Harohalli', 'Kanakapura'],
    expressStops: null
  },
  {
    origin: 'Mysore',
    destination: 'Ramanagara',
    nonExpressInterval: 15,
    expressInterval: null,
    nonExpressStops: ['Mysore', 'Mandya', 'Maddur', 'Channapatna', 'Ramanagara'],
    expressStops: null
  },
  {
    origin: 'Ramanagara',
    destination: 'Mysore',
    nonExpressInterval: 25,
    expressInterval: null,
    nonExpressStops: ['Ramanagara', 'Channapatna', 'Maddur', 'Mandya', 'Mysore'],
    expressStops: null
  },
  {
    origin: 'Ramanagara',
    destination: 'Bidadi',
    nonExpressInterval: 25,
    expressInterval: null,
    nonExpressStops: ['Ramanagara', 'Bidadi'],
    expressStops: null
  },
  {
    origin: 'Bidadi',
    destination: 'Ramanagara',
    nonExpressInterval: 25,
    expressInterval: null,
    nonExpressStops: ['Bidadi', 'Ramanagara'],
    expressStops: null
  },
  {
    origin: 'Bangalore',
    destination: 'Maddur',
    nonExpressInterval: 15,
    expressInterval: null,
    nonExpressStops: ['Bangalore', 'Bidadi', 'Ramanagara', 'Channapatna', 'Maddur'],
    expressStops: null
  },
  {
    origin: 'Mysore',
    destination: 'Srirangapatna',
    nonExpressInterval: 5,
    expressInterval: null,
    nonExpressStops: ['Mysore', 'Srirangapatna'],
    expressStops: null
  },
  {
    origin: 'Srirangapatna',
    destination: 'Mysore',
    nonExpressInterval: 15,
    expressInterval: null,
    nonExpressStops: ['Srirangapatna', 'Mysore'],
    expressStops: null
  },
  {
    origin: 'Bangalore',
    destination: 'Tumkur',
    nonExpressInterval: null,
    expressInterval: 15,
    nonExpressStops: null,
    expressStops: ['Bangalore', 'Tumkur'],
    specialDays: ['Tuesday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday']
  },
  {
    origin: 'Tumkur',
    destination: 'Bangalore',
    nonExpressInterval: null,
    expressInterval: 20,
    nonExpressStops: null,
    expressStops: ['Tumkur', 'Bangalore'],
    specialDays: ['Tuesday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday']
  }
];

// Driver pool
const drivers = [
  { name: 'Rajesh Kumar', phone: '9876543210', license: 'KA01DL123456' },
  { name: 'Suresh Babu', phone: '9876543211', license: 'KA02DL234567' },
  { name: 'Mahesh Gowda', phone: '9876543212', license: 'KA03DL345678' },
  { name: 'Ramesh Reddy', phone: '9876543213', license: 'KA04DL456789' },
  { name: 'Kumar Swamy', phone: '9876543214', license: 'KA05DL567890' },
  { name: 'Venkatesh Murthy', phone: '9876543215', license: 'KA06DL678901' },
  { name: 'Prakash Rao', phone: '9876543216', license: 'KA07DL789012' },
  { name: 'Ganesh Hegde', phone: '9876543217', license: 'KA08DL890123' },
  { name: 'Mohan Das', phone: '9876543218', license: 'KA09DL901234' },
  { name: 'Santhosh Kumar', phone: '9876543219', license: 'KA10DL012345' },
  { name: 'Naveen Gowda', phone: '9876543220', license: 'KA11DL123457' },
  { name: 'Praveen Kumar', phone: '9876543221', license: 'KA12DL234568' },
  { name: 'Ravi Shankar', phone: '9876543222', license: 'KA13DL345679' },
  { name: 'Krishna Murthy', phone: '9876543223', license: 'KA14DL456780' },
  { name: 'Shiva Kumar', phone: '9876543224', license: 'KA15DL567891' }
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
      const [depotResult] = await connection.execute(
        'INSERT INTO depots (name, location, capacity) VALUES (?, ?, ?)',
        ['Main Depot', 'Bangalore', 500]
      );
      depotId = depotResult.insertId;
      console.log('✓ Created new depot');
    } else {
      depotId = depots[0].id;
      console.log('✓ Using existing depot:', depotId);
    }
    
    // Insert drivers (as users with driver role)
    console.log('\n📋 Inserting drivers...');
    await connection.execute('DELETE FROM users WHERE role = ?', ['driver']);
    const driverIds = [];
    for (let i = 0; i < drivers.length; i++) {
      const driver = drivers[i];
      const [result] = await connection.execute(
        'INSERT INTO users (username, email, password_hash, full_name, phone, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [`driver${i+1}`, `${driver.name.toLowerCase().replace(/\s/g, '')}@ksrtc.com`, '$2a$10$dummyhash', driver.name, driver.phone, 'driver', true]
      );
      driverIds.push(result.insertId);
    }
    console.log(`✓ Inserted ${driverIds.length} drivers`);
    
    // Clear existing data
    console.log('\n🗑️  Clearing old data...');
    await connection.execute('DELETE FROM schedules');
    await connection.execute('DELETE FROM buses');
    await connection.execute('DELETE FROM routes');
    console.log('✓ Cleared old routes, buses, and schedules');
    
    let totalRoutes = 0;
    let totalBuses = 0;
    let totalSchedules = 0;
    let busCounter = 1000;
    let driverIndex = 0;
    
    // Process each route
    for (const config of routeConfigs) {
      console.log(`\n🛣️  Processing route: ${config.origin} → ${config.destination}`);
      
      // Create non-express route if interval exists
      if (config.nonExpressInterval && config.nonExpressStops) {
        const routeId = `${config.origin.substring(0, 3).toUpperCase()}-${config.destination.substring(0, 3).toUpperCase()}-REG`;
        const routeName = `${config.origin} - ${config.destination}`;
        
        await connection.execute(
          'INSERT INTO routes (route_id, route_name, origin, destination, distance, estimated_duration, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [routeId, routeName, config.origin, config.destination, 100, 120, true]
        );
        totalRoutes++;
        
        // Insert route stops
        for (let i = 0; i < config.nonExpressStops.length; i++) {
          await connection.execute(
            'INSERT INTO route_stops (route_id, stop_name, latitude, longitude, stop_order, estimated_minutes_from_origin) VALUES (?, ?, ?, ?, ?, ?)',
            [routeId, config.nonExpressStops[i], 12.9716 + (i * 0.1), 77.5946 + (i * 0.1), i + 1, i * 15]
          );
        }
        
        // Generate buses for non-express
        const buses = generateBuses(config, 'NORMAL', busCounter, driverIds, driverIndex);
        for (const bus of buses) {
          await insertBusAndSchedules(connection, bus, routeId, depotId);
          totalBuses++;
          totalSchedules++;
          busCounter++;
          driverIndex = (driverIndex + 1) % driverIds.length;
        }
        
        console.log(`  ✓ Non-Express: ${buses.length} buses (every ${config.nonExpressInterval} min)`);
      }
      
      // Create express route if interval exists
      if (config.expressInterval && config.expressStops) {
        const routeId = `${config.origin.substring(0, 3).toUpperCase()}-${config.destination.substring(0, 3).toUpperCase()}-EXP`;
        const routeName = `${config.origin} - ${config.destination} Express`;
        
        await connection.execute(
          'INSERT INTO routes (route_id, route_name, origin, destination, distance, estimated_duration, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [routeId, routeName, config.origin, config.destination, 100, 90, true]
        );
        totalRoutes++;
        
        // Insert route stops for express
        for (let i = 0; i < config.expressStops.length; i++) {
          await connection.execute(
            'INSERT INTO route_stops (route_id, stop_name, latitude, longitude, stop_order, estimated_minutes_from_origin) VALUES (?, ?, ?, ?, ?, ?)',
            [routeId, config.expressStops[i], 12.9716 + (i * 0.2), 77.5946 + (i * 0.2), i + 1, i * 30]
          );
        }
        
        // Generate buses for express
        const buses = generateBuses(config, 'EXPRESS', busCounter, driverIds, driverIndex);
        for (const bus of buses) {
          await insertBusAndSchedules(connection, bus, routeId, depotId);
          totalBuses++;
          totalSchedules++;
          busCounter++;
          driverIndex = (driverIndex + 1) % driverIds.length;
        }
        
        console.log(`  ✓ Express: ${buses.length} buses (every ${config.expressInterval} min)`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ SEEDING COMPLETE!');
    console.log('='.repeat(50));
    console.log(`Routes: ${totalRoutes}`);
    console.log(`Buses: ${totalBuses}`);
    console.log(`Schedules: ${totalSchedules}`);
    console.log(`Drivers: ${driverIds.length}`);
    console.log(`Bus timings: 05:00 AM - 11:00 PM`);
    console.log('='.repeat(50) + '\n');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

function generateBuses(config, busType, startCounter, driverIds, startDriverIndex) {
  const buses = [];
  const interval = busType === 'express' ? config.expressInterval : config.nonExpressInterval;
  
  if (!interval) return buses;
  
  const startTime = 4 * 60 + 30; // 4:30 AM in minutes
  const endTime = 22 * 60; // 10:00 PM in minutes (last departure to ensure arrival by 11 PM)
  
  let currentTime = startTime;
  let counter = startCounter;
  let driverIdx = startDriverIndex;
  
  while (currentTime < endTime) {
    const hours = Math.floor(currentTime / 60);
    const minutes = currentTime % 60;
    const departureTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
    
    buses.push({
      busNumber: `KA-${counter}`,
      numberPlate: `KA-01-${busType === 'express' ? 'E' : 'R'}-${counter}`,
      busType: busType,
      capacity: busType === 'express' ? 45 : 52,
      departureTime: departureTime,
      driverId: driverIds[driverIdx]
    });
    
    currentTime += interval;
    counter++;
    driverIdx = (driverIdx + 1) % driverIds.length;
  }
  
  return buses;
}

async function insertBusAndSchedules(connection, bus, routeId, depotId) {
  // Insert bus - route_id should be VARCHAR in the buses table too
  const [busResult] = await connection.execute(
    'INSERT INTO buses (bus_number, capacity, bus_type, depot_id, driver_id) VALUES (?, ?, ?, ?, ?)',
    [bus.busNumber, bus.capacity, bus.busType.toUpperCase(), depotId, bus.driverId]
  );
  const busId = busResult.insertId;
  
  // Update bus to set route - assuming there's a route_number or similar field
  // For now, we'll use a schedules table approach
  
  // Insert schedule
  await connection.execute(
    'INSERT INTO schedules (bus_id, route_id, driver_id, departure_time, arrival_time, days_of_week) VALUES (?, ?, ?, ?, ?, ?)',
    [busId, routeId, bus.driverId, bus.departureTime, calculateArrivalTime(bus.departureTime, 120), JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])]
  );
}

function calculateArrivalTime(departureTime, durationMinutes) {
  const [hours, minutes] = departureTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const arrivalHours = Math.floor(totalMinutes / 60) % 24;
  const arrivalMinutes = totalMinutes % 60;
  return `${arrivalHours.toString().padStart(2, '0')}:${arrivalMinutes.toString().padStart(2, '0')}:00`;
}

// Run the seeding
seedDatabase()
  .then(() => {
    console.log('✅ Database seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  });
