import { apiCall } from './api';
import { db } from '../lib/db';
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

function getDefaultSettingsResponse(updates: Record<string, any> = {}): UserSettingsResponse {
  return {
    userId: 'local-user',
    settings: {
      samplingDistance: 12,
      units: 'Metric',
      darkMode: true,
      offlineSync: true,
      language: 'English',
      esp32IP: '',
      wifiMode: 'WiFi',
      autoConnect: true,
      ...updates
    },
    updatedAt: new Date().toISOString()
  };
}

/**
 * Get user settings with offline fallback
 */
export async function getUserSettings(): Promise<UserSettingsResponse> {
  try {
    return await apiCall<UserSettingsResponse>('/settings');
  } catch {
    const local = await db.settings.get('settings');
    return getDefaultSettingsResponse(local || {});
  }
}

/**
 * Update user settings in Dexie local database and try backend sync
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
  // Update local IndexedDB database immediately
  try {
    await db.settings.update('settings', updates);
  } catch (err) {
    console.warn('Local settings update notice:', err);
  }

  // Attempt backend sync
  try {
    return await apiCall<UserSettingsResponse>('/settings', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  } catch {
    // Return graceful success response so UI settings update seamlessly offline
    return getDefaultSettingsResponse(updates);
  }
}

const SETTINGS_CACHE_KEY = 'agrisense-settings-cache';
const SETTINGS_CACHE_TIME = 60000;

interface CachedSettings {
  data: UserSettingsResponse;
  timestamp: number;
}

export async function getUserSettingsCached(): Promise<UserSettingsResponse> {
  const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
  
  if (cached) {
    try {
      const parsedCache = JSON.parse(cached) as CachedSettings;
      const now = Date.now();
      if (now - parsedCache.timestamp < SETTINGS_CACHE_TIME) {
        return parsedCache.data;
      }
    } catch {}
  }

  const settings = await getUserSettings();
  try {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify({
      data: settings,
      timestamp: Date.now()
    }));
  } catch {}

  return settings;
}

export function clearSettingsCache() {
  localStorage.removeItem(SETTINGS_CACHE_KEY);
}

export async function updateUserSettingsWithCache(updates: any): Promise<UserSettingsResponse> {
  const result = await updateUserSettings(updates);
  clearSettingsCache();
  return result;
}

export async function getSetting<K extends keyof UserSettingsResponse['settings']>(
  key: K
): Promise<UserSettingsResponse['settings'][K]> {
  const settings = await getUserSettingsCached();
  return settings.settings[key];
}

export async function updateSetting<K extends keyof UserSettingsResponse['settings']>(
  key: K,
  value: UserSettingsResponse['settings'][K]
): Promise<UserSettingsResponse> {
  return updateUserSettingsWithCache({
    [key]: value
  });
}

export function onSettingsChange(
  callback: (settings: UserSettingsResponse) => void
): () => void {
  const interval = setInterval(async () => {
    try {
      const settings = await getUserSettings();
      callback(settings);
    } catch {}
  }, SETTINGS_CACHE_TIME);

  return () => clearInterval(interval);
}
