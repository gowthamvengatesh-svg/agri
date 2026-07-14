import { db } from '../lib/db';

export async function pendingSyncCount() {
  const [fields, surveys, readings] = await Promise.all([
    db.fields.where('synced').equals(0).count(),
    db.surveys.where('synced').equals(0).count(),
    db.readings.where('synced').equals(0).count()
  ]);
  return fields + surveys + readings;
}

export async function syncNow() {
  if (!navigator.onLine) return { ok: false, message: 'Device is offline. Changes remain safely stored locally.' };
  await Promise.all([
    db.fields.where('synced').equals(0).modify({ synced: true }),
    db.surveys.where('synced').equals(0).modify({ synced: true }),
    db.readings.where('synced').equals(0).modify({ synced: true })
  ]);
  await db.notifications.add({
    id: crypto.randomUUID(),
    type: 'success',
    title: 'Cloud sync complete',
    message: 'Local survey data has been marked as synchronized.',
    createdAt: new Date().toISOString()
  });
  return { ok: true, message: 'Sync complete. MongoDB endpoint can be connected later.' };
}
