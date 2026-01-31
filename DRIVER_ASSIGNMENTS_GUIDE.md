# Driver Assignment System - Smart Travel Time Management

## Overview

The system now implements **intelligent driver scheduling** that respects real travel times and displays all bus stops for non-express routes.

## Key Features Implemented

### 1. **Travel Time Awareness** ⏳

- When a driver completes a trip from **Bangalore → Mysore (departing 11:00, arriving ~14:00)**
- The driver **cannot take another trip** at **11:15 from Bangalore → Kollegal**
- Must wait for the previous trip to complete (14:00) + **5-minute cooldown buffer**
- Next trip can start at **14:05 or later**

**How it works:**
- System calculates: `departure_time + travel_duration` = trip end time
- Adds 5-minute buffer to ensure driver has rest
- Only assigns next trip if its departure time ≥ (last trip end + 5 mins)

### 2. **Express vs Non-Express Routes** 🚌⚡

#### EXPRESS Routes (Direct)
- No intermediate stops
- Direct travel from origin to destination
- Example: "Bangalore → Tumkur" (2 hours, no stops)
- Display: `⚡ EXPRESS` with only origin and destination

#### NORMAL Routes (All Stops)
- Stops at all intermediate stations
- Driver must manage boarding/alighting at each stop
- Example: "Bangalore → Mysore" stops at:
  1. Bangalore (04:30)
  2. Bidadi (04:55)
  3. Ramanagara (05:21)
  4. Channapatna (05:47)
  5. Maddur (06:12)
  6. Mandya (06:38)
  7. Mysore (07:04)
- Display: `🚌 NORMAL` with all stop names and estimated times

### 3. **Mixed Route Assignment** 🔄

Drivers get a balanced mix of both types:
- **Express routes** for fast intercity travel (2-3 hours)
- **Normal routes** with multiple stops (longer duration but strategic locations)

This ensures:
- Drivers maintain skills on both route types
- Better utilization of driver expertise
- Realistic scheduling considering different route demands

## API Endpoints

### GET `/assignments/driver/assignments`
Returns driver's upcoming assignments with stops

**Response Example:**
```json
{
  "success": true,
  "data": [
    {
      "assignment_id": 1,
      "driver_id": 102,
      "bus_number": "KA-1000",
      "bus_type": "NORMAL",
      "origin": "Bangalore",
      "destination": "Mysore",
      "departure_time": "04:30:00",
      "arrival_time": "07:30:00",
      "assigned_date": "2026-01-16",
      "status": "COMPLETED",
      "total_stops": 7,
      "stops": [
        {
          "id": 1,
          "stop_name": "Bangalore",
          "stop_order": 1,
          "estimated_minutes_from_origin": 0
        },
        {
          "id": 2,
          "stop_name": "Bidadi",
          "stop_order": 2,
          "estimated_minutes_from_origin": 25
        }
        // ... more stops
      ]
    }
  ]
}
```

### GET `/assignments/driver/assignment/:assignmentId`
Returns detailed trip info with all stops and tracking

**Response includes:**
- Trip details (departure, arrival, duration)
- All stops with estimated times
- Current tracking status
- Passenger info

## Database Queries Reference

### Get Driver's Assignments with Stops

```sql
SELECT da.id as assignment_id,
  da.driver_id, da.assigned_date, da.status,
  s.id as schedule_id, s.departure_time, s.arrival_time,
  b.bus_number, b.bus_type, b.capacity,
  r.id as route_id, r.origin, r.destination, r.distance, r.estimated_duration
FROM driver_assignments da
JOIN schedules s ON da.schedule_id = s.id
JOIN buses b ON da.bus_id = b.id
JOIN routes r ON s.route_id = r.id
WHERE da.driver_id = ? 
  AND da.assigned_date >= CURDATE()
ORDER BY da.assigned_date, s.departure_time;
```

### Get All Stops for a Route

```sql
SELECT id, stop_name, stop_order, estimated_minutes_from_origin, 
       latitude, longitude
FROM route_stops
WHERE route_id = ?
ORDER BY stop_order;
```

## Travel Time Calculation Example

For a Bangalore → Mysore trip assigned at 11:00:

```
Trip Details:
- Departure: 11:00
- Arrival: 14:00
- Duration: 3 hours

Travel Time Timeline:
11:00 ─── Bus departs Bangalore
11:25 ─── Stop at Bidadi (25 min from start)
11:51 ─── Stop at Ramanagara (51 min from start)
12:17 ─── Stop at Channapatna (77 min from start)
12:42 ─── Stop at Maddur (102 min from start)
13:08 ─── Stop at Mandya (128 min from start)
14:00 ─── Arrive Mysore

Trip Ends: 14:00
5-min Buffer: 14:05
Next Trip Can Start: 14:05 or later
```

## Data Structure

### Route Stops Table
```sql
CREATE TABLE route_stops (
  id INT AUTO_INCREMENT PRIMARY KEY,
  route_id VARCHAR(20),
  stop_name VARCHAR(100),
  stop_order INT,
  estimated_minutes_from_origin INT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8)
);
```

### Driver Assignments Table
```sql
CREATE TABLE driver_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  driver_id INT,
  schedule_id INT,
  bus_id INT,
  assigned_date DATE,
  status ENUM('ASSIGNED','IN_PROGRESS','COMPLETED'),
  created_at TIMESTAMP
);
```

## Seeding Script

Run the smart assignment seeder:

```bash
node seed-driver-assignments-smart.js
```

Features:
- ✅ Generates 7 days past + 3 days future assignments
- ✅ Respects 5-minute travel buffer between trips
- ✅ Assigns both EXPRESS and NORMAL routes to drivers
- ✅ Calculates proper trip status (COMPLETED, IN_PROGRESS, ASSIGNED)
- ✅ Creates 2260+ assignments per day across 15 drivers

## Testing

Run the test script to verify the system:

```bash
node test-driver-assignments.js
```

This displays:
- Driver's next 10 assignments
- All stops for each NORMAL route
- Travel times and cooldown logic
- Today's complete schedule

## Status Values

- **ASSIGNED** - Trip scheduled for future
- **IN_PROGRESS** - Currently running (current hour)
- **COMPLETED** - Past trip (already finished)

## Key Points

✅ **No overlapping assignments** - Travel time fully respected  
✅ **Realistic scheduling** - Same-day trips have proper gaps  
✅ **Clear route information** - Drivers see all stops before trip  
✅ **Mixed assignments** - Both express and normal routes  
✅ **Estimated times** - Each stop has calculated ETA  
✅ **Driver-friendly** - 5-minute buffer prevents exhaustion
