import { apiCall, publicApiCall } from './api';
import type { SensorReading } from '../types';

export interface SensorReadingResponse {
  count: number;
  readings: SensorReading[];
}

// Send sensor reading from ESP32 (public endpoint)
export async function sendSensorReading(data: {
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  moisture: number;
  temperature?: number;
  battery?: number;
  fieldId?: string;
  surveyId?: string;
  pointIndex?: number;
}) {
  return publicApiCall<{ ok: boolean; reading: SensorReading }>('/sensor/live', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

// Get sensor readings by field
export async function getFieldReadings(fieldId: string, limit: number = 100): Promise<SensorReadingResponse> {
  return apiCall<SensorReadingResponse>(`/sensor/field/${fieldId}?limit=${limit}`);
}

// Get sensor readings by survey
export async function getSurveyReadings(surveyId: string): Promise<SensorReadingResponse> {
  return apiCall<SensorReadingResponse>(`/sensor/survey/${surveyId}`);
}

// Get latest sensor reading
export async function getLatestReading(fieldId: string): Promise<SensorReading> {
  return apiCall<SensorReading>(`/sensor/latest/${fieldId}`);
}

// Subscribe to real-time sensor updates (used by Socket.IO service)
export function subscribeToSensorUpdates(fieldId: string, callback: (reading: SensorReading) => void) {
  // This is handled by the socket service
  // Placeholder for direct subscription
  console.log(`Subscribed to sensor updates for field: ${fieldId}`);
}
