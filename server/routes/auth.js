import express from 'express';
import { auth } from '../config/firebase.js';
import { createUserProfile, getUserProfile } from '../services/firestore.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { verifyIdToken } from '../middleware/auth.js';

const router = express.Router();

// Register new user
router.post('/register', asyncHandler(async (req, res) => {
  const { email, password, name, role } = req.body;
  
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }
  
  if (!['Farmer', 'Researcher', 'Admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be Farmer, Researcher, or Admin' });
  }
  
  try {
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name
    });
    
    // Set custom claims for role
    await auth.setCustomUserClaims(userRecord.uid, { role });
    
    // Create user profile in Firestore
    const userProfile = await createUserProfile(userRecord.uid, {
      name,
      email,
      role
    });
    
    res.status(201).json({
      userId: userRecord.uid,
      profile: userProfile
    });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    throw error;
  }
}));

// Get current user profile
router.get('/me', verifyIdToken, asyncHandler(async (req, res) => {
  const profile = await getUserProfile(req.user.id);
  
  if (!profile) {
    return res.status(404).json({ error: 'User profile not found' });
  }
  
  res.json(profile);
}));

// Get user profile by ID (admin only)
router.get('/:userId', verifyIdToken, asyncHandler(async (req, res) => {
  const profile = await getUserProfile(req.params.userId);
  
  if (!profile) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Users can only see their own profile unless admin
  if (req.user.id !== req.params.userId && req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  res.json(profile);
}));

export default router;
