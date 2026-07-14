import { db } from '../lib/db';

export async function exportBackup() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    users: await db.users.toArray(),
    fields: await db.fields.toArray(),
    surveys: await db.surveys.toArray(),
    readings: await db.readings.toArray(),
    settings: await db.settings.toArray()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `agrisense-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function restoreBackup(file: File) {
  const payload = JSON.parse(await file.text());
  await db.transaction('rw', db.users, db.fields, db.surveys, db.readings, db.settings, async () => {
    await Promise.all([db.users.clear(), db.fields.clear(), db.surveys.clear(), db.readings.clear(), db.settings.clear()]);
    await db.users.bulkPut(payload.users ?? []);
    await db.fields.bulkPut(payload.fields ?? []);
    await db.surveys.bulkPut(payload.surveys ?? []);
    await db.readings.bulkPut(payload.readings ?? []);
    await db.settings.bulkPut(payload.settings ?? []);
  });
}
