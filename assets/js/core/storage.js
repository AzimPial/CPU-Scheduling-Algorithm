/**
 * @fileoverview Algo — localStorage persistence, URL state encoding/decoding, and cloud-save helpers.
 * @module core/storage
 */

const STORAGE_KEY = 'algo_scenarios';
const THEME_KEY = 'algo_theme';

/**
 * Encode current state as a base64 URL parameter.
 * @param {Object} state - {algorithm, options, processes}
 * @returns {string} Query string like ?s=...
 */
export function encodeState(state) {
  try {
    const json = JSON.stringify(state);
    const encoded = btoa(unescape(encodeURIComponent(json)));
    return '?s=' + encodeURIComponent(encoded);
  } catch {
    return '';
  }
}

/**
 * Decode state from URL query parameter.
 * @returns {Object|null} Parsed state or null
 */
export function decodeState() {
  try {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('s');
    if (!s) return null;
    const decoded = decodeURIComponent(s);
    const json = decodeURIComponent(escape(atob(decoded)));
    const state = JSON.parse(json);
    if (state.autoRun) {
      state.autoRun = true;
    }
    return state;
  } catch {
    return null;
  }
}

/**
 * Get the full shareable URL with encoded state.
 * @param {Object} state
 * @returns {string}
 */
export function getShareableURL(state) {
  const qs = encodeState(state);
  return window.location.origin + window.location.pathname + qs;
}

/**
 * Copy shareable URL to clipboard.
 * @param {Object} state
 * @returns {Promise<boolean>} success
 */
export async function copyShareableLink(state) {
  const url = getShareableURL(state);
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = url;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }
}

/**
 * Load saved scenarios from localStorage.
 * @returns {Array<{id: string, name: string, timestamp: number, state: Object}>}
 */
export function loadScenarios() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save a scenario to localStorage.
 * @param {string} name
 * @param {Object} state
 * @returns {Object} The saved scenario object
 */
export function saveScenario(name, state) {
  const scenarios = loadScenarios();
  const scenario = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name,
    timestamp: Date.now(),
    state,
    source: 'local'
  };
  scenarios.unshift(scenario);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
  return scenario;
}

/**
 * Delete a saved scenario (localStorage only).
 * @param {string} id
 */
export function deleteScenario(id) {
  const scenarios = loadScenarios().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
}

/**
 * Get theme preference.
 * @returns {'dark'|'light'}
 */
export function getTheme() {
  return localStorage.getItem(THEME_KEY) || 'light';
}

/**
 * Set theme preference.
 * @param {'dark'|'light'} theme
 */
export function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}