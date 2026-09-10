/**
 * @fileoverview Algo — Sidebar chat history manager.
 * @module ui/sidebar
 */

import { loadChats, deleteChat } from '../core/storage.js';

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
    const chats = loadChats();

    let html = '<div class="sidebar-section-label">Recent</div>';

    if (chats.length === 0) {
      html += '<div class="sidebar-empty">No saved chats yet.<br>Run an algorithm to start one.</div>';
    } else {
      for (const c of chats) {
        const msgCount = Array.isArray(c.messages) ? c.messages.filter(m => m.role === 'assistant').length : 0;
        const subtitle = msgCount > 0 ? `${msgCount} run${msgCount > 1 ? 's' : ''}` : '';

        html += `<div class="sidebar-item" data-id="${c.id}" tabindex="0" role="button" aria-label="${escapeHtml(c.title)}">`;
        html += '<svg class="si-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
        html += `<div class="si-text"><span class="si-title">${escapeHtml(c.title || 'New chat')}</span>`;
        if (subtitle) html += `<span class="si-subtitle">${subtitle} &middot; ${formatTime(c.timestamp)}</span>`;
        else html += `<span class="si-subtitle">${formatTime(c.timestamp)}</span>`;
        html += '</div>';
        html += `<span class="si-delete" data-delete-id="${c.id}" title="Delete" role="button" aria-label="Delete ${escapeHtml(c.title)}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>`;
        html += '</div>';
      }
    }

    listEl.innerHTML = html;

    listEl.querySelectorAll('.sidebar-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.si-delete')) {
          e.stopPropagation();
          const id = e.target.closest('.si-delete').dataset.deleteId;
          const chat = chats.find(c => c.id === id);
          deleteChat(id);
          refresh();
          if (chat?.cloudId && callbacks.onDelete) {
            callbacks.onDelete(chat.cloudId);
          }
          return;
        }
        const id = item.dataset.id;
        const chat = chats.find(c => c.id === id);
        if (chat && callbacks.onLoad) {
          callbacks.onLoad(chat);
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
