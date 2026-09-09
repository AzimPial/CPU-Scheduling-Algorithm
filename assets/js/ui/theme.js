/**
 * @fileoverview Algo — Theme management with light/dark/system support and no-FOUC.
 * @module ui/theme
 */

const THEME_KEY = 'algo_theme';

/**
 * Get the stored theme preference.
 * @returns {'light'|'dark'}
 */
export function getThemePref() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return 'light';
}

/**
 * Persist the theme preference.
 * @param {'light'|'dark'} theme
 */
export function saveThemePref(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

/**
 * Resolve the effective theme ('system' → matchMedia).
 * @param {string} pref - 'light' | 'dark' | 'system'
 * @returns {'light'|'dark'}
 */
export function resolveTheme(pref) {
  if (pref === 'system') {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }
  return pref === 'dark' ? 'dark' : 'light';
}

/**
 * Apply a theme to the document.
 * @param {'light'|'dark'} theme
 */
export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

const SUN_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
const MOON_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

/**
 * Initialize the theme system.
 * @param {HTMLElement} toggleBtn - The theme toggle button element
 * @returns {{toggle: () => void, set: (pref: string) => void, updateIcon: () => void, get current: () => string}}
 */
export function initTheme(toggleBtn) {
  let pref = getThemePref();
  applyTheme(pref);

  function updateIcon() {
    if (!toggleBtn) return;
    if (pref === 'dark') {
      toggleBtn.innerHTML = SUN_ICON;
      toggleBtn.setAttribute('aria-label', 'Switch to light theme');
    } else {
      toggleBtn.innerHTML = MOON_ICON;
      toggleBtn.setAttribute('aria-label', 'Switch to dark theme');
    }
  }

  function toggle() {
    pref = pref === 'dark' ? 'light' : 'dark';
    applyTheme(pref);
    saveThemePref(pref);
    updateIcon();
  }

  /**
   * Set theme preference programmatically (used by settings panel).
   */
  function set(nextPref) {
    pref = nextPref === 'dark' ? 'dark' : 'light';
    applyTheme(pref);
    saveThemePref(pref);
    updateIcon();
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggle);
  }

  updateIcon();

  return {
    toggle,
    set,
    updateIcon,
    get current() { return pref; }
  };
}