import express from 'express';
import { verifyIdToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validateCommand } from '../utils/validation.js';
import {
  getRoverStatus,
  updateRoverStatus,
  createCommand,
  updateCommand,
  createSurvey,
  updateSurvey
} from '../services/firestore.js';

const router = express.Router();

// GET rover status
router.get('/status/:roverId', asyncHandler(async (req, res) => {
  const status = await getRoverStatus(req.params.roverId);
  
  if (!status) {
    return res.status(404).json({
      connected: false,
      battery: 0,
      movementStatus: 'Offline',
      message: 'Rover not found'
    });
  }
  
  res.json(status);
}));

// POST manual command to rover
router.post('/manual', verifyIdToken, asyncHandler(async (req, res) => {
  const { command, roverId = 'primary' } = req.body;
  
  validateCommand({ command });
  
  // Create command record
  const cmd = await createCommand(roverId, {
    type: 'manual',
    command,
    userId: req.user.id
  });
  
  // In a real scenario, this would be sent to ESP32 via WiFi
  // For now, we log and return success
  console.log(`Manual command '${command}' queued for rover ${roverId}`);
  
  // Broadcast to connected clients
  if (req.app.get('io')) {
    req.app.get('io').emit('rover:command', {
      roverId,
      command,
      timestamp: new Date().toISOString()
    });
  }
  
  res.status(202).json({
    ok: true,
    commandId: cmd.id,
    command: cmd.command,
    status: 'queued'
  });
}));

// POST start survey
router.post('/survey/start', verifyIdToken, asyncHandler(async (req, res) => {
  const { fieldId, samplingPoints, roverId = 'primary' } = req.body;
  
  if (!fieldId || !samplingPoints) {
    return res.status(400).json({ error: 'fieldId and samplingPoints are required' });
  }
  
  // Create survey in Firestore
  const survey = await createSurvey(req.user.id, fieldId, {
    samplingPoints,
    status: 'running'
  });
  
  // Send start command to rover
  const cmd = await createCommand(roverId, {
    type: 'survey',
    command: 'start_survey',
    surveyId: survey.id,
    fieldId,
    samplingPoints,
    userId: req.user.id
  });
  
  // Update rover status
  await updateRoverStatus(roverId, {
    currentSurvey: survey.id,
    currentSamplingPoint: 0,
    motorStatus: 'Moving'
  });
  
  // Broadcast event
  if (req.app.get('io')) {
    req.app.get('io').emit('survey:started', {
      surveyId: survey.id,
      fieldId,
      samplingPoints
    });
  }
  
  res.status(201).json({
    ok: true,
    survey: {
      id: survey.id,
      fieldId,
      samplingPoints,
      status: 'running'
    }
  });
}));

// POST stop survey
router.post('/survey/stop', verifyIdToken, asyncHandler(async (req, res) => {
  const { surveyId, roverId = 'primary' } = req.body;
  
  if (!surveyId) {
    return res.status(400).json({ error: 'surveyId is required' });
  }
  
  // Update survey status
  await updateSurvey(surveyId, {
    status: 'completed',
    endedAt: new Date().toISOString()
  });
  
  // Send stop command to rover
  const cmd = await createCommand(roverId, {
    type: 'survey',
    command: 'stop_survey',
    surveyId,
    userId: req.user.id
  });
  
  // Update rover status
  await updateRoverStatus(roverId, {
    currentSurvey: null,
    motorStatus: 'Stopped'
  });
  
  // Broadcast event
  if (req.app.get('io')) {
    req.app.get('io').emit('survey:stopped', { surveyId });
  }
  
  res.json({
    ok: true,
    surveyId,
    status: 'completed'
  });
}));

// POST pause survey
router.post('/survey/pause', verifyIdToken, asyncHandler(async (req, res) => {
  const { surveyId, roverId = 'primary' } = req.body;
  
  await updateSurvey(surveyId, { status: 'paused' });
  
  await createCommand(roverId, {
    type: 'survey',
    command: 'pause_survey',
    surveyId,
    userId: req.user.id
  });
  
  res.json({ ok: true, surveyId, status: 'paused' });
}));

// POST resume survey
router.post('/survey/resume', verifyIdToken, asyncHandler(async (req, res) => {
  const { surveyId, roverId = 'primary' } = req.body;
  
  await updateSurvey(surveyId, { status: 'running' });
  
  await createCommand(roverId, {
    type: 'survey',
    command: 'resume_survey',
    surveyId,
    userId: req.user.id
  });
  
  res.json({ ok: true, surveyId, status: 'running' });
}));

export default router;
