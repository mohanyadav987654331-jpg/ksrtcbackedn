# KSRTC Backend API

Node.js/Express REST API with WebSocket support for real-time bus tracking.

## 🚀 Quick Start

### Prerequisites
- Node.js >= 16.0.0
- MySQL 8.0
- npm or yarn

### Installation

```powershell
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Configure environment
# Copy .env.example to .env and update values
cp .env.example .env

# Ensure MySQL database is running and schema is imported
# (Run database/schema.sql and database/sample_data.sql from project root)

# Start server
npm start

# For development with auto-reload
npm run dev
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login (all roles)
- `GET /api/auth/verify` - Verify token

### Buses
- `GET /api/buses` - Get all buses (with filters)
- `GET /api/buses/:id` - Get bus by ID
- `GET /api/buses/route/:routeId` - Get buses on a route
- `PUT /api/buses/:id/location` - Update bus location (Driver)
- `PUT /api/buses/:id/status` - Update bus status (Admin)
- `PUT /api/buses/:id/driver` - Assign driver (Admin)

### Routes
- `GET /api/routes` - Get all routes
- `GET /api/routes/:id` - Get route by ID
- `GET /api/routes/:id/stops` - Get route stops
- `GET /api/routes/nearby/:lat/:lng` - Get nearby stops

### Schedules
- `GET /api/schedules` - Get schedules (with filters)
- `GET /api/schedules/:id` - Get schedule by ID
- `POST /api/schedules` - Create schedule (Admin)
- `PUT /api/schedules/:id` - Update schedule (Admin)
- `DELETE /api/schedules/:id` - Delete schedule (Admin)

### Feedback
- `GET /api/feedback` - Get all feedback (Admin)
- `GET /api/feedback/my` - Get user's feedback
- `POST /api/feedback` - Submit feedback
- `PUT /api/feedback/:id/respond` - Respond to feedback (Admin)

### Passes
- `GET /api/passes/my` - Get user's passes
- `GET /api/passes/:id` - Get pass by ID
- `POST /api/passes` - Purchase pass
- `GET /api/passes/validate/:passId` - Validate pass

## 🔌 WebSocket Events

### Client -> Server
- `driverJoin(busId)` - Driver joins bus room
- `trackBus(busId)` - User tracks a bus
- `trackRoute(routeId)` - User tracks a route
- `locationUpdate({ busId, latitude, longitude, status, crowdLevel, nextStop })` - Driver sends location
- `stopTracking(id)` - Stop tracking bus/route

### Server -> Client
- `busLocationUpdate({ busId, latitude, longitude, status, crowdLevel, nextStop, timestamp })` - Real-time location update

## 🔐 Authentication

All protected routes require a Bearer token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Roles
- `USER` - Regular users (track buses, buy passes, give feedback)
- `DEPOT` - Depot admins (manage buses, drivers, schedules)
- `DRIVER` - Bus drivers (update location, trip status)
- `SUPER_ADMIN` - System admins (full access)

## 📝 Example Requests

### Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "phone": "9876543210",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123",
    "role": "USER"
  }'
```

### Get Buses (with auth)
```bash
curl http://localhost:3000/api/buses \
  -H "Authorization: Bearer <your_token>"
```

### Update Bus Location (Driver)
```bash
curl -X PUT http://localhost:3000/api/buses/1/location \
  -H "Authorization: Bearer <driver_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 12.9716,
    "longitude": 77.5946,
    "status": "ON_TIME",
    "crowdLevel": 45,
    "nextStop": "Silk Board"
  }'
```

## 🧪 Testing

```powershell
# Health check
curl http://localhost:3000/api/health

# Should return: {"status":"ok","timestamp":"..."}
```

## 📁 Project Structure

```
backend/
├── config/
│   └── database.js          # MySQL connection pool
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── routes/
│   ├── auth.js              # Authentication endpoints
│   ├── buses.js             # Bus management
│   ├── routes.js            # Route information
│   ├── schedules.js         # Schedule management
│   ├── feedback.js          # Feedback system
│   └── passes.js            # Pass management
├── server.js                # Express + Socket.IO server
├── package.json             # Dependencies
├── .env                     # Environment variables
└── README.md                # This file
```

## 🔧 Environment Variables

See `.env.example` for all configuration options.

Key variables:
- `PORT` - Server port (default: 3000)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - MySQL config
- `JWT_SECRET` - Secret key for JWT signing
- `JWT_EXPIRES_IN` - Token expiration time

## 🚨 Error Handling

All endpoints return standard error responses:

```json
{
  "error": "Error message"
}
```

Status codes:
- `200` - Success
- `201` - Created
- `400` - Bad request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not found
- `500` - Server error

## 📊 WebSocket Connection (Flutter)

```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

IO.Socket socket = IO.io('http://localhost:3000', <String, dynamic>{
  'transports': ['websocket'],
  'autoConnect': false,
});

socket.connect();

// Track a bus
socket.emit('trackBus', busId);

// Listen for updates
socket.on('busLocationUpdate', (data) {
  print('Bus location: ${data['latitude']}, ${data['longitude']}');
});
```

## 🛡️ Security Notes

- Change `JWT_SECRET` in production
- Use HTTPS in production
- Configure CORS properly for production
- Sanitize all user inputs
- Use environment variables for sensitive data
- Never commit `.env` file to version control

---

**Status**: Ready for integration with Flutter app
