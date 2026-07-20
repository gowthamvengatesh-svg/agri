import { db } from '../config/firebase.js';

export const FirestoreCollections = {
  USERS: 'users',
  SURVEYS: 'surveys',
  SENSOR_READINGS: 'sensorReadings',
  ROVER_STATUS: 'roverStatus',
  COMMANDS: 'commands',
  ALERTS: 'alerts'
};

// Helper for default rover status when Cloud Firestore API is disabled or uninitialized
function getDefaultRoverStatus(roverId = 'primary') {
  return {
    id: roverId,
    connected: false,
    battery: 100,
    signalStrength: -65,
    mode: 'manual',
    status: 'idle',
    updatedAt: new Date().toISOString()
  };
}

// User operations
export async function getUserProfile(userId) {
  try {
    const doc = await db.collection(FirestoreCollections.USERS).doc(userId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  } catch (err) {
    console.warn('Firestore getUserProfile fallback:', err.message);
    return null;
  }
}

export async function createUserProfile(userId, { name, email, role }) {
  const userData = {
    id: userId,
    name,
    email,
    role,
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
  try {
    await db.collection(FirestoreCollections.USERS).doc(userId).set(userData);
  } catch (err) {
    console.warn('Firestore createUserProfile fallback:', err.message);
  }
  return userData;
}

export async function updateUserSettings(userId, settings) {
  try {
    const user = await db.collection(FirestoreCollections.USERS).doc(userId).get();
    const currentSettings = user.exists ? (user.data().settings || {}) : {};
    const mergedSettings = { ...currentSettings, ...settings };
    
    await db.collection(FirestoreCollections.USERS).doc(userId).set({
      settings: mergedSettings,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    return mergedSettings;
  } catch (err) {
    console.warn('Firestore updateUserSettings fallback:', err.message);
    return settings;
  }
}

export async function getUserSettings(userId) {
  try {
    const doc = await db.collection(FirestoreCollections.USERS).doc(userId).get();
    if (doc.exists && doc.data().settings) {
      return doc.data().settings;
    }
  } catch (err) {
    console.warn('Firestore getUserSettings fallback:', err.message);
  }
  return { samplingDistance: 12, units: 'Metric', darkMode: true, autoSave: true };
}

// Sensor reading operations
export async function saveSensorReading(reading) {
  const readingData = {
    ...reading,
    id: reading.id || Math.random().toString(36).substring(7),
    timestamp: new Date().toISOString(),
    synced: true
  };
  try {
    const docRef = db.collection(FirestoreCollections.SENSOR_READINGS).doc(readingData.id);
    await docRef.set(readingData);
  } catch (err) {
    console.warn('Firestore saveSensorReading fallback:', err.message);
  }
  return readingData;
}

export async function getSensorReadingsByField(fieldId, limit = 100) {
  try {
    const snapshot = await db
      .collection(FirestoreCollections.SENSOR_READINGS)
      .where('fieldId', '==', fieldId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.warn('Firestore getSensorReadingsByField fallback:', err.message);
    return [];
  }
}

export async function getSensorReadingsBySurvey(surveyId) {
  try {
    const snapshot = await db
      .collection(FirestoreCollections.SENSOR_READINGS)
      .where('surveyId', '==', surveyId)
      .orderBy('timestamp', 'asc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.warn('Firestore getSensorReadingsBySurvey fallback:', err.message);
    return [];
  }
}

// Rover status operations
export async function updateRoverStatus(roverId, status) {
  const statusData = {
    ...status,
    updatedAt: new Date().toISOString()
  };
  try {
    await db.collection(FirestoreCollections.ROVER_STATUS).doc(roverId).set(statusData, { merge: true });
  } catch (err) {
    console.warn('Firestore updateRoverStatus fallback:', err.message);
  }
  return statusData;
}

export async function getRoverStatus(roverId = 'primary') {
  try {
    const doc = await db.collection(FirestoreCollections.ROVER_STATUS).doc(roverId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : getDefaultRoverStatus(roverId);
  } catch (err) {
    console.warn('Firestore getRoverStatus fallback:', err.message);
    return getDefaultRoverStatus(roverId);
  }
}

// Survey operations
export async function createSurvey(userId, fieldId, surveyData) {
  const surveyId = Math.random().toString(36).substring(7);
  const survey = {
    id: surveyId,
    userId,
    fieldId,
    status: 'draft',
    sampleCount: 0,
    batteryStart: 96,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...surveyData
  };
  try {
    await db.collection(FirestoreCollections.SURVEYS).doc(surveyId).set(survey);
  } catch (err) {
    console.warn('Firestore createSurvey fallback:', err.message);
  }
  return survey;
}

export async function updateSurvey(surveyId, updates) {
  try {
    await db.collection(FirestoreCollections.SURVEYS).doc(surveyId).update({
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Firestore updateSurvey fallback:', err.message);
  }
}

export async function getSurvey(surveyId) {
  try {
    const doc = await db.collection(FirestoreCollections.SURVEYS).doc(surveyId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  } catch (err) {
    console.warn('Firestore getSurvey fallback:', err.message);
    return null;
  }
}

export async function getUserSurveys(userId, limit = 50) {
  try {
    const snapshot = await db
      .collection(FirestoreCollections.SURVEYS)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.warn('Firestore getUserSurveys fallback:', err.message);
    return [];
  }
}

// Command operations
export async function createCommand(roverId, command) {
  const commandId = Math.random().toString(36).substring(7);
  const commandData = {
    id: commandId,
    roverId,
    status: 'pending',
    createdAt: new Date().toISOString(),
    ...command
  };
  try {
    await db.collection(FirestoreCollections.COMMANDS).doc(commandId).set(commandData);
  } catch (err) {
    console.warn('Firestore createCommand fallback:', err.message);
  }
  return commandData;
}

export async function updateCommand(commandId, status, response = null) {
  try {
    await db.collection(FirestoreCollections.COMMANDS).doc(commandId).update({
      status,
      response,
      completedAt: status === 'completed' ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Firestore updateCommand fallback:', err.message);
  }
}

// Alert operations
export async function createAlert(userId, alert) {
  const alertId = Math.random().toString(36).substring(7);
  const alertData = {
    id: alertId,
    userId,
    read: false,
    createdAt: new Date().toISOString(),
    ...alert
  };
  try {
    await db.collection(FirestoreCollections.ALERTS).doc(alertId).set(alertData);
  } catch (err) {
    console.warn('Firestore createAlert fallback:', err.message);
  }
  return alertData;
}

export async function getUserAlerts(userId, limit = 50) {
  try {
    const snapshot = await db
      .collection(FirestoreCollections.ALERTS)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.warn('Firestore getUserAlerts fallback:', err.message);
    return [];
  }
}

export async function markAlertAsRead(alertId) {
  try {
    await db.collection(FirestoreCollections.ALERTS).doc(alertId).update({
      read: true,
      readAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Firestore markAlertAsRead fallback:', err.message);
  }
}
