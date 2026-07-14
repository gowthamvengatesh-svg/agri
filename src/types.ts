export type Role = 'Farmer' | 'Admin' | 'Researcher';
export type ThemeMode = 'light' | 'dark';
export type RoverConnection = 'WiFi' | 'Bluetooth' | 'Mock';

export interface User {
  id: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface Field {
  id: string;
  name: string;
  owner: string;
  crop: string;
  length: number;
  width: number;
  samplingDistance: number;
  area: number;
  samplingPoints: number;
  estimatedSurveyTime: number;
  estimatedBattery: number;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
}

export interface SensorReading {
  id: string;
  fieldId: string;
  surveyId: string;
  pointIndex: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  moisture: number;
  temperature: number;
  ec: number;
  ph: number;
  gps: { lat: number; lng: number };
  time: string;
  soilHealth: number;
  synced: boolean;
}

export interface Survey {
  id: string;
  fieldId: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'stopped';
  startedAt: string;
  endedAt?: string;
  sampleCount: number;
  batteryStart: number;
  batteryEnd?: number;
  connection: RoverConnection;
  synced: boolean;
}

export interface Settings {
  id: 'settings';
  samplingDistance: number;
  units: 'Metric' | 'Imperial';
  darkMode: boolean;
  offlineSync: boolean;
  language: string;
}

export interface NotificationItem {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  createdAt: string;
}

export interface AIInput {
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  moisture: number;
  temperature: number;
  ph: number;
  ec: number;
  crop: string;
}

export interface AIResult {
  fertilizer: string;
  suitability: string;
  deficiency: string;
  soilHealthScore: number;
}
