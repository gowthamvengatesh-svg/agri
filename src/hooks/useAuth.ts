import { useEffect, useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  login,
  logout,
  register,
  getCurrentUser,
  onAuthChange,
  getCurrentUserProfile
} from '../services/auth';
import type { User as UserProfile } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthChange((authUser) => {
      setUser(authUser);
      setLoading(false);

      // Load profile if user exists
      if (authUser) {
        loadProfile();
      } else {
        setProfile(null);
      }
    });

    return unsubscribe;
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const userProfile = await getCurrentUserProfile();
      setProfile(userProfile);
      setError(null);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    }
  }, []);

  const handleLogin = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      await login({ email, password });
      await loadProfile();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadProfile]);

  const handleRegister = useCallback(async (
    email: string,
    password: string,
    name: string,
    role: 'Farmer' | 'Researcher' | 'Admin'
  ) => {
    try {
      setLoading(true);
      setError(null);
      const result = await register({ email, password, name, role });
      setProfile(result.profile);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await logout();
      setUser(null);
      setProfile(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    profile,
    loading,
    error,
    isAuthenticated: !!user,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    reloadProfile: loadProfile
  };
}
