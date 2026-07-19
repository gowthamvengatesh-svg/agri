import express from 'express';
import { verifyIdToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validateSensorReading } from '../utils/validation.js';
import {
  saveSensorReading,
  getSensorReadingsByField,
  getSensorReadingsBySurvey,
  updateRoverStatus,
  createAlert
} from '../services/firestore.js';

const router = express.Router();

// POST live sensor data from ESP32
// This endpoint receives raw data from ESP32 and stores it in Firestore
// Also broadcasts to connected Socket.IO clients for real-time dashboard updates
router.post('/live', asyncHandler(async (req, res) => {
  const { nitrogen, phosphorus, potassium, moisture, temperature, battery, fieldId, surveyId, pointIndex } = req.body;
  
  // Validate sensor data
  validateSensorReading({
    nitrogen: nitrogen || 0,
    phosphorus: phosphorus || 0,
    potassium: potassium || 0,
    moisture: moisture || 0,
    temperature: temperature || 0,
    battery: battery || 0
  });
  
  // Create sensor reading object
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
  
  // Save to Firestore
  const saved = await saveSensorReading(reading);
  
  // Broadcast to connected clients via Socket.IO (handled in main server file)
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
  const { limit = 100 } = req.query;
  const readings = await getSensorReadingsByField(req.params.fieldId, Number(limit));
  
  res.json({
    fieldId: req.params.fieldId,
    count: readings.length,
    readings
  });
}));

// GET sensor readings by survey
router.get('/survey/:surveyId', verifyIdToken, asyncHandler(async (req, res) => {
  const readings = await getSensorReadingsBySurvey(req.params.surveyId);
  
  res.json({
    surveyId: req.params.surveyId,
    count: readings.length,
    readings
  });
}));

// GET latest sensor reading
router.get('/latest/:fieldId', asyncHandler(async (req, res) => {
  const readings = await getSensorReadingsByField(req.params.fieldId, 1);
  
  if (readings.length === 0) {
    return res.status(404).json({ error: 'No sensor readings found' });
  }
  
  res.json(readings[0]);
}));

export default router;
