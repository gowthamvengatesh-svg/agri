export type Role = 'Farmer' | 'Admin' | 'Researcher';
export type ThemeMode = 'light' | 'dark';
export type RoverConnection = 'WiFi' | 'Bluetooth' | 'Offline';

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

export interface SensorAvailability {
  npk: boolean;
  moisture: boolean;
  gps: boolean;
  ph: boolean;
  ec: boolean;
  temperature: boolean;
  camera?: boolean;
}

export interface RoverConfig {
  id: 'primary';
  name: string;
  ipAddress: string;
  connectionType: RoverConnection;
  rememberDevice: boolean;
  autoConnect: boolean;
  connected: boolean;
  lastConnectedAt?: string;
  updatedAt: string;
}

export interface RoverStatus {
  connected: boolean;
  battery: number;
  firmwareVersion: string;
  ipAddress: string;
  wifiSignal: number;
  gpsStatus: 'Locked' | 'Searching' | 'Offline';
  motorStatus: 'Ready' | 'Moving' | 'Stopped' | 'Offline';
  currentSurvey?: string;
  currentSamplingPoint: number;
  movementStatus: string;
  sensors: SensorAvailability;
  diagnostics: Record<string, 'Healthy' | 'Warning' | 'Offline' | 'Not Installed'>;
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
  autoSave: boolean;
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
  crop: string;
}

export interface AIResult {
  fertilizer: string;
  suitability: string;
  deficiency: string;
  soilHealthScore: number;
  quantity: string;
  irrigation: string;
  suitableCrops: string;
  confidence: number;
  basis: string;
}
