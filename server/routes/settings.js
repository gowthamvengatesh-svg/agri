import express from 'express';
import { verifyIdToken } from '../middleware/auth.js';
import { getUserSettings, updateUserSettings } from '../services/firestore.js';

const router = express.Router();

const defaultSettings = {
  samplingDistance: 12,
  units: 'Metric',
  darkMode: true,
  offlineSync: true,
  language: 'English',
  esp32IP: '',
  wifiMode: 'WiFi',
  autoConnect: true
};

/**
 * GET /api/settings
 * Get user's settings from Firestore with graceful fallback
 */
router.get('/', verifyIdToken, async (req, res) => {
  try {
    const userId = req.user?.id || 'local-user';
    const settings = await getUserSettings(userId);

    res.json({
      userId,
      settings: settings || defaultSettings,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Fetch settings warning:', err.message);
    res.json({
      userId: req.user?.id || 'local-user',
      settings: defaultSettings,
      updatedAt: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/settings
 * Update user's settings in Firestore with graceful fallback
 */
router.put('/', verifyIdToken, async (req, res) => {
  try {
    const userId = req.user?.id || 'local-user';
    const updates = req.body || {};

    let settings = defaultSettings;
    try {
      settings = await updateUserSettings(userId, updates);
    } catch (err) {
      console.warn('Firestore update settings warning:', err.message);
      settings = { ...defaultSettings, ...updates };
    }

    res.json({
      userId,
      settings,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Settings route update warning:', err.message);
    res.json({
      userId: req.user?.id || 'local-user',
      settings: { ...defaultSettings, ...(req.body || {}) },
      updatedAt: new Date().toISOString()
    });
  }
});

/**
 * GET /api/settings/:key
 */
router.get('/:key', verifyIdToken, async (req, res) => {
  try {
    const userId = req.user?.id || 'local-user';
    const { key } = req.params;

    const settings = await getUserSettings(userId);
    const value = settings[key] !== undefined ? settings[key] : defaultSettings[key];

    res.json({ key, value });
  } catch (err) {
    res.json({ key: req.params.key, value: defaultSettings[req.params.key] });
  }
});

export default router;
