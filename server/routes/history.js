import express from 'express';
import { verifyIdToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  getSensorReadingsBySurvey,
  getSensorReadingsByField,
  getUserSurveys
} from '../services/firestore.js';

const router = express.Router();

// GET survey history for user
router.get('/surveys', verifyIdToken, asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  const surveys = await getUserSurveys(req.user.id, Number(limit));
  
  res.json({
    userId: req.user.id,
    count: surveys.length,
    surveys
  });
}));

// GET detailed survey data with all sensor readings
router.get('/survey/:surveyId', verifyIdToken, asyncHandler(async (req, res) => {
  const readings = await getSensorReadingsBySurvey(req.params.surveyId);
  
  if (readings.length === 0) {
    return res.status(404).json({ error: 'Survey not found' });
  }
  
  // Calculate averages and statistics
  const stats = {
    totalReadings: readings.length,
    nitrogen: {
      avg: readings.reduce((sum, r) => sum + r.nitrogen, 0) / readings.length,
      min: Math.min(...readings.map(r => r.nitrogen)),
      max: Math.max(...readings.map(r => r.nitrogen))
    },
    phosphorus: {
      avg: readings.reduce((sum, r) => sum + r.phosphorus, 0) / readings.length,
      min: Math.min(...readings.map(r => r.phosphorus)),
      max: Math.max(...readings.map(r => r.phosphorus))
    },
    potassium: {
      avg: readings.reduce((sum, r) => sum + r.potassium, 0) / readings.length,
      min: Math.min(...readings.map(r => r.potassium)),
      max: Math.max(...readings.map(r => r.potassium))
    },
    moisture: {
      avg: readings.reduce((sum, r) => sum + r.moisture, 0) / readings.length,
      min: Math.min(...readings.map(r => r.moisture)),
      max: Math.max(...readings.map(r => r.moisture))
    }
  };
  
  res.json({
    surveyId: req.params.surveyId,
    readings,
    statistics: stats
  });
}));

// GET CSV export for survey
router.get('/survey/:surveyId/export/csv', verifyIdToken, asyncHandler(async (req, res) => {
  const readings = await getSensorReadingsBySurvey(req.params.surveyId);
  
  if (readings.length === 0) {
    return res.status(404).json({ error: 'Survey not found' });
  }
  
  // Generate CSV header
  const headers = ['Timestamp', 'Point Index', 'Nitrogen', 'Phosphorus', 'Potassium', 'Moisture', 'Temperature', 'Battery', 'Latitude', 'Longitude'];
  const csv = [headers.join(',')];
  
  // Add data rows
  readings.forEach(reading => {
    const row = [
      reading.timestamp,
      reading.pointIndex,
      reading.nitrogen,
      reading.phosphorus,
      reading.potassium,
      reading.moisture,
      reading.temperature,
      reading.battery,
      reading.gps?.lat || '',
      reading.gps?.lng || ''
    ];
    csv.push(row.map(v => `"${v}"`).join(','));
  });
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="survey-${req.params.surveyId}.csv"`);
  res.send(csv.join('\n'));
}));

// GET field history with sensor readings
router.get('/field/:fieldId', verifyIdToken, asyncHandler(async (req, res) => {
  const { days = 30, limit = 500 } = req.query;
  const readings = await getSensorReadingsByField(req.params.fieldId, Number(limit));
  
  // Filter by date if requested
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - Number(days));
  
  const filtered = readings.filter(r => new Date(r.timestamp) >= cutoffDate);
  
  res.json({
    fieldId: req.params.fieldId,
    period: `Last ${days} days`,
    count: filtered.length,
    readings: filtered
  });
}));

export default router;
