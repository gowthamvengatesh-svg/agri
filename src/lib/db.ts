import Dexie, { type Table } from 'dexie';
import type { Field, NotificationItem, SensorReading, Settings, Survey, User } from '../types';
import { computeField, soilHealthScore, uid } from './calculations';

class AgriSenseDB extends Dexie {
  users!: Table<User, string>;
  fields!: Table<Field, string>;
  surveys!: Table<Survey, string>;
  readings!: Table<SensorReading, string>;
  settings!: Table<Settings, string>;
  notifications!: Table<NotificationItem, string>;

  constructor() {
    super('agrisense-ai-rover');
    this.version(1).stores({
      users: 'id, role',
      fields: 'id, owner, crop, synced, updatedAt',
      surveys: 'id, fieldId, status, synced, startedAt',
      readings: 'id, fieldId, surveyId, pointIndex, synced, time',
      settings: 'id',
      notifications: 'id, createdAt, type'
    });
  }
}

export const db = new AgriSenseDB();

export async function seedDatabase() {
  const userCount = await db.users.count();
  if (!userCount) {
    await db.users.bulkAdd([
      { id: uid('user'), name: 'Asha Patel', role: 'Farmer', createdAt: new Date().toISOString() },
      { id: uid('user'), name: 'Dr. Meera Rao', role: 'Researcher', createdAt: new Date().toISOString() },
      { id: uid('user'), name: 'Admin Console', role: 'Admin', createdAt: new Date().toISOString() }
    ]);
  }

  const settings = await db.settings.get('settings');
  if (!settings) {
    await db.settings.put({ id: 'settings', samplingDistance: 12, units: 'Metric', darkMode: false, offlineSync: true, language: 'English' });
  }

  const fieldCount = await db.fields.count();
  if (!fieldCount) {
    const base = [
      { name: 'North Paddy Block', owner: 'Asha Patel', crop: 'Rice', length: 120, width: 86, samplingDistance: 12 },
      { name: 'Greenhouse Trial A', owner: 'Dr. Meera Rao', crop: 'Tomato', length: 64, width: 42, samplingDistance: 8 },
      { name: 'Millet Ridge', owner: 'Asha Patel', crop: 'Millet', length: 180, width: 96, samplingDistance: 16 }
    ];
    const fields = base.map((field) => ({
      ...field,
      ...computeField(field),
      id: uid('field'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      synced: false
    }));
    await db.fields.bulkAdd(fields);
    await seedReadings(fields[0]);
  }
}

async function seedReadings(field: Field) {
  const surveyId = uid('survey');
  await db.surveys.add({
    id: surveyId,
    fieldId: field.id,
    status: 'completed',
    startedAt: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
    endedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    sampleCount: 24,
    batteryStart: 96,
    batteryEnd: 74,
    connection: 'Mock',
    synced: false
  });
  const readings: SensorReading[] = Array.from({ length: 24 }, (_, index) => {
    const reading = {
      id: uid('sample'),
      fieldId: field.id,
      surveyId,
      pointIndex: index + 1,
      nitrogen: 48 + Math.round(Math.random() * 58),
      phosphorus: 18 + Math.round(Math.random() * 36),
      potassium: 78 + Math.round(Math.random() * 92),
      moisture: 24 + Math.round(Math.random() * 30),
      temperature: 24 + Math.round(Math.random() * 9),
      ec: Number((0.7 + Math.random() * 1.7).toFixed(2)),
      ph: Number((5.8 + Math.random() * 1.6).toFixed(1)),
      gps: { lat: 17.385 + (index % 6) * 0.0008, lng: 78.4867 + Math.floor(index / 6) * 0.0008 },
      time: new Date(Date.now() - (24 - index) * 1000 * 90).toISOString(),
      soilHealth: 0,
      synced: false
    };
    return { ...reading, soilHealth: soilHealthScore(reading) };
  });
  await db.readings.bulkAdd(readings);
}
