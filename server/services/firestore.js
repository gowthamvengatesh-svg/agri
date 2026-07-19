import { db } from '../config/firebase.js';

export const FirestoreCollections = {
  USERS: 'users',
  SURVEYS: 'surveys',
  SENSOR_READINGS: 'sensorReadings',
  ROVER_STATUS: 'roverStatus',
  COMMANDS: 'commands',
  ALERTS: 'alerts'
};

// User operations
export async function getUserProfile(userId) {
  const doc = await db.collection(FirestoreCollections.USERS).doc(userId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function createUserProfile(userId, { name, email, role }) {
  const userData = {
    id: userId,
    name,
    email,
    role, // 'Farmer', 'Researcher', 'Admin'
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: {
      samplingDistance: 5,
      darkMode: false,
      autoConnect: true,
      esp32IP: '',
      wifiMode: 'WiFi'
    }
  };
  await db.collection(FirestoreCollections.USERS).doc(userId).set(userData);
  return userData;
}

export async function updateUserSettings(userId, settings) {
  const user = await db.collection(FirestoreCollections.USERS).doc(userId).get();
  if (!user.exists) {
    throw new Error('User not found');
  }
  
  const currentSettings = user.data().settings || {};
  const mergedSettings = { ...currentSettings, ...settings };
  
  await db.collection(FirestoreCollections.USERS).doc(userId).update({
    settings: mergedSettings,
    updatedAt: new Date().toISOString()
  });
  
  return mergedSettings;
}

export async function getUserSettings(userId) {
  const doc = await db.collection(FirestoreCollections.USERS).doc(userId).get();
  if (!doc.exists) {
    throw new Error('User not found');
  }
  
  const userData = doc.data();
  return userData.settings || {};
}

// Sensor reading operations
export async function saveSensorReading(reading) {
  const docRef = db.collection(FirestoreCollections.SENSOR_READINGS).doc();
  const readingData = {
    ...reading,
    id: docRef.id,
    timestamp: new Date().toISOString(),
    synced: true
  };
  await docRef.set(readingData);
  return readingData;
}

export async function getSensorReadingsByField(fieldId, limit = 100) {
  const snapshot = await db
    .collection(FirestoreCollections.SENSOR_READINGS)
    .where('fieldId', '==', fieldId)
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getSensorReadingsBySurvey(surveyId) {
  const snapshot = await db
    .collection(FirestoreCollections.SENSOR_READINGS)
    .where('surveyId', '==', surveyId)
    .orderBy('timestamp', 'asc')
    .get();
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Rover status operations
export async function updateRoverStatus(roverId, status) {
  const statusData = {
    ...status,
    updatedAt: new Date().toISOString()
  };
  await db.collection(FirestoreCollections.ROVER_STATUS).doc(roverId).set(statusData, { merge: true });
  return statusData;
}

export async function getRoverStatus(roverId) {
  const doc = await db.collection(FirestoreCollections.ROVER_STATUS).doc(roverId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

// Survey operations
export async function createSurvey(userId, fieldId, surveyData) {
  const docRef = db.collection(FirestoreCollections.SURVEYS).doc();
  const survey = {
    id: docRef.id,
    userId,
    fieldId,
    status: 'draft',
    sampleCount: 0,
    batteryStart: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...surveyData
  };
  await docRef.set(survey);
  return survey;
}

export async function updateSurvey(surveyId, updates) {
  await db.collection(FirestoreCollections.SURVEYS).doc(surveyId).update({
    ...updates,
    updatedAt: new Date().toISOString()
  });
}

export async function getSurvey(surveyId) {
  const doc = await db.collection(FirestoreCollections.SURVEYS).doc(surveyId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function getUserSurveys(userId, limit = 50) {
  const snapshot = await db
    .collection(FirestoreCollections.SURVEYS)
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Command operations
export async function createCommand(roverId, command) {
  const docRef = db.collection(FirestoreCollections.COMMANDS).doc();
  const commandData = {
    id: docRef.id,
    roverId,
    status: 'pending',
    createdAt: new Date().toISOString(),
    ...command
  };
  await docRef.set(commandData);
  return commandData;
}

export async function updateCommand(commandId, status, response = null) {
  await db.collection(FirestoreCollections.COMMANDS).doc(commandId).update({
    status,
    response,
    completedAt: status === 'completed' ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString()
  });
}

// Alert operations
export async function createAlert(userId, alert) {
  const docRef = db.collection(FirestoreCollections.ALERTS).doc();
  const alertData = {
    id: docRef.id,
    userId,
    read: false,
    createdAt: new Date().toISOString(),
    ...alert
  };
  await docRef.set(alertData);
  return alertData;
}

export async function getUserAlerts(userId, limit = 50) {
  const snapshot = await db
    .collection(FirestoreCollections.ALERTS)
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function markAlertAsRead(alertId) {
  await db.collection(FirestoreCollections.ALERTS).doc(alertId).update({
    read: true,
    readAt: new Date().toISOString()
  });
}
