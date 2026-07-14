import type { RoverConfig, RoverStatus, SensorReading } from '../types';
import { soilHealthScore, uid } from '../lib/calculations';

type ManualCommand = 'forward' | 'backward' | 'left' | 'right' | 'stop' | 'home';

const defaultSensors = {
  npk: true,
  moisture: true,
  gps: true,
  ph: false,
  ec: false,
  temperature: false
};

export function roverBaseUrl(config?: RoverConfig) {
  if (!config?.ipAddress || config.connectionType !== 'WiFi') return '';
  const value = config.ipAddress.trim();
  if (!value) return '';
  return value.startsWith('http://') || value.startsWith('https://') ? value.replace(/\/$/, '') : `http://${value}`;
}

export async function getRoverStatus(config?: RoverConfig): Promise<RoverStatus> {
  const fallback = offlineStatus(config);
  const data = await roverRequest<Record<string, any>>(config, '/api/status', { method: 'GET' }, fallback);
  return normalizeStatus(data, config);
}

export async function getLiveReading(fieldId: string, surveyId: string, pointIndex: number, config?: RoverConfig): Promise<SensorReading> {
  const data = await roverRequest<Record<string, any>>(config, '/api/live', { method: 'GET' }, offlineReading(config));
  return normalizeReading(data, fieldId, surveyId, pointIndex);
}

export async function startRoverSurvey(config?: RoverConfig) {
  return roverRequest(config, '/api/start', { method: 'POST' }, { ok: false, mode: 'offline' });
}

export async function pauseRoverSurvey(config?: RoverConfig) {
  return roverRequest(config, '/api/pause', { method: 'POST' }, { ok: false, mode: 'offline' });
}

export async function resumeRoverSurvey(config?: RoverConfig) {
  return roverRequest(config, '/api/resume', { method: 'POST' }, { ok: false, mode: 'offline' });
}

export async function stopRoverSurvey(config?: RoverConfig) {
  return roverRequest(config, '/api/stop', { method: 'POST' }, { ok: false, mode: 'offline' });
}

export async function sendManualCommand(config: RoverConfig | undefined, command: ManualCommand) {
  return roverRequest(
    config,
    '/api/manual',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    },
    { ok: false, command, movementStatus: 'Offline mode' }
  );
}

async function roverRequest<T>(config: RoverConfig | undefined, path: string, init: RequestInit, fallback: T): Promise<T> {
  const baseUrl = roverBaseUrl(config);
  if (!baseUrl || config?.connected === false) return fallback;
  try {
    const response = await fetch(`${baseUrl}${path}`, { ...init, cache: 'no-store' });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

function normalizeStatus(data: Record<string, any>, config?: RoverConfig): RoverStatus {
  const sensors = { ...defaultSensors, ...(data.sensors ?? {}) };
  const connected = Boolean(data.connected ?? config?.connected);
  return {
    connected,
    battery: Number(data.battery ?? 0),
    firmwareVersion: String(data.firmwareVersion ?? data.firmware ?? 'Unavailable'),
    ipAddress: String(data.ipAddress ?? config?.ipAddress ?? 'Not configured'),
    wifiSignal: Number(data.wifiSignal ?? data.rssi ?? 0),
    gpsStatus: data.gpsStatus ?? (sensors.gps && connected ? 'Searching' : 'Offline'),
    motorStatus: data.motorStatus ?? (connected ? 'Ready' : 'Offline'),
    currentSurvey: data.currentSurvey,
    currentSamplingPoint: Number(data.currentSamplingPoint ?? 0),
    movementStatus: String(data.movementStatus ?? (connected ? 'Idle' : 'Offline mode')),
    sensors,
    diagnostics: {
      ESP32: connected ? 'Healthy' : 'Offline',
      'NPK Sensor': sensors.npk ? statusFrom(data.diagnostics?.npk, connected) : 'Not Installed',
      'Moisture Sensor': sensors.moisture ? statusFrom(data.diagnostics?.moisture, connected) : 'Not Installed',
      GPS: sensors.gps ? statusFrom(data.diagnostics?.gps, connected) : 'Not Installed',
      Motors: statusFrom(data.diagnostics?.motors, connected),
      Battery: Number(data.battery ?? 0) < 25 && connected ? 'Warning' : statusFrom(data.diagnostics?.battery, connected),
      'Wi-Fi': connected ? statusFrom(data.diagnostics?.wifi, connected) : 'Offline',
      pH: sensors.ph ? statusFrom(data.diagnostics?.ph, connected) : 'Not Installed',
      EC: sensors.ec ? statusFrom(data.diagnostics?.ec, connected) : 'Not Installed',
      Temperature: sensors.temperature ? statusFrom(data.diagnostics?.temperature, connected) : 'Not Installed'
    }
  };
}

function statusFrom(value: unknown, connected: boolean) {
  if (value === 'Healthy' || value === 'Warning' || value === 'Offline' || value === 'Not Installed') return value;
  return connected ? 'Healthy' : 'Offline';
}

function normalizeReading(data: Record<string, any>, fieldId: string, surveyId: string, pointIndex: number): SensorReading {
  const reading = {
    id: uid('sample'),
    fieldId,
    surveyId,
    pointIndex,
    nitrogen: Number(data.nitrogen ?? data.NPK?.nitrogen ?? 0),
    phosphorus: Number(data.phosphorus ?? data.NPK?.phosphorus ?? 0),
    potassium: Number(data.potassium ?? data.NPK?.potassium ?? 0),
    moisture: Number(data.moisture ?? 0),
    temperature: Number(data.temperature ?? 0),
    ec: Number(data.ec ?? data.EC ?? 0),
    ph: Number(data.ph ?? 0),
    gps: data.gps ?? { lat: 0, lng: 0 },
    time: data.time ?? new Date().toISOString(),
    soilHealth: 0,
    synced: false
  };
  return {
    ...reading,
    soilHealth: soilHealthScore({
      nitrogen: reading.nitrogen,
      phosphorus: reading.phosphorus,
      potassium: reading.potassium,
      moisture: reading.moisture
    })
  };
}

function offlineStatus(config?: RoverConfig): RoverStatus {
  return normalizeStatus(
    {
      connected: false,
      battery: 0,
      firmwareVersion: 'Unavailable',
      ipAddress: config?.ipAddress || 'Not configured',
      wifiSignal: 0,
      sensors: defaultSensors
    },
    config
  );
}

function offlineReading(config?: RoverConfig) {
  if (config?.connected) {
    return {
      nitrogen: 0,
      phosphorus: 0,
      potassium: 0,
      moisture: 0,
      gps: { lat: 0, lng: 0 },
      time: new Date().toISOString()
    };
  }
  return {
    nitrogen: 45 + Math.round(Math.random() * 72),
    phosphorus: 18 + Math.round(Math.random() * 42),
    potassium: 70 + Math.round(Math.random() * 126),
    moisture: 22 + Math.round(Math.random() * 38),
    gps: { lat: 0, lng: 0 },
    time: new Date().toISOString()
  };
}
