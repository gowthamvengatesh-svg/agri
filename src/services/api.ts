import { auth } from '../lib/firebase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4100/api';

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Get authorization token
async function getAuthToken(): Promise<string> {
  const user = auth?.currentUser;
  if (user && typeof user.getIdToken === 'function') {
    try {
      return await user.getIdToken();
    } catch {
      // Fallback if token retrieval fails
    }
  }
  return 'mock-token';
}

// Make API request
export async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const token = await getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `API Error: ${response.statusText}` }));
      throw new Error(error.error || `API Error: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.debug('API call info:', error);
    }
    throw error;
  }
}

// Public API call (no auth required)
export async function publicApiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `API Error: ${response.statusText}` }));
      throw new Error(error.error || `API Error: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.debug('Public API call info:', error);
    }
    throw error;
  }
}

// Health check
export async function checkHealth() {
  return publicApiCall('/health');
}
