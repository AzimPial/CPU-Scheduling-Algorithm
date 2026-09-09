/**
 * @fileoverview SchedViz — Sidebar history manager.
 * @module ui/sidebar
 */

import { loadScenarios, deleteScenario } from '../core/storage.js';

/**
 * Create a sidebar manager.
 * @param {HTMLElement} sidebarEl
 * @param {Object} callbacks
 * @param {Function} callbacks.onLoad - Called with scenario state when user clicks an item
 * @param {Function} callbacks.onNew - Called when user clicks "New Chat"
 * @returns {{refresh: () => void}}
 */
export function createSidebar(sidebarEl, callbacks) {
  const listEl = sidebarEl.querySelector('.sidebar-list');

  function formatTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  }

  function refresh() {
    const scenarios = loadScenarios();

    let html = '<div class="sidebar-section-label">Recent</div>';

    if (scenarios.length === 0) {
      html += '<div class="sidebar-empty">No saved sessions yet.<br>Run an algorithm to create one.</div>';
    } else {
      for (const s of scenarios) {
        const isCompare = s.state.mode === 'compare';
        const icon = isCompare
          ? '<svg class="si-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>'
          : '<svg class="si-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>';

        html += `<div class="sidebar-item" data-id="${s.id}" tabindex="0" role="button" aria-label="${s.name}">`;
        html += icon;
        html += `<span class="si-title">${escapeHtml(s.name)}</span>`;
        html += `<span style="font-size:10px;color:var(--text-muted);white-space:nowrap">${formatTime(s.timestamp)}</span>`;
        html += `<span class="si-delete" data-delete-id="${s.id}" title="Delete" role="button" aria-label="Delete ${s.name}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>`;
        html += '</div>';
      }
    }

    listEl.innerHTML = html;

    listEl.querySelectorAll('.sidebar-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.si-delete')) {
          e.stopPropagation();
          const id = e.target.closest('.si-delete').dataset.deleteId;
          deleteScenario(id);
          refresh();
          return;
        }
        const id = item.dataset.id;
        const scenario = scenarios.find(s => s.id === id);
        if (scenario && callbacks.onLoad) {
          callbacks.onLoad(scenario);
        }
      });
    });
  }

  function highlightActive(id) {
    listEl.querySelectorAll('.sidebar-item').forEach(el => {
      el.classList.toggle('active', el.dataset.id === id);
    });
  }

  refresh();

  return { refresh, highlightActive };
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
