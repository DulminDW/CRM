// ==============================================================================
// WINDOW COMPANIES CRM — ADAPTIVE AUTH STORAGE ADAPTER
// Supports:
// 1. Persistent Storage (localStorage) when "Remember Me" is selected (Default).
// 2. Session-only Storage (sessionStorage) when "Remember Me" is unselected,
//    ensuring credentials/tokens clear when the browser window is closed.
// 3. Multi-tab synchronization via standard Storage events.
// ==============================================================================

export const STORAGE_AUTH_KEY = 'window_companies_crm_auth';
export const REMEMBER_ME_PREF_KEY = 'window_companies_crm_remember_me';

export interface StorageAdapter {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
}

/**
 * Custom Storage Adapter for Supabase Auth.
 * Dynamically switches between localStorage and sessionStorage based on employee preference.
 */
export const adaptiveAuthStorage: StorageAdapter = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;

    // Check localStorage first
    const localVal = window.localStorage.getItem(key);
    if (localVal) return localVal;

    // Fallback to sessionStorage
    return window.sessionStorage.getItem(key);
  },

  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;

    // Default to false (session-only) unless explicitly enabled by user
    const rememberMe = window.localStorage.getItem(REMEMBER_ME_PREF_KEY) === 'true';

    if (rememberMe) {
      window.localStorage.setItem(key, value);
      window.sessionStorage.removeItem(key);
    } else {
      window.sessionStorage.setItem(key, value);
      window.localStorage.removeItem(key);
    }
  },

  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }
};

