const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'ksrtc_smart_transport',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const db = {
  query: async (sql, values) => {
    const connection = await pool.getConnection();
    try {
      return await connection.execute(sql, values);
    } finally {
      connection.release();
    }
  },
};

// Drivers pool
const drivers = [
  { name: 'Ravi Kumar', phone: '9876543210' },
  { name: 'Ramesh Singh', phone: '9876543211' },
  { name: 'Suresh Patel', phone: '9876543212' },
  { name: 'Deepak Sharma', phone: '9876543213' },
  { name: 'Anil Kumar', phone: '9876543214' },
  { name: 'Vikram Singh', phone: '9876543215' },
  { name: 'Mohan Reddy', phone: '9876543216' },
  { name: 'Rajesh Kumar', phone: '9876543217' },
  { name: 'Akshay Patel', phone: '9876543218' },
  { name: 'Nikhil Sharma', phone: '9876543219' },
];

// Number plates for buses
const numberPlates = [
  'KA01AB0001', 'KA01AB0002', 'KA01AB0003', 'KA01AB0004', 'KA01AB0005',
  'KA01AB0006', 'KA01AB0007', 'KA01AB0008', 'KA01AB0009', 'KA01AB0010',
  'KA01AB0011', 'KA01AB0012', 'KA01AB0013', 'KA01AB0014', 'KA01AB0015',
  'KA01AB0016', 'KA01AB0017', 'KA01AB0018', 'KA01AB0019', 'KA01AB0020',
  'KA01AB0021', 'KA01AB0022', 'KA01AB0023', 'KA01AB0024', 'KA01AB0025',
  'KA01AB0026', 'KA01AB0027', 'KA01AB0028', 'KA01AB0029', 'KA01AB0030',
];

// Routes with comprehensive details
const routes = [
  // 1. Bangalore - Mysore
  {
    routeId: 'BLR-MYS-001',
    name: 'Bangalore - Mysore',
    origin: 'Bangalore',
    destination: 'Mysore',
    distance: 145,
    duration: 180,
    routes: [
      {
        type: 'NON-EXPRESS',
        interval: 5,
        stops: [
          { name: 'Bangalore', lat: 12.9716, lng: 77.5946, minutes: 0 },
          { name: 'Bidadi', lat: 12.8667, lng: 77.4667, minutes: 30 },
          { name: 'Ramanagara', lat: 12.7333, lng: 77.2833, minutes: 60 },
          { name: 'Chanpatana', lat: 12.65, lng: 77.2, minutes: 90 },
          { name: 'Maddur', lat: 12.55, lng: 77.1667, minutes: 120 },
          { name: 'Mandya', lat: 12.5333, lng: 75.85, minutes: 150 },
          { name: 'Mysore', lat: 12.2958, lng: 76.6394, minutes: 180 },
        ],
      },
      {
        type: 'EXPRESS',
        interval: 15,
        stops: [
          { name: 'Bangalore', lat: 12.9716, lng: 77.5946, minutes: 0 },
          { name: 'Mysore', lat: 12.2958, lng: 76.6394, minutes: 180 },
        ],
      },
    ],
  },

  // 2. Mysore - Bangalore
  {
    routeId: 'MYS-BLR-001',
    name: 'Mysore - Bangalore',
    origin: 'Mysore',
    destination: 'Bangalore',
    distance: 145,
    duration: 180,
    routes: [
      {
        type: 'NON-EXPRESS',
        interval: 7,
        stops: [
          { name: 'Mysore', lat: 12.2958, lng: 76.6394, minutes: 0 },
          { name: 'Mandya', lat: 12.5333, lng: 75.85, minutes: 30 },
          { name: 'Maddur', lat: 12.55, lng: 77.1667, minutes: 60 },
          { name: 'Chanpatana', lat: 12.65, lng: 77.2, minutes: 90 },
          { name: 'Ramanagara', lat: 12.7333, lng: 77.2833, minutes: 120 },
          { name: 'Bidadi', lat: 12.8667, lng: 77.4667, minutes: 150 },
          { name: 'Bangalore', lat: 12.9716, lng: 77.5946, minutes: 180 },
        ],
      },
      {
        type: 'EXPRESS',
        interval: 15,
        stops: [
          { name: 'Mysore', lat: 12.2958, lng: 76.6394, minutes: 0 },
          { name: 'Bangalore', lat: 12.9716, lng: 77.5946, minutes: 180 },
        ],
      },
    ],
  },

  // 3. Bangalore - Kollegal
  {
    routeId: 'BLR-KOL-001',
    name: 'Bangalore - Kollegal',
    origin: 'Bangalore',
    destination: 'Kollegal',
    distance: 120,
    duration: 160,
    routes: [
      {
        type: 'NON-EXPRESS',
        interval: 8,
        stops: [
          { name: 'Bangalore', lat: 12.9716, lng: 77.5946, minutes: 0 },
          { name: 'Banashankari', lat: 12.8, lng: 77.4, minutes: 25 },
          { name: 'Harohalli', lat: 12.75, lng: 77.35, minutes: 50 },
          { name: 'Kanakapura', lat: 12.7167, lng: 77.1167, minutes: 80 },
          { name: 'Maddur', lat: 12.55, lng: 77.1667, minutes: 110 },
          { name: 'Kollegal', lat: 12.15, lng: 77.15, minutes: 160 },
        ],
      },
    ],
  },

  // 4. Kollegal - Mysore
  {
    routeId: 'KOL-MYS-001',
    name: 'Kollegal - Mysore',
    origin: 'Kollegal',
    destination: 'Mysore',
    distance: 100,
    duration: 140,
    routes: [
      {
        type: 'NON-EXPRESS',
        interval: 5,
        stops: [
          { name: 'Kollegal', lat: 12.15, lng: 77.15, minutes: 0 },
          { name: 'Maddur', lat: 12.55, lng: 77.1667, minutes: 50 },
          { name: 'Kanakapura', lat: 12.7167, lng: 77.1167, minutes: 80 },
          { name: 'Harohalli', lat: 12.75, lng: 77.35, minutes: 110 },
          { name: 'Banashankari', lat: 12.8, lng: 77.4, minutes: 130 },
          { name: 'Mysore', lat: 12.2958, lng: 76.6394, minutes: 140 },
        ],
      },
      {
        type: 'EXPRESS',
        interval: 12,
        stops: [
          { name: 'Kollegal', lat: 12.15, lng: 77.15, minutes: 0 },
          { name: 'Bangalore', lat: 12.9716, lng: 77.5946, minutes: 90 },
          { name: 'Kanakapura', lat: 12.7167, lng: 77.1167, minutes: 110 },
          { name: 'Kollegal', lat: 12.15, lng: 77.15, minutes: 140 },
        ],
      },
    ],
  },

  // 5. Bangalore - Hosur
  {
    routeId: 'BLR-HOS-001',
    name: 'Bangalore - Hosur',
    origin: 'Bangalore',
    destination: 'Hosur',
    distance: 60,
    duration: 90,
    routes: [
      {
        type: 'NON-EXPRESS',
        interval: 10,
        stops: [
          { name: 'Bangalore', lat: 12.9716, lng: 77.5946, minutes: 0 },
          { name: 'Sivajinagar', lat: 12.9333, lng: 77.6167, minutes: 15 },
          { name: 'Koramangala', lat: 12.9352, lng: 77.6245, minutes: 25 },
          { name: 'St. Johns', lat: 12.9333, lng: 77.6, minutes: 35 },
          { name: 'Roppanagahara', lat: 12.85, lng: 77.65, minutes: 50 },
          { name: 'Electronic City', lat: 12.8386, lng: 77.6785, minutes: 65 },
          { name: 'Attibele', lat: 12.8, lng: 77.7, minutes: 75 },
          { name: 'Hosur', lat: 12.7383, lng: 77.8389, minutes: 90 },
        ],
      },
      {
        type: 'EXPRESS',
        interval: 25,
        stops: [
          { name: 'Bangalore', lat: 12.9716, lng: 77.5946, minutes: 0 },
          { name: 'Roppanagahara', lat: 12.85, lng: 77.65, minutes: 40 },
          { name: 'Hosur', lat: 12.7383, lng: 77.8389, minutes: 90 },
        ],
      },
    ],
  },

  // 6. Hosur - Bangalore
  {
    routeId: 'HOS-BLR-001',
    name: 'Hosur - Bangalore',
    origin: 'Hosur',
    destination: 'Bangalore',
    distance: 60,
    duration: 90,
    routes: [
      {
        type: 'NON-EXPRESS',
        interval: 10,
        stops: [
          { name: 'Hosur', lat: 12.7383, lng: 77.8389, minutes: 0 },
          { name: 'Attibele', lat: 12.8, lng: 77.7, minutes: 15 },
          { name: 'Electronic City', lat: 12.8386, lng: 77.6785, minutes: 25 },
          { name: 'Roppanagahara', lat: 12.85, lng: 77.65, minutes: 40 },
          { name: 'St. Johns', lat: 12.9333, lng: 77.6, minutes: 55 },
          { name: 'Koramangala', lat: 12.9352, lng: 77.6245, minutes: 65 },
          { name: 'Sivajinagar', lat: 12.9333, lng: 77.6167, minutes: 75 },
          { name: 'Bangalore', lat: 12.9716, lng: 77.5946, minutes: 90 },
        ],
      },
      {
        type: 'EXPRESS',
        interval: 25,
        stops: [
          { name: 'Hosur', lat: 12.7383, lng: 77.8389, minutes: 0 },
          { name: 'Roppanagahara', lat: 12.85, lng: 77.65, minutes: 50 },
          { name: 'Bangalore', lat: 12.9716, lng: 77.5946, minutes: 90 },
        ],
      },
    ],
  },

  // 7. Bangalore - Kolar
  {
    routeId: 'BLR-KOL-002',
    name: 'Bangalore - Kolar',
    origin: 'Bangalore',
    destination: 'Kolar',
    distance: 95,
    duration: 140,
    routes: [
      {
        type: 'NON-EXPRESS',
        interval: 10,
        stops: [
          { name: 'Bangalore', lat: 12.9716, lng: 77.5946, minutes: 0 },
          { name: 'Ramachandrapuram', lat: 12.85, lng: 77.8, minutes: 30 },
          { name: 'Krupuram', lat: 12.8, lng: 77.95, minutes: 60 },
          { name: 'Hosakeote', lat: 12.75, lng: 78.05, minutes: 85 },
          { name: 'Dasarathalli', lat: 12.65, lng: 78.15, minutes: 105 },
          { name: 'Yelachipur', lat: 12.55, lng: 78.25, minutes: 125 },
          { name: 'Kondarajnahalli', lat: 12.45, lng: 78.35, minutes: 140 },
        ],
      },
      {
        type: 'EXPRESS',
        interval: 30,
        stops: [
          { name: 'Bangalore', lat: 12.9716, lng: 77.5946, minutes: 0 },
          { name: 'Krupuram', lat: 12.8, lng: 77.95, minutes: 50 },
          { name: 'Hosakeote', lat: 12.75, lng: 78.05, minutes: 75 },
          { name: 'Kolar', lat: 12.95, lng: 78.1305, minutes: 140 },
        ],
      },
    ],
  },

  // 8. Kolar - Bangalore
  {
    routeId: 'KOL-BLR-002',
    name: 'Kolar - Bangalore',
    origin: 'Kolar',
    destination: 'Bangalore',
    distance: 95,
    duration: 140,
    routes: [
      {
        type: 'NON-EXPRESS',
        interval: 15,
        stops: [
          { name: 'Kolar', lat: 12.95, lng: 78.1305, minutes: 0 },
          { name: 'Kondarajnahalli', lat: 12.45, lng: 78.35, minutes: 20 },
          { name: 'Yelachipur', lat: 12.55, lng: 78.25, minutes: 35 },
          { name: 'Dasarathalli', lat: 12.65, lng: 78.15, minutes: 55 },
          { name: 'Hosakeote', lat: 12.75, lng: 78.05, minutes: 75 },
          { name: 'Krupuram', lat: 12.8, lng: 77.95, minutes: 100 },
          { name: 'Ramachandrapuram', lat: 12.85, lng: 77.8, minutes: 130 },
          { name: 'Bangalore', lat: 12.9716, lng: 77.5946, minutes: 140 },
        ],
      },
      {
        type: 'EXPRESS',
        interval: 30,
        stops: [
          { name: 'Kolar', lat: 12.95, lng: 78.1305, minutes: 0 },
          { name: 'Hosakeote', lat: 12.75, lng: 78.05, minutes: 65 },
          { name: 'Krupuram', lat: 12.8, lng: 77.95, minutes: 90 },
          { name: 'Bangalore', lat: 12.9716, lng: 77.5946, minutes: 140 },
        ],
      },
    ],
  },

  // 9. Kanakapura - Harohalli
  {
    routeId: 'KAN-HAR-001',
    name: 'Kanakapura - Harohalli',
    origin: 'Kanakapura',
    destination: 'Harohalli',
    distance: 25,
    duration: 40,
    routes: [
      {
        type: 'NON-EXPRESS',
        interval: 15,
        stops: [
          { name: 'Kanakapura', lat: 12.7167, lng: 77.1167, minutes: 0 },
          { name: 'Harohalli', lat: 12.75, lng: 77.35, minutes: 40 },
        ],
      },
    ],
  },

  // 10. Kanakapura - Bangalore
  {
    routeId: 'KAN-BLR-001',
    name: 'Kanakapura - Bangalore',
    origin: 'Kanakapura',
    destination: 'Bangalore',
    distance: 50,
    duration: 75,
    routes: [
      {
        type: 'NON-EXPRESS',
        interval: 15,
        stops: [
          { name: 'Kanakapura', lat: 12.7167, lng: 77.1167, minutes: 0 },
          { name: 'Harohalli', lat: 12.75, lng: 77.35, minutes: 25 },
          { name: 'Banashankari', lat: 12.8, lng: 77.4, minutes: 45 },
          { name: 'Bangalore', lat: 12.9716, lng: 77.5946, minutes: 75 },
        ],
      },
    ],
  },

  // 11. Bangalore - Kanakapura
  {
    routeId: 'BLR-KAN-001',
    name: 'Bangalore - Kanakapura',
    origin: 'Bangalore',
    destination: 'Kanakapura',
    distance: 50,
    duration: 75,
    routes: [
      {
        type: 'NON-EXPRESS',
        interval: 15,
        stops: [
          { name: 'Bangalore', lat: 12.9716, lng: 77.5946, minutes: 0 },
          { name: 'Banashankari', lat: 12.8, lng: 77.4, minutes: 30 },
          { name: 'Harohalli', lat: 12.75, lng: 77.35, minutes: 50 },
          { name: 'Kanakapura', lat: 12.7167, lng: 77.1167, minutes: 75 },
        ],
      },
    ],
  },

  // 12. Mysore - Ramanagara
  {
    routeId: 'MYS-RAM-001',
    name: 'Mysore - Ramanagara',
    origin: 'Mysore',
    destination: 'Ramanagara',
    distance: 50,
    duration: 75,
    routes: [
      {
        type: 'NON-EXPRESS',
        interval: 15,
        stops: [
          { name: 'Mysore', lat: 12.2958, lng: 76.6394, minutes: 0 },
          { name: 'Mandya', lat: 12.5333, lng: 75.85, minutes: 25 },
          { name: 'Maddur', lat: 12.55, lng: 77.1667, minutes: 50 },
          { name: 'Ramanagara', lat: 12.7333, lng: 77.2833, minutes: 75 },
        ],
      },
    ],
  },

  // 13. Ramanagara - Mysore
  {
    routeId: 'RAM-MYS-001',
    name: 'Ramanagara - Mysore',
    origin: 'Ramanagara',
    destination: 'Mysore',
    distance: 50,
    duration: 75,
    routes: [
      {
        type: 'NON-EXPRESS',
        interval: 25,
        stops: [
          { name: 'Ramanagara', lat: 12.7333, lng: 77.2833, minutes: 0 },
          { name: 'Maddur', lat: 12.55, lng: 77.1667, minutes: 25 },
          { name: 'Mandya', lat: 12.5333, lng: 75.85, minutes: 50 },
          { name: 'Mysore', lat: 12.2958, lng: 76.6394, minutes: 75 },
        ],
      },
    ],
  },

  // 14. Ramanagara - Bidadi
  {
    routeId: 'RAM-BID-001',
    name: 'Ramanagara - Bidadi',
    origin: 'Ramanagara',
    destination: 'Bidadi',
    distance: 35,
    duration: 60,
    routes: [
      {
        type: 'NON-EXPRESS',
        interval: 25,
        stops: [
          { name: 'Ramanagara', lat: 12.7333, lng: 77.2833, minutes: 0 },
          { name: 'Chanpatana', lat: 12.65, lng: 77.2, minutes: 20 },
          { name: 'Bidadi', lat: 12.8667, lng: 77.4667, minutes: 60 },
        ],
      },
    ],
  },

  // 15. Bidadi - Ramanagara
  {
    routeId: 'BID-RAM-001',
    name: 'Bidadi - Ramanagara',
    origin: 'Bidadi',
    destination: 'Ramanagara',
    distance: 35,
    duration: 60,
    routes: [
      {
        type: 'NON-EXPRESS',
        interval: 25,
        stops: [
          { name: 'Bidadi', lat: 12.8667, lng: 77.4667, minutes: 0 },
          { name: 'Chanpatana', lat: 12.65, lng: 77.2, minutes: 40 },
          { name: 'Ramanagara', lat: 12.7333, lng: 77.2833, minutes: 60 },
        ],
      },
    ],
  },

  // 16. Bangalore - Maddur
  {
    routeId: 'BLR-MAD-001',
    name: 'Bangalore - Maddur',
    origin: 'Bangalore',
    destination: 'Maddur',
    distance: 80,
    duration: 120,
    routes: [
      {
        type: 'NON-EXPRESS',
        interval: 15,
        stops: [
          { name: 'Bangalore', lat: 12.9716, lng: 77.5946, minutes: 0 },
          { name: 'Bidadi', lat: 12.8667, lng: 77.4667, minutes: 30 },
          { name: 'Ramanagara', lat: 12.7333, lng: 77.2833, minutes: 60 },
          { name: 'Chanpatana', lat: 12.65, lng: 77.2, minutes: 85 },
          { name: 'Maddur', lat: 12.55, lng: 77.1667, minutes: 120 },
        ],
      },
      {
        type: 'EXPRESS',
        interval: 20,
        stops: [
          { name: 'Bangalore', lat: 12.9716, lng: 77.5946, minutes: 0 },
          { name: 'Ramanagara', lat: 12.7333, lng: 77.2833, minutes: 50 },
          { name: 'Maddur', lat: 12.55, lng: 77.1667, minutes: 120 },
        ],
      },
    ],
  },

  // 17. Mysore - Srirangapatna
  {
    routeId: 'MYS-SRP-001',
    name: 'Mysore - Srirangapatna',
    origin: 'Mysore',
    destination: 'Srirangapatna',
    distance: 20,
    duration: 30,
    routes: [
      {
        type: 'NON-EXPRESS',
        interval: 5,
        stops: [
          { name: 'Mysore', lat: 12.2958, lng: 76.6394, minutes: 0 },
          { name: 'Srirangapatna', lat: 12.4147, lng: 76.6864, minutes: 30 },
        ],
      },
    ],
  },

  // 18. Srirangapatna - Mysore
  {
    routeId: 'SRP-MYS-001',
    name: 'Srirangapatna - Mysore',
    origin: 'Srirangapatna',
    destination: 'Mysore',
    distance: 20,
    duration: 30,
    routes: [
      {
        type: 'EXPRESS',
        interval: 15,
        stops: [
          { name: 'Srirangapatna', lat: 12.4147, lng: 76.6864, minutes: 0 },
          { name: 'Mysore', lat: 12.2958, lng: 76.6394, minutes: 30 },
        ],
      },
    ],
  },

  // 19. Bangalore - Tumkur (Special Days Only)
  {
    routeId: 'BLR-TUM-001',
    name: 'Bangalore - Tumkur',
    origin: 'Bangalore',
    destination: 'Tumkur',
    distance: 70,
    duration: 110,
    specialDays: ['TUESDAY', 'WEDNESDAY', 'THURSDAY', 'SATURDAY', 'SUNDAY'],
    routes: [
      {
        type: 'EXPRESS',
        interval: 15,
        stops: [
          { name: 'Bangalore', lat: 12.9716, lng: 77.5946, minutes: 0 },
          { name: 'Tumkur', lat: 13.2226, lng: 77.1147, minutes: 110 },
        ],
      },
    ],
  },

  // 20. Tumkur - Bangalore (Special Days Only)
  {
    routeId: 'TUM-BLR-001',
    name: 'Tumkur - Bangalore',
    origin: 'Tumkur',
    destination: 'Bangalore',
    distance: 70,
    duration: 110,
    specialDays: ['SUNDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'SATURDAY'],
    routes: [
      {
        type: 'NON-EXPRESS',
        interval: 20,
        stops: [
          { name: 'Tumkur', lat: 13.2226, lng: 77.1147, minutes: 0 },
          { name: 'Bangalore', lat: 12.9716, lng: 77.5946, minutes: 110 },
        ],
      },
    ],
  },
];

async function seedAllRoutes() {
  try {
    console.log('🌱 Starting comprehensive route seeding with all routes and stops...\n');

    // First, add missing columns if they don't exist
    console.log('🔧 Checking and adding missing columns...');
    try {
      await db.query(`ALTER TABLE buses ADD COLUMN driver_name VARCHAR(100)`);
      console.log('✓ Added driver_name column');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }

    try {
      await db.query(`ALTER TABLE buses ADD COLUMN driver_phone VARCHAR(20)`);
      console.log('✓ Added driver_phone column');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }

    try {
      await db.query(`ALTER TABLE buses ADD COLUMN number_plate VARCHAR(20)`);
      console.log('✓ Added number_plate column');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }

    // Clear existing data
    console.log('\n🗑️  Clearing existing data...');
    await db.query('DELETE FROM schedules');
    await db.query('DELETE FROM route_stops');
    await db.query('DELETE FROM buses');
    await db.query('DELETE FROM routes');
    console.log('✓ Cleared existing data\n');

    let totalBuses = 0;
    let totalSchedules = 0;
    let totalStops = 0;
    let globalBusIndex = 0;  // Global counter for unique bus numbers

    // Process each route
    for (const route of routes) {
      console.log(`📍 Processing: ${route.origin} - ${route.destination}`);

      // Insert route
      const [routeResult] = await db.query(
        `INSERT INTO routes (route_id, route_name, origin, destination, distance, estimated_duration)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          route.routeId,
          route.name,
          route.origin,
          route.destination,
          route.distance,
          route.duration,
        ]
      );

      const routeDBId = routeResult.insertId;

      // Insert route stops
      for (const routeVariant of route.routes) {
        for (const stop of routeVariant.stops) {
          await db.query(
            `INSERT INTO route_stops (route_id, stop_name, stop_order, latitude, longitude, estimated_minutes_from_origin)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              route.routeId,  // Use route_id string, not DB id
              stop.name,
              routeVariant.stops.indexOf(stop) + 1,
              stop.lat,
              stop.lng,
              stop.minutes,
            ]
          );
          totalStops++;
        }
      }

      // Generate buses for each variant
      const baseDate = new Date('2025-01-22');

      for (const routeVariant of route.routes) {
        const startTime = 4 * 60 + 30; // 4:30 AM in minutes
        const endTime = 23 * 60; // 11 PM in minutes
        let currentTime = startTime;

        while (currentTime + route.duration <= endTime) {
          // Get driver and number plate using global index
          const driver = drivers[globalBusIndex % drivers.length];
          const numberPlate = numberPlates[globalBusIndex % numberPlates.length];

          // Create unique bus number
          const busNumber = routeVariant.type === 'EXPRESS' 
            ? `KA01E${String(globalBusIndex + 1).padStart(5, '0')}`
            : `KA01N${String(globalBusIndex + 1).padStart(5, '0')}`;

          const [busResult] = await db.query(
            `INSERT INTO buses (route_id, bus_number, bus_type, capacity, driver_name, driver_phone, number_plate, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              routeDBId,
              busNumber,
              routeVariant.type === 'EXPRESS' ? 'EXPRESS' : 'NORMAL',
              45,
              driver.name,
              driver.phone,
              numberPlate,
              'ACTIVE',
            ]
          );

          const busDBId = busResult.insertId;

          // Create schedule
          const hours = Math.floor(currentTime / 60);
          const minutes = currentTime % 60;
          const departureTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

          const arrivalMinutes = currentTime + route.duration;
          const arrivalHours = Math.floor(arrivalMinutes / 60);
          const arrivalMins = arrivalMinutes % 60;
          const arrivalTime = `${String(arrivalHours).padStart(2, '0')}:${String(arrivalMins).padStart(2, '0')}`;

          await db.query(
            `INSERT INTO schedules (bus_id, route_id, departure_time, arrival_time)
             VALUES (?, ?, ?, ?)`,
            [
              busDBId,
              routeDBId,
              departureTime,
              arrivalTime,
            ]
          );

          totalBuses++;
          totalSchedules++;
          globalBusIndex++;  // Increment global counter
          currentTime += routeVariant.interval;
        }
      }

      console.log(`  ✓ Route created with stops and buses`);
    }

    console.log('\n✅ Seeding Complete!');
    console.log('📊 Summary:');
    console.log(`  - Routes: ${routes.length}`);
    console.log(`  - Total Stops: ${totalStops}`);
    console.log(`  - Total Buses: ${totalBuses}`);
    console.log(`  - Total Schedules: ${totalSchedules}`);
    console.log(`  - Time range: 05:00 - 23:00`);
    console.log(`  - Drivers: ${drivers.length}`);
    console.log(`  - Number Plates: ${numberPlates.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedAllRoutes();
