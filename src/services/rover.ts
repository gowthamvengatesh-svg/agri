import { apiCall } from './api';
import type { RoverStatus, RoverConfig, SensorReading } from '../types';
import { soilHealthScore, uid } from '../lib/calculations';

export interface ManualCommandRequest {
  command: 'forward' | 'backward' | 'left' | 'right' | 'stop' | 'home';
  roverId?: string;
  duration?: number;
}

export interface SurveyStartRequest {
  fieldId: string;
  samplingPoints: number;
  roverId?: string;
}

export interface SurveyControlRequest {
  surveyId: string;
  roverId?: string;
}

export interface CommandResponse {
  ok: boolean;
  commandId: string;
  command: string;
  status: string;
}

// Get rover status
export async function getRoverStatus(roverId: string = 'primary'): Promise<RoverStatus> {
  return apiCall<RoverStatus>(`/rover/status/${roverId}`);
}

// Send manual command
export async function sendManualCommand(request: ManualCommandRequest): Promise<CommandResponse> {
  return apiCall<CommandResponse>('/rover/manual', {
    method: 'POST',
    body: JSON.stringify(request)
  });
}

// Alias for manual command matching App.tsx call signature
export async function moveManual(request: ManualCommandRequest): Promise<CommandResponse> {
  return sendManualCommand(request);
}

// Get live reading with fallback to offline mock readings
export async function getLiveReading(fieldId: string, surveyId: string, pointIndex: number, config?: RoverConfig): Promise<SensorReading> {
  try {
    const data = await apiCall<any>(`/sensor/latest/${fieldId}`);
    return normalizeReading(data, fieldId, surveyId, pointIndex);
  } catch {
    return normalizeReading(mockReading(), fieldId, surveyId, pointIndex);
  }
}

function normalizeReading(data: Record<string, any>, fieldId: string, surveyId: string, pointIndex: number): SensorReading {
  const reading = {
    id: uid('sample'),
    fieldId,
    surveyId,
    pointIndex,
    nitrogen: Number(data.nitrogen ?? data.NPK?.nitrogen ?? 62),
    phosphorus: Number(data.phosphorus ?? data.NPK?.phosphorus ?? 31),
    potassium: Number(data.potassium ?? data.NPK?.potassium ?? 120),
    moisture: Number(data.moisture ?? 38),
    temperature: Number(data.temperature ?? 28),
    ec: Number(data.ec ?? data.EC ?? 1.2),
    ph: Number(data.ph ?? 6.6),
    gps: data.gps ?? { lat: 17.385 + Math.random() * 0.005, lng: 78.4867 + Math.random() * 0.005 },
    time: data.time ?? new Date().toISOString(),
    soilHealth: 0,
    synced: false
  };
  return { ...reading, soilHealth: soilHealthScore(reading) };
}

function mockReading() {
  return {
    nitrogen: 45 + Math.round(Math.random() * 72),
    phosphorus: 18 + Math.round(Math.random() * 42),
    potassium: 70 + Math.round(Math.random() * 126),
    moisture: 22 + Math.round(Math.random() * 38),
    temperature: 23 + Math.round(Math.random() * 12),
    ec: Number((0.6 + Math.random() * 2).toFixed(2)),
    ph: Number((5.6 + Math.random() * 1.9).toFixed(1)),
    gps: { lat: 17.385 + Math.random() * 0.006, lng: 78.4867 + Math.random() * 0.006 },
    time: new Date().toISOString()
  };
}

// Forward
export async function moveForward(roverId?: string) {
  return sendManualCommand({ command: 'forward', roverId });
}

// Backward
export async function moveBackward(roverId?: string) {
  return sendManualCommand({ command: 'backward', roverId });
}

// Left
export async function turnLeft(roverId?: string) {
  return sendManualCommand({ command: 'left', roverId });
}

// Right
export async function turnRight(roverId?: string) {
  return sendManualCommand({ command: 'right', roverId });
}

// Stop
export async function stopRover(roverId?: string) {
  return sendManualCommand({ command: 'stop', roverId });
}

// Home
export async function returnHome(roverId?: string) {
  return sendManualCommand({ command: 'home', roverId });
}

// Start survey
export async function startSurvey(request: SurveyStartRequest): Promise<any> {
  return apiCall<any>('/rover/survey/start', {
    method: 'POST',
    body: JSON.stringify(request)
  });
}

// Stop survey
export async function stopSurvey(request: SurveyControlRequest): Promise<any> {
  return apiCall<any>('/rover/survey/stop', {
    method: 'POST',
    body: JSON.stringify(request)
  });
}

// Pause survey
export async function pauseSurvey(request: SurveyControlRequest): Promise<any> {
  return apiCall<any>('/rover/survey/pause', {
    method: 'POST',
    body: JSON.stringify(request)
  });
}

// Resume survey
export async function resumeSurvey(request: SurveyControlRequest): Promise<any> {
  return apiCall<any>('/rover/survey/resume', {
    method: 'POST',
    body: JSON.stringify(request)
  });
}
