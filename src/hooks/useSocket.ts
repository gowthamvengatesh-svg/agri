import { useEffect, useState, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import {
  initSocket,
  disconnectSocket,
  subscribeToSensor,
  subscribeToRover,
  unsubscribeFromSensor,
  unsubscribeFromRover,
  isSocketConnected
} from '../services/socket';
import type { SensorReading, RoverStatus } from '../types';

export interface UseSocketOptions {
  onSensorReading?: (reading: SensorReading) => void;
  onRoverStatus?: (status: RoverStatus) => void;
  onSurveyStarted?: (data: any) => void;
  onSurveyStopped?: (data: any) => void;
  onAlert?: (alert: any) => void;
  autoConnect?: boolean;
}

export function useSocket(options: UseSocketOptions = {}) {
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const subscribedFieldsRef = useRef<Set<string>>(new Set());
  const subscribedRoversRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!options.autoConnect) return;

    const socketInstance = initSocket({
      onConnected: () => setConnected(true),
      onDisconnected: () => setConnected(false),
      onSensorReading: options.onSensorReading,
      onRoverStatus: options.onRoverStatus,
      onSurveyStarted: options.onSurveyStarted,
      onSurveyStopped: options.onSurveyStopped,
      onAlert: options.onAlert
    });

    setSocket(socketInstance);

    return () => {
      disconnectSocket();
    };
  }, [options.autoConnect]);

  const subscribe = useCallback((type: 'sensor' | 'rover', id: string) => {
    if (!isSocketConnected()) {
      console.warn('Socket not connected');
      return;
    }

    if (type === 'sensor') {
      if (!subscribedFieldsRef.current.has(id)) {
        subscribeToSensor(id);
        subscribedFieldsRef.current.add(id);
      }
    } else if (type === 'rover') {
      if (!subscribedRoversRef.current.has(id)) {
        subscribeToRover(id);
        subscribedRoversRef.current.add(id);
      }
    }
  }, []);

  const unsubscribe = useCallback((type: 'sensor' | 'rover', id: string) => {
    if (type === 'sensor') {
      if (subscribedFieldsRef.current.has(id)) {
        unsubscribeFromSensor(id);
        subscribedFieldsRef.current.delete(id);
      }
    } else if (type === 'rover') {
      if (subscribedRoversRef.current.has(id)) {
        unsubscribeFromRover(id);
        subscribedRoversRef.current.delete(id);
      }
    }
  }, []);

  return {
    socket,
    connected,
    subscribe,
    unsubscribe
  };
}
