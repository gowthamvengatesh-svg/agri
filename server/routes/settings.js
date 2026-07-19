import express from 'express';
import { verifyIdToken } from '../middleware/auth.js';
import { getUserSettings, updateUserSettings } from '../services/firestore.js';

const router = express.Router();

/**
 * GET /api/settings
 * Get user's settings from Firestore
 */
router.get('/', verifyIdToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const settings = await getUserSettings(userId);

    res.json({
      userId,
      settings,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Fetch settings error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * PUT /api/settings
 * Update user's settings in Firestore
 */
router.put('/', verifyIdToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Validate settings
    if (updates.samplingDistance !== undefined) {
      if (typeof updates.samplingDistance !== 'number' || updates.samplingDistance < 1 || updates.samplingDistance > 1000) {
        return res.status(400).json({ error: 'samplingDistance must be a number between 1 and 1000' });
      }
    }
    if (updates.units !== undefined) {
      if (!['Metric', 'Imperial'].includes(updates.units)) {
        return res.status(400).json({ error: 'Invalid units' });
      }
    }
    if (updates.darkMode !== undefined) {
      if (typeof updates.darkMode !== 'boolean') {
        return res.status(400).json({ error: 'darkMode must be a boolean' });
      }
    }
    if (updates.esp32IP !== undefined && updates.esp32IP !== null && updates.esp32IP !== '') {
      // Basic IP validation
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipRegex.test(updates.esp32IP)) {
        return res.status(400).json({ error: 'Invalid ESP32 IP address' });
      }
    }
    if (updates.wifiMode !== undefined) {
      if (!['WiFi', 'Bluetooth', 'LoRa'].includes(updates.wifiMode)) {
        return res.status(400).json({ error: 'Invalid WiFi mode' });
      }
    }
    if (updates.language !== undefined) {
      if (!['English', 'Hindi', 'Telugu', 'Tamil'].includes(updates.language)) {
        return res.status(400).json({ error: 'Invalid language' });
      }
    }

    // Update in Firestore
    const settings = await updateUserSettings(userId, updates);

    res.json({
      userId,
      settings,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Settings update error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * GET /api/settings/:key
 * Get a specific setting value
 */
router.get('/:key', verifyIdToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { key } = req.params;

    const settings = await getUserSettings(userId);
    const value = settings[key];

    if (value === undefined) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ key, value });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

export default router;
