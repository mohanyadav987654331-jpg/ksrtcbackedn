# Depot-Based Driver Management System

## Overview

Depot admins can now manage their location's operations:
- View and manage drivers assigned to their depot
- View and manage buses for their location
- View today's schedule for their depot
- Change drivers for different trips
- Update schedule times
- Create new schedules

## Database Structure

### Drivers → Depots Assignment
```sql
-- Each driver is assigned to a depot
UPDATE users SET depot_id = ? WHERE id = ?;

-- Each bus belongs to a depot
ALTER TABLE buses ADD COLUMN depot_id INT;
ALTER TABLE buses ADD FOREIGN KEY (depot_id) REFERENCES depots(id);

-- Each schedule is linked to a depot
ALTER TABLE schedules ADD COLUMN depot_id INT;
ALTER TABLE schedules ADD FOREIGN KEY (depot_id) REFERENCES depots(id);
```

## API Endpoints

### 1. Depot Overview (Dashboard)
**GET** `/api/depot/overview`

Returns complete depot information:

```json
{
  "success": true,
  "depot": {
    "id": 30,
    "name": "Bangalore Central Depot"
  },
  "data": {
    "drivers": {
      "count": 1,
      "list": [
        {
          "id": 102,
          "full_name": "Rajesh Kumar",
          "phone": "9876543210",
          "is_active": true
        }
      ]
    },
    "buses": {
      "count": 10,
      "list": [
        {
          "id": 1,
          "bus_number": "KA-5000",
          "bus_type": "EXPRESS",
          "capacity": 50,
          "driver_id": 102,
          "driver_name": "Rajesh Kumar",
          "status": "AVAILABLE",
          "origin": "Bangalore",
          "destination": "Mysore"
        }
      ]
    },
    "schedules": {
      "count": 30,
      "list": [
        {
          "id": 1,
          "departure_time": "05:00:00",
          "arrival_time": "08:00:00",
          "bus_number": "KA-5000",
          "bus_type": "EXPRESS",
          "driver_name": "Rajesh Kumar",
          "origin": "Bangalore",
          "destination": "Mysore",
          "distance": 140.00,
          "estimated_duration": 180,
          "stop_count": 7
        }
      ]
    }
  }
}
```

### 2. Get All Drivers
**GET** `/api/depot/drivers`

```json
{
  "success": true,
  "data": [
    {
      "id": 102,
      "full_name": "Rajesh Kumar",
      "phone": "9876543210",
      "is_active": true,
      "created_at": "2026-01-16T00:00:00Z",
      "total_trips": 150,
      "completed_trips": 45
    }
  ]
}
```

### 3. Get All Buses
**GET** `/api/depot/buses`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "bus_number": "KA-5000",
      "bus_type": "EXPRESS",
      "capacity": 50,
      "status": "AVAILABLE",
      "driver_id": 102,
      "driver_name": "Rajesh Kumar",
      "phone": "9876543210",
      "origin": "Bangalore",
      "destination": "Mysore",
      "distance": 140.00,
      "scheduled_trips": 6
    }
  ]
}
```

### 4. Get Today's Schedule
**GET** `/api/depot/today-schedule`

Returns all trips for the depot today with status (ASSIGNED, IN_PROGRESS, COMPLETED)

### 5. Reassign Driver
**POST** `/api/depot/reassign-driver`

Allows depot admin to change driver for a trip:

```json
{
  "assignmentId": 123,
  "newDriverId": 103
}
```

### 6. Update Schedule Times
**POST** `/api/depot/update-schedule`

Change departure/arrival times:

```json
{
  "scheduleId": 456,
  "departureTime": "06:00:00",
  "arrivalTime": "09:00:00"
}
```

### 7. Get Available Routes
**GET** `/api/depot/available-routes`

Returns all routes available for scheduling in this depot:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "route_id": "R001",
      "origin": "Bangalore",
      "destination": "Mysore",
      "distance": 140.00,
      "estimated_duration": 180,
      "schedules_count": 6
    }
  ]
}
```

### 8. Create New Schedule
**POST** `/api/depot/create-schedule`

Add a new schedule for a route:

```json
{
  "routeId": 1,
  "departureTime": "06:00:00",
  "arrivalTime": "09:00:00",
  "driverId": 102
}
```

Response:
```json
{
  "success": true,
  "message": "Schedule created successfully",
  "data": {
    "scheduleId": 789,
    "busId": 15,
    "busNumber": "KA-5123"
  }
}
```

## Data Hierarchy

```
Depot (e.g., Bangalore Central Depot)
├── Drivers (e.g., Rajesh Kumar)
├── Buses (e.g., KA-5000, KA-5001)
├── Routes (e.g., Bangalore→Mysore)
├── Schedules (e.g., 05:00-08:00, 11:00-14:00)
└── Driver Assignments (Trip assignments with status)
```

## Route Logic & Geographic Awareness

### Travel Time Constraints

When assigning drivers:
1. **Previous trip end time** is calculated: `departure_time + trip_duration`
2. **5-minute buffer** is added for driver rest
3. **Next trip can start** at: `last_arrival_time + 5_minutes`

**Example:**
```
Trip 1: Bangalore → Mysore
  Departs: 11:00
  Duration: 3 hours
  Arrives: 14:00
  
Trip 2 can start at: 14:05 or later

Trip 2 cannot be: Kollegal → Mysore at 11:15
  (Driver is still in Mysore area, hasn't even started driving)
```

### Distance-Based Routing

Routes are validated for geographic proximity:

```
Sample Routes:
- Bangalore → Mysore (140 km, 3 hours)
- Bangalore → Kolar (90 km, 2 hours)
- Bangalore → Tumkur (70 km, 1.5 hours)
- Bangalore → Hosur (60 km, 1.25 hours)
- Bangalore → Kollegal (120 km, 2.5 hours)

Mysore → Kollegal (60 km, 1.25 hours)
Mysore → Srirangapatna (30 km, 45 min)
```

## Depot Admin Workflow

### 1. View Dashboard
```
Depot Admin Login → View Overview
├── See all drivers (active status, trip count)
├── See all buses (location, driver assigned, status)
└── See today's schedule (with trip status)
```

### 2. Manage Drivers
```
Change Driver for Trip:
- Select trip from today's schedule
- Choose available driver from same depot
- Confirm reassignment
- System updates driver_assignments & schedules
```

### 3. Update Schedule
```
Modify Timing:
- Select schedule to modify
- Update departure time
- Arrival time recalculated automatically
- System validates no driver conflicts
```

### 4. Add New Schedule
```
Create New Trip:
- Select route from available routes
- Enter departure/arrival time
- Select driver
- System creates bus + schedule
- Adds to assignments
```

## Seeding Script

Run the depot-based seeding:

```bash
node seed-depot-assignments.js
```

Output shows:
- Drivers assigned to depots
- Buses created per route
- Schedules with times
- Daily assignments with status

**Summary:**
```
📍 Bangalore Central Depot
   👥 Drivers: 1 | 🚌 Buses: 1 | 📊 Trips: 6
   ✅ Assigned: 2 | ⏳ In Progress: 0 | ✓ Completed: 4
```

## Key Features

✅ **Depot Isolation** - Each admin sees only their location
✅ **Driver Management** - Assign/reassign drivers
✅ **Bus Tracking** - View all buses and their status
✅ **Schedule Management** - Create, update, delete schedules
✅ **Travel Time Logic** - 5-min buffer enforced
✅ **Geographic Awareness** - Routes match with timing
✅ **Express & Normal** - Both route types supported
✅ **Real-time Status** - ASSIGNED/IN_PROGRESS/COMPLETED

## Authentication

All endpoints require:
```
Header: Authorization: Bearer <token>
User Role: depot_admin or super_admin
User depot_id: Must match the resource's depot_id
```

## Error Handling

### 403 Forbidden
```json
{
  "success": false,
  "message": "Assignment not found in your depot"
}
```

### 400 Bad Request
```json
{
  "success": false,
  "message": "Driver not found in your depot"
}
```

## Testing Depot Admin

Login as depot admin:
```
Username: admin_bangalore
Password: depot123
```

Should see:
- All Bangalore depot drivers
- All Bangalore depot buses
- All Bangalore routes
- Today's schedule for Bangalore

Can perform:
- View driver list with trip counts
- View bus list with assignments
- View today's schedule
- Change driver for a trip
- Update schedule times
- Create new schedule
