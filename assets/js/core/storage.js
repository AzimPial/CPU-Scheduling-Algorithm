/**
 * @fileoverview Algo — localStorage persistence, URL state encoding/decoding, and cloud-save helpers.
 * @module core/storage
 */

const CHATS_KEY = 'algo_chats';
const LEGACY_SCENARIOS_KEY = 'algo_scenarios';
const THEME_KEY = 'algo_theme';

export function encodeState(state) {
  try {
    const json = JSON.stringify(state);
    const encoded = btoa(unescape(encodeURIComponent(json)));
    return '?s=' + encodeURIComponent(encoded);
  } catch {
    return '';
  }
}

export function decodeState() {
  try {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('s');
    if (!s) return null;
    const decoded = decodeURIComponent(s);
    const json = decodeURIComponent(escape(atob(decoded)));
    const state = JSON.parse(json);
    if (state.autoRun) state.autoRun = true;
    return state;
  } catch {
    return null;
  }
}

export function getShareableURL(state) {
  const qs = encodeState(state);
  return window.location.origin + window.location.pathname + qs;
}

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
 * Load chats from localStorage.
 * @returns {Array<Object>} Array of {id, cloudId?, title, timestamp, messages}
 */
export function loadChats() {
  try {
    const raw = localStorage.getItem(CHATS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save/update a single chat.
 */
export function saveChat(chat) {
  const chats = loadChats();
  const idx = chats.findIndex(c => c.id === chat.id);
  if (idx >= 0) {
    chats[idx] = chat;
  } else {
    chats.unshift(chat);
  }
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
}

/**
 * Delete a chat.
 */
export function deleteChat(id) {
  const chats = loadChats().filter(c => c.id !== id);
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
}

/**
 * Import cloud chats, deduping by clientChatId. Cloud wins; local-only preserved.
 */
export function importCloudChats(cloudList) {
  const local = loadChats();
  const cloudIds = new Set(cloudList.map(c => c.clientChatId));
  const kept = local.filter(c => !cloudIds.has(c.id));
  const imported = cloudList.map(c => ({
    id: c.clientChatId,
    cloudId: c.clientChatId,
    title: c.title || 'New chat',
    timestamp: c.updatedAt ? new Date(c.updatedAt).getTime() : Date.now(),
    messages: Array.isArray(c.messages) ? c.messages : [],
  }));
  const merged = [...kept, ...imported].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  localStorage.setItem(CHATS_KEY, JSON.stringify(merged));
  return merged;
}

/**
 * Set cloudId on a chat after cloud sync.
 */
export function setChatCloudId(id) {
  const chats = loadChats().map(c => (c.id === id ? { ...c, cloudId: c.id } : c));
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
}

/**
 * Migrate old single-run scenarios into chats (one-time).
 */
function migrateLegacyScenarios() {
  try {
    const raw = localStorage.getItem(LEGACY_SCENARIOS_KEY);
    if (!raw) return;
    const oldScenarios = JSON.parse(raw);
    if (!Array.isArray(oldScenarios) || oldScenarios.length === 0) return;

    const chats = loadChats();
    const existingIds = new Set(chats.map(c => c.id));

    for (const s of oldScenarios) {
      if (existingIds.has(s.id)) continue;
      const st = s.state || {};
      const isCompare = st.mode === 'compare';
      const algorithm = isCompare ? (Array.isArray(st.selectedAlgorithms) ? st.selectedAlgorithms : [st.algorithm]) : st.algorithm;
      const algoName = isCompare ? (Array.isArray(algorithm) ? algorithm.join(', ') : 'Compare') : algorithm;

      chats.push({
        id: s.id,
        title: s.name || `Algorithm: ${algoName}`,
        timestamp: s.timestamp || Date.now(),
        messages: [
          {
            role: 'user',
            content: s.name || `Run ${algoName}`,
            summary: '',
          },
          {
            role: 'assistant',
            content: s.name || `Algorithm: ${algoName}`,
            algorithm,
            options: st.options || {},
            processes: st.processes || [],
            mode: st.mode || 'visualize',
            selectedAlgorithms: isCompare ? algorithm : undefined,
            result: null,
          },
        ],
      });
    }

    chats.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  } catch {
    // Migration best-effort; silently ignore errors.
  }
}

migrateLegacyScenarios();

export function getTheme() {
  return localStorage.getItem(THEME_KEY) || 'light';
}

export function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}
