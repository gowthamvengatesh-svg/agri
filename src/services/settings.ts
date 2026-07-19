import { apiCall } from './api';
import type { Settings } from '../types';

export interface UserSettingsResponse {
  userId: string;
  settings: {
    samplingDistance: number;
    units: 'Metric' | 'Imperial';
    darkMode: boolean;
    offlineSync: boolean;
    language: string;
    esp32IP?: string;
    wifiMode?: string;
    autoConnect?: boolean;
    theme?: string;
  };
  updatedAt: string;
}

/**
 * Get user settings from Firestore
 */
export async function getUserSettings(): Promise<UserSettingsResponse> {
  return apiCall<UserSettingsResponse>('/settings');
}

/**
 * Update user settings in Firestore
 */
export async function updateUserSettings(updates: {
  samplingDistance?: number;
  units?: 'Metric' | 'Imperial';
  darkMode?: boolean;
  offlineSync?: boolean;
  language?: string;
  esp32IP?: string;
  wifiMode?: string;
  autoConnect?: boolean;
  theme?: string;
}): Promise<UserSettingsResponse> {
  return apiCall<UserSettingsResponse>('/settings', {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
}

/**
 * Local cache key for settings
 */
const SETTINGS_CACHE_KEY = 'agrisense-settings-cache';
const SETTINGS_CACHE_TIME = 60000; // 1 minute

interface CachedSettings {
  data: UserSettingsResponse;
  timestamp: number;
}

/**
 * Get settings with local caching
 */
export async function getUserSettingsCached(): Promise<UserSettingsResponse> {
  const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
  
  if (cached) {
    const parsedCache = JSON.parse(cached) as CachedSettings;
    const now = Date.now();
    
    if (now - parsedCache.timestamp < SETTINGS_CACHE_TIME) {
      return parsedCache.data;
    }
  }

  const settings = await getUserSettings();
  localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify({
    data: settings,
    timestamp: Date.now()
  }));

  return settings;
}

/**
 * Clear settings cache
 */
export function clearSettingsCache() {
  localStorage.removeItem(SETTINGS_CACHE_KEY);
}

/**
 * Update settings and refresh cache
 */
export async function updateUserSettingsWithCache(updates: any): Promise<UserSettingsResponse> {
  const result = await updateUserSettings(updates);
  clearSettingsCache();
  return result;
}

/**
 * Get a specific setting value
 */
export async function getSetting<K extends keyof UserSettingsResponse['settings']>(
  key: K
): Promise<UserSettingsResponse['settings'][K]> {
  const settings = await getUserSettingsCached();
  return settings.settings[key];
}

/**
 * Update a specific setting
 */
export async function updateSetting<K extends keyof UserSettingsResponse['settings']>(
  key: K,
  value: UserSettingsResponse['settings'][K]
): Promise<UserSettingsResponse> {
  return updateUserSettingsWithCache({
    [key]: value
  });
}

/**
 * Listen to settings changes (real-time via Firestore listener)
 */
export function onSettingsChange(
  callback: (settings: UserSettingsResponse) => void
): () => void {
  // Note: Requires Firestore listener setup in backend
  // For now, using polling as fallback
  const interval = setInterval(async () => {
    try {
      const settings = await getUserSettings();
      callback(settings);
    } catch (err) {
      console.error('Failed to listen to settings changes:', err);
    }
  }, SETTINGS_CACHE_TIME);

  return () => clearInterval(interval);
}
