import { io, Socket } from 'socket.io-client';
import type { SensorReading, RoverStatus } from '../types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4100';

let socket: Socket | null = null;

export interface SocketListeners {
  onSensorReading?: (reading: SensorReading) => void;
  onRoverStatus?: (status: RoverStatus) => void;
  onSurveyStarted?: (data: any) => void;
  onSurveyStopped?: (data: any) => void;
  onAlert?: (alert: any) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
}

// Initialize Socket.IO connection
export function initSocket(listeners: SocketListeners): Socket | null {
  if (socket) return socket;

  // Skip local socket connection if running on production HTTPS origin without a custom socket URL
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && SOCKET_URL.includes('localhost')) {
    return null;
  }

  socket = io(SOCKET_URL, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
  });

  socket.on('connect', () => {
    console.log('✓ Socket.IO connected');
    listeners.onConnected?.();
  });

  socket.on('disconnect', () => {
    console.log('✗ Socket.IO disconnected');
    listeners.onDisconnected?.();
  });

  socket.on('sensor:reading', (reading: SensorReading) => {
    console.log('📊 Sensor reading received:', reading);
    listeners.onSensorReading?.(reading);
  });

  socket.on('rover:status', (status: RoverStatus) => {
    console.log('🤖 Rover status received:', status);
    listeners.onRoverStatus?.(status);
  });

  socket.on('survey:started', (data: any) => {
    console.log('🚀 Survey started:', data);
    listeners.onSurveyStarted?.(data);
  });

  socket.on('survey:stopped', (data: any) => {
    console.log('⏹️ Survey stopped:', data);
    listeners.onSurveyStopped?.(data);
  });

  socket.on('alert', (alert: any) => {
    console.log('⚠️ Alert received:', alert);
    listeners.onAlert?.(alert);
  });

  socket.on('error', (error: string) => {
    console.error('Socket error:', error);
    listeners.onError?.(error);
  });

  return socket;
}

// Get existing socket
export function getSocket(): Socket | null {
  return socket;
}

// Disconnect socket
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Subscribe to sensor updates
export function subscribeToSensor(fieldId: string) {
  if (!socket) return;
  socket.emit('subscribe:sensor', { fieldId });
}

// Subscribe to rover updates
export function subscribeToRover(roverId: string = 'primary') {
  if (!socket) return;
  socket.emit('subscribe:rover', { roverId });
}

// Unsubscribe from sensor
export function unsubscribeFromSensor(fieldId: string) {
  if (!socket) return;
  socket.emit('unsubscribe:sensor', { fieldId });
}

// Unsubscribe from rover
export function unsubscribeFromRover(roverId: string = 'primary') {
  if (!socket) return;
  socket.emit('unsubscribe:rover', { roverId });
}

// Check if socket is connected
export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}
