import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import { apiCall } from './api';
import type { User as UserProfile } from '../types';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends AuthCredentials {
  name: string;
  role: 'Farmer' | 'Researcher' | 'Admin';
}

// Register new user
export async function register(data: RegisterData): Promise<{ userId: string; profile: UserProfile }> {
  if (isFirebaseConfigured && auth) {
    try {
      await createUserWithEmailAndPassword(auth, data.email, data.password);
    } catch (err) {
      console.warn('Firebase createUser failed, falling back to backend:', err);
    }
  }
  
  // Create profile on backend
  const response = await apiCall<{ userId: string; profile: UserProfile }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: data.email,
      password: data.password,
      name: data.name,
      role: data.role
    })
  });
  
  return response;
}

// Login
export async function login(credentials: AuthCredentials): Promise<User | null> {
  if (isFirebaseConfigured && auth) {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );
    return userCredential.user;
  }
  return null;
}

// Logout
export async function logout(): Promise<void> {
  if (isFirebaseConfigured && auth) {
    await signOut(auth);
  }
}

// Get current user profile
export async function getCurrentUserProfile(): Promise<UserProfile> {
  return apiCall<UserProfile>('/auth/me');
}

// Listen to auth state changes
export function onAuthChange(callback: (user: User | null) => void): () => void {
  if (isFirebaseConfigured && auth) {
    try {
      return onAuthStateChanged(auth, callback);
    } catch (err) {
      console.warn('Firebase auth listener error:', err);
    }
  }
  // Safe fallback for local/offline dev mode
  const timeoutId = setTimeout(() => callback(null), 0);
  return () => clearTimeout(timeoutId);
}

// Get current user
export function getCurrentUser(): User | null {
  if (isFirebaseConfigured && auth) {
    return auth.currentUser;
  }
  return null;
}
