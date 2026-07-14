import type { SensorReading } from '../types';
import { soilHealthScore, uid } from '../lib/calculations';

export async function getLiveReading(fieldId: string, surveyId: string, pointIndex: number): Promise<SensorReading> {
  try {
    const response = await fetch('/api/live', { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      return normalizeReading(data, fieldId, surveyId, pointIndex);
    }
  } catch {
    // Offline-first mock mode is the default fallback.
  }
  return normalizeReading(mockReading(), fieldId, surveyId, pointIndex);
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
