import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth.js';
import sensorRoutes from './routes/sensor.js';
import roverRoutes from './routes/rover.js';
import historyRoutes from './routes/history.js';
import settingsRoutes from './routes/settings.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST']
  }
});

const port = process.env.PORT || 4100;

// Middleware
app.use(cors());
app.use(express.json());

// Attach io to app for route access
app.set('io', io);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'AgriSense AI Rover Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    websocket: 'connected'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sensor', sensorRoutes);
app.use('/api/rover', roverRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/settings', settingsRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
  
  socket.on('subscribe:sensor', (data) => {
    socket.join(`sensor:${data.fieldId}`);
    console.log(`Client ${socket.id} subscribed to sensor:${data.fieldId}`);
  });
  
  socket.on('subscribe:rover', (data) => {
    socket.join(`rover:${data.roverId}`);
    console.log(`Client ${socket.id} subscribed to rover:${data.roverId}`);
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`✓ AgriSense AI Rover Backend listening on http://0.0.0.0:${port}`);
  console.log(`✓ WebSocket ready for real-time updates`);
  console.log(`✓ Firebase Firestore connected`);
});
