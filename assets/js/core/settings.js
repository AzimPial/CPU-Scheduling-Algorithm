/**
 * @module core/settings
 * Settings state management for Algo. Persists to localStorage,
 * optionally syncs to backend when logged in.
 */

const STORAGE_KEY = 'algo_settings';

const DEFAULTS = {
  theme: 'light',           // 'light' | 'dark' | 'system'
  animationSpeed: 'normal', // 'off' | 'slow' | 'normal' | 'fast'
  colorblindPalette: false,
  decimalPrecision: 2,      // 0 | 1 | 2
  defaultLanding: 'home',   // 'home' | 'visualize' | 'compare'
  autoRun: false,           // Module 1 auto-run on input change
};

let settings = { ...DEFAULTS };

/**
 * Load settings from localStorage.
 */
export function loadSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      settings = { ...DEFAULTS, ...parsed };
    }
  } catch {
    settings = { ...DEFAULTS };
  }
  return settings;
}

/**
 * Get current settings.
 */
export function getSettings() {
  return { ...settings };
}

/**
 * Get a single setting value.
 */
export function getSetting(key) {
  return settings[key] ?? DEFAULTS[key];
}

/**
 * Update settings and persist.
 * @param {Object} partial - Partial settings to merge
 */
export function updateSettings(partial) {
  settings = { ...settings, ...partial };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/**
 * Reset settings to defaults.
 */
export function resetSettings() {
  settings = { ...DEFAULTS };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/**
 * Get the animation duration in ms based on animationSpeed setting.
 */
export function getAnimationDuration() {
  const speed = settings.animationSpeed;
  if (speed === 'off') return 0;
  if (speed === 'slow') return 600;
  if (speed === 'fast') return 120;
  return 300; // normal
}

/**
 * Initialize settings (load from localStorage).
 */
export function initSettings() {
  loadSettings();
  return settings;
}
