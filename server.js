const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Make io accessible in routes
app.set('io', io);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/buses', require('./routes/buses'));
app.use('/api/routes', require('./routes/routes'));
app.use('/api/schedules', require('./routes/schedules'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/passes', require('./routes/passes'));
app.use('/api/depots', require('./routes/depots'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/tracking', require('./routes/tracking'));
app.use('/api/route-stops', require('./routes/route-stops'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/drivers', require('./routes/drivers'));
app.use('/api/bus-tracking', require('./routes/bus-tracking'));

app.use('/api/depot', require('./routes/depot-management'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('✅ New client connected:', socket.id);

  // Driver joins their bus room
  socket.on('driverJoin', (busId) => {
    socket.join(`bus_${busId}`);
    console.log(`Driver joined bus ${busId}`);
  });

  // User tracks a specific bus
  socket.on('trackBus', (busId) => {
    socket.join(`bus_${busId}`);
    console.log(`User tracking bus ${busId}`);
  });

  // User tracks a route
  socket.on('trackRoute', (routeId) => {
    socket.join(`route_${routeId}`);
    console.log(`User tracking route ${routeId}`);
  });

  // Driver sends location update
  socket.on('locationUpdate', (data) => {
    const { busId, latitude, longitude, status, crowdLevel, nextStop } = data;
    
    // Broadcast to all users tracking this bus
    io.to(`bus_${busId}`).emit('busLocationUpdate', {
      busId,
      latitude,
      longitude,
      status,
      crowdLevel,
      nextStop,
      timestamp: new Date()
    });

    console.log(`Location update for bus ${busId}`);
  });

  // Leave tracking
  socket.on('stopTracking', (id) => {
    socket.leave(`bus_${id}`);
    socket.leave(`route_${id}`);
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log('================================================');
  console.log(`🚀 KSRTC Backend Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🔗 API URL: http://${HOST}:${PORT}/api`);
  console.log(`🏥 Health check: http://${HOST}:${PORT}/api/health`);
  console.log('================================================');
}).on('error', (err) => {
  console.error('Server error:', err);
});

module.exports = { app, io };
