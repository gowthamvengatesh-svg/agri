import Dexie, { type Table } from 'dexie';
import type { Field, NotificationItem, SensorReading, Settings, Survey, User } from '../types';
import { uid } from './calculations';

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

export async function initializeDatabase() {
  const userCount = await db.users.count();
  if (!userCount) {
    await db.users.bulkAdd([
      { id: uid('user'), name: 'Farmer', role: 'Farmer', createdAt: new Date().toISOString() },
      { id: uid('user'), name: 'Researcher', role: 'Researcher', createdAt: new Date().toISOString() },
      { id: uid('user'), name: 'Admin', role: 'Admin', createdAt: new Date().toISOString() }
    ]);
  }

  const settings = await db.settings.get('settings');
  if (!settings) {
    await db.settings.put({ id: 'settings', samplingDistance: 12, units: 'Metric', darkMode: false, offlineSync: true, language: 'English' });
  }
}
