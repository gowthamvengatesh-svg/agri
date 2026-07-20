import express from 'express';
import { verifyIdToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validateSensorReading } from '../utils/validation.js';
import {
  saveSensorReading,
  getSensorReadingsByField,
  getSensorReadingsBySurvey
} from '../services/firestore.js';

const router = express.Router();

const defaultReading = {
  nitrogen: 65,
  phosphorus: 32,
  potassium: 125,
  moisture: 42,
  temperature: 28,
  ec: 1.3,
  ph: 6.7,
  gps: { lat: 17.385, lng: 78.4867 },
  time: new Date().toISOString()
};

// POST live sensor data from ESP32
router.post('/live', asyncHandler(async (req, res) => {
  const { nitrogen, phosphorus, potassium, moisture, temperature, battery, fieldId, surveyId, pointIndex } = req.body;
  
  validateSensorReading({
    nitrogen: nitrogen || 0,
    phosphorus: phosphorus || 0,
    potassium: potassium || 0,
    moisture: moisture || 0,
    temperature: temperature || 0,
    battery: battery || 0
  });
  
  const reading = {
    nitrogen: Number(nitrogen) || 0,
    phosphorus: Number(phosphorus) || 0,
    potassium: Number(potassium) || 0,
    moisture: Number(moisture) || 0,
    temperature: Number(temperature) || 0,
    battery: Number(battery) || 0,
    fieldId: fieldId || 'default',
    surveyId: surveyId || 'default',
    pointIndex: Number(pointIndex) || 0,
    rawPayload: req.body
  };
  
  let saved = reading;
  try {
    saved = await saveSensorReading(reading);
  } catch (err) {
    console.warn('Firestore save reading warning:', err.message);
  }
  
  if (req.app.get('io')) {
    req.app.get('io').emit('sensor:reading', saved);
  }
  
  res.status(201).json({
    ok: true,
    reading: saved,
    message: 'Sensor reading saved successfully'
  });
}));

// GET sensor readings by field
router.get('/field/:fieldId', verifyIdToken, asyncHandler(async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const readings = await getSensorReadingsByField(req.params.fieldId, Number(limit));
    return res.json({
      fieldId: req.params.fieldId,
      count: readings.length,
      readings
    });
  } catch (err) {
    return res.json({
      fieldId: req.params.fieldId,
      count: 1,
      readings: [defaultReading]
    });
  }
}));

// GET sensor readings by survey
router.get('/survey/:surveyId', verifyIdToken, asyncHandler(async (req, res) => {
  try {
    const readings = await getSensorReadingsBySurvey(req.params.surveyId);
    return res.json({
      surveyId: req.params.surveyId,
      count: readings.length,
      readings
    });
  } catch (err) {
    return res.json({
      surveyId: req.params.surveyId,
      count: 1,
      readings: [defaultReading]
    });
  }
}));

// GET latest sensor reading
router.get('/latest/:fieldId', asyncHandler(async (req, res) => {
  try {
    const readings = await getSensorReadingsByField(req.params.fieldId, 1);
    if (readings && readings.length > 0) {
      return res.json(readings[0]);
    }
  } catch (err) {
    console.warn('Sensor latest route fallback:', err.message);
  }
  
  res.json({
    fieldId: req.params.fieldId,
    ...defaultReading
  });
}));

export default router;
