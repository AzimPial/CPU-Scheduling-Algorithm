/**
 * @fileoverview Algo — Chat thread message manager.
 * Tracks serialized message data alongside DOM for persistence/restoration.
 * @module ui/chatThread
 */

export function createChatThread(threadEl, messagesEl) {
  let messagesData = [];
  let _scrollSuppressed = false;

  function isNearBottom() {
    return threadEl.scrollHeight - threadEl.scrollTop - threadEl.clientHeight < 180;
  }

  function scrollToBottom() {
    if (_scrollSuppressed) return;
    if (!isNearBottom()) return;
    requestAnimationFrame(() => {
      if (_scrollSuppressed) return;
      threadEl.style.scrollBehavior = 'auto';
      threadEl.scrollTop = threadEl.scrollHeight;
      threadEl.style.scrollBehavior = '';
    });
  }

  function forceScrollToBottom() {
    if (_scrollSuppressed) return;
    threadEl.style.scrollBehavior = 'auto';
    threadEl.scrollTop = threadEl.scrollHeight;
    threadEl.style.scrollBehavior = '';
  }

  function suppressScroll(on) {
    _scrollSuppressed = on;
    if (!on) {
      requestAnimationFrame(() => forceScrollToBottom());
    }
  }

  function addUserMessage(text, summary) {
    messagesData.push({ role: 'user', content: text, summary: summary || '' });

    const msg = document.createElement('div');
    msg.className = 'msg msg-user';
    msg.innerHTML = `
      <div class="msg-avatar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
      <div class="msg-content">
        <div class="msg-bubble">
          <div>${escapeHtml(text)}</div>
          ${summary ? `<div class="user-input-summary">${escapeHtml(summary)}</div>` : ''}
        </div>
      </div>
    `;
    messagesEl.appendChild(msg);
    scrollToBottom();
    return msg;
  }

  function addAssistantMessage(contentFn, data) {
    if (data) messagesData.push(data);

    const msg = document.createElement('div');
    msg.className = 'msg msg-assistant';

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>';

    const content = document.createElement('div');
    content.className = 'msg-content';

    msg.appendChild(avatar);
    msg.appendChild(content);
    messagesEl.appendChild(msg);

    const body = document.createElement('div');
    body.className = 'msg-body';
    content.appendChild(body);

    if (typeof contentFn === 'function') {
      contentFn(body);
    } else {
      body.innerHTML = contentFn;
    }

    scrollToBottom();
    return { element: msg, body };
  }

  function addWelcomeCard(onVisualize, onCompare) {
    const msg = document.createElement('div');
    msg.className = 'msg msg-assistant';
    msg.innerHTML = `
      <div class="msg-avatar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12h8"/><path d="M12 8v8"/></svg></div>
      <div class="msg-content">
        <div class="welcome-card">
          <div class="welcome-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div>
          <h2>Algo</h2>
          <p>Watch your algorithms think. Choose an algorithm, input your processes, and see the scheduling happen in real-time with animated Gantt charts, step-by-step traces, and detailed metrics.</p>
          <div class="welcome-features">
            <div class="welcome-feature" data-action="visualize">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              <div class="wf-text"><h4>Visualize</h4><p>Run one algorithm and explore its behavior</p></div>
            </div>
            <div class="welcome-feature" data-action="compare">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
              <div class="wf-text"><h4>Compare</h4><p>Run multiple algorithms side-by-side</p></div>
            </div>
            <div class="welcome-feature" data-action="randomize">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
              <div class="wf-text"><h4>Quick Start</h4><p>Randomize and run with one click</p></div>
            </div>
            <div class="welcome-feature" data-action="shortcuts">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01"/><path d="M10 8h.01"/><path d="M14 8h.01"/><path d="M18 8h.01"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/></svg>
              <div class="wf-text"><h4>Shortcuts</h4><p><kbd>Enter</kbd> run &middot; <kbd>R</kbd> randomize</p></div>
            </div>
          </div>
        </div>
      </div>
    `;

    messagesEl.appendChild(msg);

    msg.querySelector('[data-action="visualize"]')?.addEventListener('click', onVisualize);
    msg.querySelector('[data-action="compare"]')?.addEventListener('click', onCompare);
    msg.querySelector('[data-action="randomize"]')?.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('schedviz:randomize'));
    });
    msg.querySelector('[data-action="shortcuts"]')?.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('schedviz:show-shortcuts'));
    });

    scrollToBottom();
  }

  function clear() {
    messagesEl.innerHTML = '';
    messagesData = [];
  }

  function getMessages() {
    return messagesEl.querySelectorAll('.msg');
  }

  function getMessagesData() {
    return messagesData;
  }

  function setMessagesData(messages) {
    messagesData = messages || [];
  }

  return {
    addUserMessage,
    addAssistantMessage,
    addWelcomeCard,
    clear,
    scrollToBottom,
    suppressScroll,
    getMessages,
    getMessagesData,
    setMessagesData,
  };
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
