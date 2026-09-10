/**
 * @fileoverview Algo — Main application controller.
 * Wires together algorithms, UI, backend sync, settings, and export.
 * @module app
 */

import { ALGORITHMS, getActivePalette, setColorblindPalette } from './core/types.js';
import { saveChat, setChatCloudId, importCloudChats, loadChats, copyShareableLink, decodeState } from './core/storage.js';
import { getSettings, getSetting, getAnimationDuration, initSettings } from './core/settings.js';
import { isLoggedIn, getUsername, clearAuth, apiFetch } from './core/api.js';
import { run as runFCFS } from './algorithms/fcfs.js';
import { run as runSJF } from './algorithms/sjf.js';
import { run as runSRTF } from './algorithms/srtf.js';
import { run as runPriorityNP } from './algorithms/priorityNP.js';
import { run as runPriorityP } from './algorithms/priorityP.js';
import { run as runRoundRobin } from './algorithms/roundRobin.js';
import { run as runHRRN } from './algorithms/hrrn.js';
import { run as runAging } from './algorithms/aging.js';
import { run as runMLQ } from './algorithms/mlq.js';
import { run as runMLFQ } from './algorithms/mlfq.js';
import { run as runRateMonotonic } from './algorithms/rateMonotonic.js';
import { run as runEDF } from './algorithms/earliestDeadlineFirst.js';
import { run as runDeadlineMonotonic } from './algorithms/deadlineMonotonic.js';
import { run as runLLF } from './algorithms/leastLaxityFirst.js';
import { run as runRateMonotonicNP } from './algorithms/rateMonotonicNP.js';
import { run as runEDFNP } from './algorithms/edfNonPreemptive.js';
import { run as runPriorityInheritance } from './algorithms/priorityInheritance.js';
import { run as runFixedPriorityNP } from './algorithms/fixedPriorityNP.js';
import { run as runPollingServer } from './algorithms/pollingServer.js';
import { run as runWRR } from './algorithms/weightedRoundRobin.js';
import { run as runWFQ } from './algorithms/weightedFairQueueing.js';
import { run as runFairShareNice } from './algorithms/fairShareNice.js';
import { run as runDRR } from './algorithms/deficitRoundRobin.js';
import { run as runLottery } from './algorithms/lottery.js';
import { run as runWFShareDynamic } from './algorithms/weightedFairShareDynamic.js';
import { run as runCFS } from './algorithms/completelyFairScheduler.js';
import { run as runBFS } from './algorithms/brainFuckScheduler.js';
import { run as runSchedDeadline } from './algorithms/schedDeadline.js';
import { run as runOmniVR } from './algorithms/omniVR.js';
import { run as runIdleBalancing } from './algorithms/schedIdleBalancing.js';
import { renderGantt } from './ui/ganttRenderer.js';
import { renderResultsTable, renderMetricCards, resultsToCSV, downloadCSV } from './ui/resultsTable.js';
import { createChatThread } from './ui/chatThread.js';
import { createSidebar } from './ui/sidebar.js';
import { createInputBar } from './ui/inputBar.js';
import { initTheme, applyTheme, resolveTheme } from './ui/theme.js';
import { showAlgorithmInfo, showShortcutsModal, close as closeModal } from './ui/modal.js';
import { showSettingsModal } from './ui/settings.js';
import { createShareExportPopover, showToast } from './ui/shareExport.js';
import { createResultsEditor } from './ui/resultsEditor.js';

const ALGO_RUNNERS = {
  fcfs: runFCFS,
  sjf: runSJF,
  srtf: runSRTF,
  priorityNP: runPriorityNP,
  priorityP: runPriorityP,
  roundRobin: runRoundRobin,
  hrrn: runHRRN,
  aging: runAging,
  mlq: runMLQ,
  mlfq: runMLFQ,
  rateMonotonic: runRateMonotonic,
  earliestDeadlineFirst: runEDF,
  deadlineMonotonic: runDeadlineMonotonic,
  leastLaxityFirst: runLLF,
  rateMonotonicNP: runRateMonotonicNP,
  edfNonPreemptive: runEDFNP,
  priorityInheritance: runPriorityInheritance,
  fixedPriorityNP: runFixedPriorityNP,
  pollingServer: runPollingServer,
  weightedRoundRobin: runWRR,
  weightedFairQueueing: runWFQ,
  fairShareNice: runFairShareNice,
  deficitRoundRobin: runDRR,
  lottery: runLottery,
  weightedFairShareDynamic: runWFShareDynamic,
  completelyFairScheduler: runCFS,
  brainFuckScheduler: runBFS,
  schedDeadline: runSchedDeadline,
  omniVR: runOmniVR,
  schedIdleBalancing: runIdleBalancing
};

let currentMode = 'visualize';
let currentChatId = null;
let lastResult = null;
let lastRunData = null;
let activeCharts = [];
let restoreGen = 0;

function debounce(fn, ms) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}

document.addEventListener('DOMContentLoaded', init);

function init() {
  const threadEl = document.getElementById('chat-thread');
  const messagesEl = document.getElementById('chat-messages');
  const sidebarEl = document.getElementById('sidebar');
  const inputBarEl = document.getElementById('input-bar-inner');
  const themeBtn = document.getElementById('btn-theme');
  const hamburgerBtn = document.getElementById('btn-hamburger');
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  applySettingsToPage();
  updateColorblindClass();

  const theme = initTheme(themeBtn);
  const chat = createChatThread(threadEl, messagesEl);

  let inputBar;

  const onRun = (runData) => {
    executeAndRender(runData, chat, inputBar);
  };

  const urlState = decodeState();

  inputBar = createInputBar(inputBarEl, {
    onRun,
    initialState: urlState
  });

  if (urlState) {
    currentMode = urlState.mode || 'visualize';
    updateModeTabs(currentMode);
    inputBar.setMode(currentMode);
    if (urlState.processes) {
      inputBar.setProcesses(urlState.processes);
    }
    if (urlState.algorithm && currentMode === 'visualize') {
      inputBar.setAlgorithm(urlState.algorithm);
    }
    if (urlState.selectedAlgorithms) {
      inputBar.setSelectedAlgorithms(urlState.selectedAlgorithms);
    }
    if (urlState.options?.quantum) {
      inputBar.setQuantum(urlState.options.quantum);
    }
  }

  const sidebar = createSidebar(sidebarEl, {
    onLoad: (chatData) => {
      const token = ++restoreGen;
      destroyCharts();
      currentChatId = chatData.id;
      chat.clear();
      sidebar.highlightActive(currentChatId);

      chat.setMessagesData(chatData.messages || []);

      const messages = chatData.messages || [];
      let idx = 0;
      chat.suppressScroll(true);

      function renderNext() {
        if (token !== restoreGen) return;
        if (idx >= messages.length) {
          chat.suppressScroll(false);
          closeModal();
          if (sidebarOverlay) sidebarOverlay.classList.remove('active');
          return;
        }
        const msg = messages[idx++];
        if (msg.role === 'user') {
          chat.addUserMessage(msg.content, msg.summary);
          renderNext();
        } else if (msg.role === 'assistant') {
          if (msg.result) {
            if (msg.mode === 'compare') {
              renderComparison(msg.algorithm, msg.options, msg.processes, chat, msg.result, true);
            } else {
              renderSingle(msg.algorithm, msg.options, msg.processes, chat, msg.result, true);
            }
            requestAnimationFrame(renderNext);
          } else if (msg.algorithm) {
            if (msg.mode === 'compare') {
              renderComparison(msg.algorithm, msg.options, msg.processes, chat, undefined, true);
            } else {
              renderSingle(msg.algorithm, msg.options, msg.processes, chat, undefined, true);
            }
            requestAnimationFrame(renderNext);
          } else {
            renderNext();
          }
        } else {
          renderNext();
        }
      }
      requestAnimationFrame(renderNext);
    },
    onDelete: (cloudId) => {
      apiFetch('DELETE', `/api/scenarios/${encodeURIComponent(cloudId)}`);
    },
    onNew: () => {
      resetToWelcome(chat, inputBar, sidebar);
    }
  });

  document.addEventListener('schedviz:sidebar-refresh', () => sidebar.refresh());

  document.getElementById('btn-new-chat')?.addEventListener('click', () => {
    resetToWelcome(chat, inputBar, sidebar);
  });

  document.getElementById('btn-settings')?.addEventListener('click', () => {
    showSettingsModal();
  });

  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      setMode(tab.dataset.mode);
    });
  });

  function resetToWelcome(chat, inputBar, sidebar) {
    restoreGen++;
    destroyCharts();
    if (currentChatId) {
      const msgs = chat.getMessagesData();
      if (msgs.length > 0) {
        const title = msgs.find(m => m.role === 'user')?.content || 'New chat';
        saveChat({
          id: currentChatId,
          title: title.substring(0, 60),
          timestamp: Date.now(),
          messages: msgs,
        });
        if (isLoggedIn()) syncChatToCloud(currentChatId);
      }
    }

    currentChatId = null;
    lastRunData = null;
    lastResult = null;
    chat.clear();
    inputBar.resetToDefaults();
    currentMode = 'visualize';
    updateModeTabs('visualize');
    sidebar.highlightActive(null);
    chat.addWelcomeCard(
      () => { setMode('visualize'); },
      () => { setMode('compare'); }
    );
  }

  function setMode(mode) {
    currentMode = mode;
    updateModeTabs(mode);
    inputBar.setMode(mode);
  }

  function updateModeTabs(mode) {
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === mode);
    });
  }

  hamburgerBtn?.addEventListener('click', () => {
    sidebarEl.classList.toggle('open');
    sidebarOverlay?.classList.toggle('active');
  });
  sidebarOverlay?.addEventListener('click', () => {
    sidebarEl.classList.remove('open');
    sidebarOverlay.classList.remove('active');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.target.closest('input, textarea, select') && !e.target.closest('.send-btn')) {
      e.preventDefault();
      document.getElementById('btn-run')?.click();
    }
    if (e.key === 'r' && !e.target.closest('input, textarea, select') && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      document.getElementById('btn-randomize')?.click();
    }
    if (e.key === 'Escape') {
      closeModal();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      document.getElementById('btn-new-chat')?.click();
    }
  });

  document.addEventListener('schedviz:randomize', () => {
    document.getElementById('btn-randomize')?.click();
  });
  document.addEventListener('schedviz:show-shortcuts', () => {
    showShortcutsModal();
  });

  document.getElementById('btn-shortcuts')?.addEventListener('click', () => {
    showShortcutsModal();
  });

  initAuthUI();

  if (isLoggedIn()) loadCloudChats(sidebar);

  const landing = getSetting('defaultLanding');
  if (!urlState && (landing === 'visualize' || landing === 'compare')) {
    setMode(landing);
  }

  chat.addWelcomeCard(
    () => { setMode('visualize'); },
    () => { setMode('compare'); }
  );

  if (getSetting('autoRun')) {
    const debounceRun = debounce(() => {
      if (!lastRunData || !inputBar) return;
      const processes = inputBar.getProcesses();
      const algo = currentMode === 'compare' ? inputBar.getSelectedAlgorithms() : inputBar.getAlgorithm();
      if (currentMode === 'compare' && (!Array.isArray(algo) || algo.length < 2)) return;
      const opts = inputBar.getOptions();
      executeAndRender({ algorithm: algo, options: opts, processes, mode: currentMode }, chat, inputBar);
    }, 400);
    inputBarEl.addEventListener('input', (e) => {
      if (e.target.closest('.process-table')) debounceRun();
    });
  }

  if (urlState?.autoRun) {
    const autoRunData = {
      algorithm: currentMode === 'compare' ? (urlState.selectedAlgorithms || ['fcfs', 'sjf']) : (urlState.algorithm || 'fcfs'),
      options: urlState.options || {},
      processes: urlState.processes || inputBar.getProcesses(),
      mode: currentMode
    };
    setTimeout(() => executeAndRender(autoRunData, chat, inputBar), 400);
  }
}

/* ---- Settings application ---- */
function applySettingsToPage() {
  initSettings();
  const settings = getSettings();
  const pref = settings.theme;
  if (pref === 'system') {
    applyTheme(resolveTheme('system'));
  } else {
    applyTheme(pref);
  }
  document.body.style.setProperty('--anim-duration', getAnimationDuration() + 'ms');
}

function updateColorblindClass() {
  const active = !!getSetting('colorblindPalette');
  setColorblindPalette(active);
  document.body.classList.toggle('colorblind', active);
}

/* ---- Auth UI ---- */
function initAuthUI() {
  const chip = document.getElementById('profile-chip');
  const navBtn = document.getElementById('btn-login-nav');
  const nameEl = document.getElementById('profile-name');
  const avatarEl = document.getElementById('profile-avatar');
  const dropdown = document.getElementById('profile-dropdown');

  const showChip = (username) => {
    if (chip) chip.classList.remove('hidden');
    if (navBtn) navBtn.classList.add('hidden');
    if (nameEl) nameEl.textContent = username;
    if (avatarEl) avatarEl.textContent = (username || 'U')[0].toUpperCase();
  };
  const showGuest = () => {
    if (chip) chip.classList.add('hidden');
    if (navBtn) navBtn.classList.remove('hidden');
  };

  if (isLoggedIn()) {
    const username = getUsername();
    showChip(username);
    apiFetch('GET', '/api/auth/me').then(({ data }) => {
      if (data?.username) {
        showChip(data.username);
        localStorage.setItem('algo_username', data.username);
      } else {
        clearAuth();
        showGuest();
      }
    });
  } else {
    showGuest();
  }

  if (chip) {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dropdown) dropdown.classList.toggle('hidden');
    });
    document.addEventListener('click', () => {
      if (dropdown) dropdown.classList.add('hidden');
    });
  }

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    clearAuth();
    showGuest();
    showToast('Logged out');
    if (dropdown) dropdown.classList.add('hidden');
  });
}

/* ---- Execution & Rendering ---- */
function executeAndRender(runData, chat, inputBar) {
  const { algorithm, options, processes, mode } = runData;
  lastRunData = runData;

  if (!currentChatId) {
    currentChatId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  let summaryText = '';
  if (mode === 'compare') {
    const names = algorithm.map(k => ALGORITHMS[k]?.name || k).join(', ');
    summaryText = `Comparing: ${names} | ${processes.length} processes`;
  } else {
    const algoInfo = ALGORITHMS[algorithm];
    summaryText = `Algorithm: ${algoInfo?.fullName || algorithm}${algoInfo?.needsQuantum ? ` (q=${options.quantum})` : ''} | ${processes.length} processes`;
  }

  let inputSummary = processes.map(p => {
    const parts = [`A=${p.arrivalTime}`, `B=${p.burstTime}`];
    for (const f of ['priority', 'deadline', 'period', 'wcet', 'tickets', 'weight', 'nice', 'share', 'queue']) {
      if (p[f] !== undefined) parts.push(`${f[0].toUpperCase()}${f.slice(1)}=${p[f]}`);
    }
    return `${p.id}(${parts.join(',')})`;
  }).join(', ');

  chat.addUserMessage(summaryText, inputSummary);

  if (mode === 'compare') {
    renderComparison(algorithm, options, processes, chat);
  } else {
    renderSingle(algorithm, options, processes, chat);
  }

  const msgs = chat.getMessagesData();
  const title = msgs.find(m => m.role === 'user')?.content || summaryText;
  const chatObj = {
    id: currentChatId,
    title: title.substring(0, 60),
    timestamp: Date.now(),
    messages: msgs,
  };
  saveChat(chatObj);

  document.dispatchEvent(new CustomEvent('schedviz:sidebar-refresh'));

  const sidebarList = document.querySelector('.sidebar-list');
  if (sidebarList) {
    sidebarList.querySelectorAll('.sidebar-item').forEach(el => {
      el.classList.toggle('active', el.dataset.id === currentChatId);
    });
  }

  if (isLoggedIn()) syncChatToCloud(currentChatId);
}

async function syncChatToCloud(chatId) {
  const chats = loadChats();
  const chatObj = chats.find(c => c.id === chatId);
  if (!chatObj) return;

  const { error } = await apiFetch('POST', '/api/scenarios', {
    clientChatId: chatId,
    title: chatObj.title,
    messages: chatObj.messages,
  });
  if (!error) setChatCloudId(chatId);
}

/* ---- Cloud chat loading ---- */
async function loadCloudChats(sidebar) {
  if (!isLoggedIn()) return;
  const { data, error } = await apiFetch('GET', '/api/scenarios');
  if (error || !Array.isArray(data)) return;
  importCloudChats(data);
  sidebar.refresh();
}

/* ---- renderSingle (Module 1) ---- */
function renderSingle(algorithmKey, options, processes, chat, precomputedResult, restoreMode) {
  const runner = ALGO_RUNNERS[algorithmKey];
  if (!runner) return;

  const result = precomputedResult || (() => { const r = runner(processes, options); r.algorithmKey = algorithmKey; return r; })();
  lastResult = result;

  const algoInfo = ALGORITHMS[algorithmKey];
  const activeFields = ['arrivalTime', 'burstTime', ...(algoInfo?.fields || []).filter(f => f !== 'arrivalTime' && f !== 'burstTime')];

  let resultRegion = null;
  let textEl = null;
  let liveReRun = null;

  chat.addAssistantMessage((body) => {
    const text = document.createElement('div');
    text.className = 'msg-text';
    text.innerHTML = `<strong>${result.algorithm}</strong> completed. Avg wait: <strong>${result.avgWaitingTime.toFixed(2)}</strong> | CPU utilization: <strong>${result.cpuUtilization.toFixed(1)}%</strong>`;
    body.appendChild(text);
    textEl = text;

    const actionsBar = document.createElement('div');
    actionsBar.className = 'result-actions';
    actionsBar.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;';
    actionsBar.innerHTML = `
      <button class="btn btn-sm btn-ghost info-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> About</button>
      <button class="btn btn-sm btn-ghost export-csv-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> CSV</button>
    `;
    body.appendChild(actionsBar);

    actionsBar.querySelector('.info-btn')?.addEventListener('click', () => showAlgorithmInfo(algorithmKey));
    actionsBar.querySelector('.export-csv-btn')?.addEventListener('click', () => {
      const csv = resultsToCSV(result, algorithmKey);
      downloadCSV(csv, `${result.algorithm.replace(/[^a-z0-9]/gi, '_')}_results.csv`);
    });

    createShareExportPopover(body, { result, algorithmKey, processes, options, mode: 'visualize' });

    resultRegion = document.createElement('div');
    resultRegion.className = 'result-region';
    body.appendChild(resultRegion);

    const editorSection = document.createElement('div');
    editorSection.className = 'results-editor';
    body.appendChild(editorSection);

    createResultsEditor({
      container: editorSection,
      processes: processes.map(p => ({ ...p })),
      algorithmKey,
      activeFields,
      onEdit: (procs) => { if (liveReRun) liveReRun(procs); },
      onAddRow: () => {},
      onRemoveRow: () => {},
      onReset: null
    });

    renderResultContent(resultRegion, algorithmKey, options, processes, result, restoreMode);
  },
  {
    role: 'assistant',
    algorithm: algorithmKey,
    options,
    processes,
    mode: 'visualize',
    result,
    content: `Algorithm: ${result.algorithm} completed.`
  });

  liveReRun = function (procs) {
    if (!Array.isArray(procs)) return;
    const updatedOptions = { ...options };
    const newResult = ALGO_RUNNERS[algorithmKey](procs, updatedOptions);
    lastResult = newResult;
    if (resultRegion) {
      destroyCharts();
      resultRegion.innerHTML = '';
      renderResultContent(resultRegion, algorithmKey, updatedOptions, procs, newResult);
    }
    if (textEl) {
      textEl.innerHTML = `<strong>${newResult.algorithm}</strong> completed. Avg wait: <strong>${newResult.avgWaitingTime.toFixed(2)}</strong> | CPU utilization: <strong>${newResult.cpuUtilization.toFixed(1)}%</strong>`;
    }
  };
}

function renderResultContent(region, algorithmKey, options, processes, result, restoreMode) {
  const resultCard = document.createElement('div');
  resultCard.className = 'result-card';

  const ganttWrapper = document.createElement('div');
  ganttWrapper.className = 'gantt-container';
  resultCard.appendChild(ganttWrapper);

  const ganttResult = renderGantt(ganttWrapper, result, { animate: !restoreMode });
  const traceWrapper = document.createElement('div');
  resultCard.appendChild(traceWrapper);
  createTraceControls(traceWrapper, result, ganttWrapper, processes);

  region.appendChild(resultCard);

  const tableCard = document.createElement('div');
  tableCard.className = 'result-card';
  tableCard.style.marginTop = '12px';
  renderResultsTable(tableCard, result, { algorithmKey });
  region.appendChild(tableCard);

  if (result.realTime && result.allDeadlinesMet !== undefined) {
    const rtVerdict = document.createElement('div');
    rtVerdict.className = 'rt-verdict';
    rtVerdict.style.marginTop = '12px';
    rtVerdict.style.padding = '10px 12px';
    rtVerdict.style.borderRadius = 'var(--radius-md)';
    rtVerdict.style.fontSize = '13px';
    const met = result.allDeadlinesMet;
    rtVerdict.style.backgroundColor = met ? 'rgba(39,174,96,0.1)' : 'rgba(192,57,43,0.1)';
    rtVerdict.style.border = '1px solid ' + (met ? 'var(--success)' : 'var(--danger)');
    const misses = (result.deadlineMissedAt || []).length;
    rtVerdict.innerHTML = met
      ? '<strong>All deadlines met</strong> — task set is schedulable under this policy.'
      : `<strong>${misses} missed deadline${misses === 1 ? '' : 's'}</strong> — task set is <b>not</b> schedulable under this policy. (Simplified educational simulation.)`;
    region.appendChild(rtVerdict);
  }

  const metricsCard = document.createElement('div');
  metricsCard.style.marginTop = '12px';
  renderMetricCards(metricsCard, result);
  region.appendChild(metricsCard);

  if (options.quantum && ALGORITHMS[algorithmKey]?.needsQuantum) {
    const qLive = document.createElement('div');
    qLive.className = 'quantum-live';
    qLive.style.marginTop = '12px';
    qLive.style.padding = '8px 12px';
    qLive.style.background = 'var(--bg-tertiary)';
    qLive.style.borderRadius = 'var(--radius-md)';
    qLive.innerHTML = `
      <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">Quantum</span>
      <input type="range" min="1" max="20" value="${options.quantum}" class="quantum-slider" aria-label="Time quantum">
      <input type="number" min="1" max="20" value="${options.quantum}" class="quantum-num" style="width:56px;padding:3px 6px;font-size:12px;text-align:center">
    `;
    const applyQ = (q) => {
      q = Math.max(1, Math.min(20, parseInt(q) || 2));
      qLive.querySelector('.quantum-slider').value = q;
      qLive.querySelector('.quantum-num').value = q;
      liveReRunQuantum(processes, q);
    };
    qLive.querySelector('.quantum-slider').addEventListener('input', (e) => applyQ(e.target.value));
    qLive.querySelector('.quantum-num').addEventListener('change', (e) => applyQ(e.target.value));
    region.appendChild(qLive);

    function liveReRunQuantum(procs, q) {
      const newOptions = { ...options, quantum: q };
      const newResult = ALGO_RUNNERS[algorithmKey](procs, newOptions);
      lastResult = newResult;
      destroyCharts();
      region.innerHTML = '';
      renderResultContent(region, algorithmKey, newOptions, procs, newResult);
      const msgBody = region.closest('.msg-body');
      const text = msgBody ? msgBody.querySelector('.msg-text') : null;
      if (text) text.innerHTML = `<strong>${newResult.algorithm}</strong> completed. Avg wait: <strong>${newResult.avgWaitingTime.toFixed(2)}</strong> | CPU utilization: <strong>${newResult.cpuUtilization.toFixed(1)}%</strong>`;
    }
  }
}

function destroyCharts() {
  while (activeCharts.length) {
    const c = activeCharts.pop();
    if (c && typeof c.destroy === 'function') c.destroy();
  }
  document.querySelectorAll('.chart-container canvas').forEach(cv => {
    if (cv._chart) cv._chart.destroy();
  });
}

/* ---- renderComparison (Module 2) ---- */
function renderComparison(algorithmKeys, options, processes, chat, precomputedResults, restoreMode) {
  const results = precomputedResults || algorithmKeys.map(key => {
    const runner = ALGO_RUNNERS[key];
    if (!runner) return null;
    const r = runner(processes, options);
    if (r) r.algorithmKey = key;
    return r;
  }).filter(Boolean);

  chat.addAssistantMessage((body) => {
    const text = document.createElement('div');
    text.className = 'msg-text';
    text.innerHTML = `Compared <strong>${results.length}</strong> algorithms across <strong>${processes.length}</strong> processes.`;
    body.appendChild(text);

    const actionsBar = document.createElement('div');
    actionsBar.className = 'result-actions';
    actionsBar.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;margin:8px 0;';
    actionsBar.innerHTML = `
      <button class="btn btn-sm btn-ghost export-csv-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> CSV</button>
    `;
    body.appendChild(actionsBar);

    actionsBar.querySelector('.export-csv-btn')?.addEventListener('click', () => {
      let csv = 'Algorithm,Avg Waiting Time,Avg Turnaround Time,Idle Time,CPU Utilization,Context Switches\n';
      for (const r of results) {
        csv += `"${r.algorithm}",${r.avgWaitingTime.toFixed(2)},${r.avgTurnaroundTime.toFixed(2)},${r.totalIdleTime},${r.cpuUtilization.toFixed(1)}%,${r.contextSwitches}\n`;
      }
      downloadCSV(csv, 'comparison_results.csv');
    });

    createShareExportPopover(body, { result: results[0], algorithmKey: 'compare', processes, selectedAlgorithms: algorithmKeys, options, mode: 'compare' });

    const resultRegion = document.createElement('div');
    resultRegion.className = 'result-region';
    body.appendChild(resultRegion);

    renderComparisonContent(resultRegion, algorithmKeys, options, processes, results, restoreMode);

    const editorSection = document.createElement('div');
    editorSection.className = 'results-editor';
    body.appendChild(editorSection);

    createResultsEditor({
      container: editorSection,
      processes: processes.map(p => ({ ...p })),
      algorithmKey: 'compare',
      activeFields: ['arrivalTime', 'burstTime'],
      onEdit: (procs) => liveReRunCompare(procs),
      onAddRow: () => {},
      onRemoveRow: () => {}
    });

    function liveReRunCompare(procs) {
      if (!Array.isArray(procs)) return;
      const newResults = algorithmKeys.map(key => {
        const runner = ALGO_RUNNERS[key];
        if (!runner) return null;
        const r = runner(procs, options);
        if (r) r.algorithmKey = key;
        return r;
      }).filter(Boolean);
      destroyCharts();
      resultRegion.innerHTML = '';
      renderComparisonContent(resultRegion, algorithmKeys, options, procs, newResults);
    }
  },
  {
    role: 'assistant',
    algorithm: algorithmKeys,
    options,
    processes,
    mode: 'compare',
    result: results,
    content: `Compared ${results.length} algorithms.`
  });
}

function renderComparisonContent(region, algorithmKeys, options, processes, results, restoreMode) {
  const ganttGroup = document.createElement('div');
  ganttGroup.className = 'comparison-gantt-group';
  region.appendChild(ganttGroup);

  const algoPalette = getActivePalette('algo');
  results.forEach((result, idx) => {
    const item = document.createElement('div');
    item.className = 'comparison-gantt-item';
    const label = document.createElement('div');
    label.className = 'algo-label';
    label.style.color = algoPalette[idx % algoPalette.length];
    label.textContent = result.algorithm;
    item.appendChild(label);

    const ganttContainer = document.createElement('div');
    ganttContainer.className = 'gantt-container';
    item.appendChild(ganttContainer);
    ganttGroup.appendChild(item);

    renderGantt(ganttContainer, result, { maxWidth: 800, animate: !restoreMode });
  });

  renderComparisonCharts(region, results, restoreMode);

  renderVerdictCard(region, results, processes);

  renderPerAlgorithmTables(region, results);

  const rankTable = document.createElement('div');
  rankTable.className = 'result-card';
  rankTable.style.marginTop = '12px';
  const ranked = [...results].sort((a, b) => a.avgWaitingTime - b.avgWaitingTime);
  let rankHtml = '<table class="data-table"><thead><tr><th>Rank</th><th>Algorithm</th><th>Avg Wait</th><th>Avg Turnaround</th><th>Idle Time</th><th>CPU Util</th></tr></thead><tbody>';
  ranked.forEach((r, i) => {
    const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    rankHtml += `<tr><td><span class="rank-badge ${rankClass}">${i + 1}</span></td><td>${r.algorithm}</td><td>${r.avgWaitingTime.toFixed(2)}</td><td>${r.avgTurnaroundTime.toFixed(2)}</td><td>${r.totalIdleTime}</td><td>${r.cpuUtilization.toFixed(1)}%</td></tr>`;
  });
  rankHtml += '</tbody></table>';
  rankTable.innerHTML = rankHtml;
  region.appendChild(rankTable);
}

function renderComparisonCharts(region, results, restoreMode) {
  const chartsGrid = document.createElement('div');
  chartsGrid.className = 'charts-grid';
  chartsGrid.style.marginTop = '16px';
  region.appendChild(chartsGrid);

  const metricsToChart = [
    { key: 'avgWaitingTime', label: 'Average Waiting Time' },
    { key: 'avgTurnaroundTime', label: 'Average Turnaround Time' },
    { key: 'totalIdleTime', label: 'CPU Idle Time' }
  ];

  for (const metric of metricsToChart) {
    const chartCard = document.createElement('div');
    chartCard.className = 'chart-card';
    const title = document.createElement('h4');
    title.textContent = metric.label;
    chartCard.appendChild(title);
    const canvas = document.createElement('canvas');
    chartCard.appendChild(canvas);
    chartsGrid.appendChild(chartCard);

    const algoPalette = getActivePalette('algo');
    if (typeof Chart !== 'undefined') {
      const chart = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: results.map(r => r.algorithm),
          datasets: [{
            data: results.map(r => r[metric.key]),
            backgroundColor: results.map((_, i) => algoPalette[i % algoPalette.length]),
            borderRadius: 4,
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          animation: restoreMode ? false : undefined,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(128,128,128,0.12)' }, ticks: { color: 'var(--text-muted)', font: { family: 'JetBrains Mono', size: 10 } } },
            x: { grid: { display: false }, ticks: { color: 'var(--text-muted)', font: { family: 'JetBrains Mono', size: 10 } } }
          }
        }
      });
      activeCharts.push(chart);
      canvas._chart = chart;
    }
  }

  const perProcCard = document.createElement('div');
  perProcCard.className = 'chart-card';
  const perProcTitle = document.createElement('h4');
  perProcTitle.textContent = 'Turnaround Time per Process';
  perProcCard.appendChild(perProcTitle);
  const perProcCanvas = document.createElement('canvas');
  perProcCard.appendChild(perProcCanvas);
  perProcCard.style.gridColumn = '1 / -1';
  chartsGrid.appendChild(perProcCard);

  if (typeof Chart !== 'undefined' && results.length) {
    const procLabels = results[0].processResults.map(pr => pr.id);
    const algoPalette = getActivePalette('algo');
    const chart = new Chart(perProcCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: procLabels,
        datasets: results.map((r, i) => ({
          label: r.algorithm,
          data: r.processResults.map(pr => pr.turnaroundTime),
          backgroundColor: algoPalette[i % algoPalette.length],
          borderRadius: 3,
          borderWidth: 0
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: restoreMode ? false : undefined,
        plugins: {
          legend: { position: 'top', labels: { font: { family: 'Inter', size: 10 }, color: 'var(--text-muted)' } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: 'var(--text-muted)', font: { family: 'JetBrains Mono', size: 10 } } },
          y: { beginAtZero: true, grid: { color: 'rgba(128,128,128,0.12)' }, ticks: { color: 'var(--text-muted)', font: { family: 'JetBrains Mono', size: 10 } } }
        }
      }
    });
    activeCharts.push(chart);
    perProcCanvas._chart = chart;
  }
}

function renderVerdictCard(region, results, processes) {
  const ranked = [...results].sort((a, b) => a.avgWaitingTime - b.avgWaitingTime);
  const best = ranked[0];
  const runnerUp = ranked[1];
  const gap = runnerUp ? runnerUp.avgWaitingTime - best.avgWaitingTime : 0;

  let outlierText = '';
  const waitByProcess = {};
  for (const r of results) {
    for (const pr of r.processResults) {
      if (!waitByProcess[pr.id]) waitByProcess[pr.id] = [];
      waitByProcess[pr.id].push({ algo: r.algorithm, wait: pr.waitingTime });
    }
  }
  let worstRange = -1;
  let worstProc = null;
  let worstAlgo = null;
  let worstWait = 0;
  for (const [id, arr] of Object.entries(waitByProcess)) {
    const waits = arr.map(x => x.wait);
    const range = Math.max(...waits) - Math.min(...waits);
    if (range > worstRange) {
      worstRange = range;
      worstProc = id;
      const maxWait = Math.max(...waits);
      const entry = arr.find(x => x.wait === maxWait);
      worstAlgo = entry.algo;
      worstWait = maxWait;
    }
  }
  const benchmark = best.avgWaitingTime.toFixed(2);
  const gapStr = gap.toFixed(2);

  const verdict = document.createElement('div');
  verdict.className = 'verdict-card';
  verdict.innerHTML = `
    <h4>Scheduling verdict</h4>
    <p><span class="verdict-best">${best.algorithm}</span> achieved the lowest average waiting time for this input (${benchmark} time units).${runnerUp ? ` <strong>${runnerUp.algorithm}</strong> came second, ${gapStr} time units slower on average.` : ''}</p>
    ${worstProc && worstRange > 0 ? `<p class="verdict-note">Note: ${worstProc}, with the longest burst time, waited significantly longer under ${worstAlgo} (${worstWait.toFixed(2)} time units) than under other policies — a classic starvation risk with shortest-job-first scheduling.</p>` : ''}
  `;
  region.appendChild(verdict);
}

function renderPerAlgorithmTables(region, results) {
  const expandRow = document.createElement('div');
  expandRow.className = 'expand-toggle';
  expandRow.innerHTML = '<button class="btn btn-sm btn-ghost expand-all-btn">Compare all expanded</button>';
  region.appendChild(expandRow);
  const expandBtn = expandRow.querySelector('.expand-all-btn');

  results.forEach((result) => {
    const acc = document.createElement('div');
    acc.className = 'accordion';
    const header = document.createElement('div');
    header.className = 'accordion-header';
    header.innerHTML = `<span class="accordion-chevron">▶</span><span>${result.algorithm}</span>`;
    header.addEventListener('click', () => {
      header.classList.toggle('open');
      body.classList.toggle('open');
    });
    const body = document.createElement('div');
    body.className = 'accordion-body';
    renderResultsTable(body, result, { algorithmKey: result.algorithmKey });
    acc.appendChild(header);
    acc.appendChild(body);
    region.appendChild(acc);
  });

  expandBtn?.addEventListener('click', () => {
    const all = expandBtn.textContent.includes('expanded');
    region.querySelectorAll('.accordion-header').forEach(h => {
      h.classList.toggle('open', all);
      const b = h.nextElementSibling;
      if (b) b.classList.toggle('open', all);
    });
    expandBtn.textContent = all ? 'Collapse all' : 'Compare all expanded';
  });
}

/* ---- Trace Controls ---- */
function createTraceControls(container, result, ganttContainer, processes) {
  const gantt = result.gantt;
  if (!gantt || gantt.length === 0) return;

  const totalTime = result.totalTime;
  let currentTime = 0;
  let isPlaying = false;
  let playInterval = null;

  container.innerHTML = `
    <div class="trace-controls">
      <button class="btn-icon trace-btn trace-reset" aria-label="Reset"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></button>
      <button class="btn-icon trace-btn trace-prev" aria-label="Step back"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg></button>
      <button class="btn-icon trace-btn trace-play" aria-label="Play"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg></button>
      <button class="btn-icon trace-btn trace-next" aria-label="Step forward"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg></button>
      <input type="range" class="trace-slider" min="0" max="${totalTime}" value="0" step="1">
      <span class="trace-time mono">t=0</span>
    </div>
    <div class="ready-queue-display">
      <span class="rq-label">Ready Queue:</span>
      <span class="rq-content"></span>
    </div>
  `;

  const slider = container.querySelector('.trace-slider');
  const timeLabel = container.querySelector('.trace-time');
  const rqContent = container.querySelector('.rq-content');
  const playBtn = container.querySelector('.trace-play');

  function updateTrace(t) {
    currentTime = Math.max(0, Math.min(t, totalTime));
    slider.value = currentTime;
    timeLabel.textContent = `t=${currentTime}`;

    const blocks = ganttContainer.querySelectorAll('.gantt-block');
    blocks.forEach(block => {
      const start = parseFloat(block.dataset.start);
      const end = parseFloat(block.dataset.end);
      block.classList.remove('trace-active', 'trace-dimmed');
      if (currentTime >= start && currentTime < end) {
        block.classList.add('trace-active');
      } else if (currentTime >= end) {
        block.classList.add('trace-dimmed');
      }
    });

    const runningBlock = gantt.find(b => currentTime >= b.start && currentTime < b.end);
    const runningId = runningBlock ? runningBlock.processId : null;

    const procIndex = new Map(processes.map((p, i) => [p.id, i]));

    function isFinished(id, t) {
      return gantt.some(b => b.processId === id && b.end <= t);
    }

    const rqHtmlArr = [];
    const procPalette = getActivePalette();
    for (const p of processes) {
      if (p.arrivalTime > currentTime) continue;
      if (isFinished(p.id, currentTime)) continue;
      const isRunning = p.id === runningId;
      const color = procPalette[procIndex.get(p.id) % procPalette.length];
      rqHtmlArr.push(`<span class="rq-chip${isRunning ? ' rq-running' : ''}" style="background:${color}">${p.id}${isRunning ? ' (running)' : ''}</span>`);
    }
    let rqHtml = rqHtmlArr.join('');
    if (!rqHtml) rqHtml = '<span style="color:var(--text-muted)">—</span>';
    rqContent.innerHTML = rqHtml;
  }

  slider.addEventListener('input', (e) => {
    updateTrace(parseInt(e.target.value));
  });

  container.querySelector('.trace-reset')?.addEventListener('click', () => {
    stopPlay();
    updateTrace(0);
  });
  container.querySelector('.trace-prev')?.addEventListener('click', () => {
    stopPlay();
    const prevBlock = [...gantt].reverse().find(b => b.start < currentTime);
    updateTrace(prevBlock ? prevBlock.start : 0);
  });
  container.querySelector('.trace-next')?.addEventListener('click', () => {
    stopPlay();
    const nextBlock = gantt.find(b => b.start > currentTime);
    updateTrace(nextBlock ? nextBlock.start : totalTime);
  });

  playBtn?.addEventListener('click', () => {
    if (isPlaying) {
      stopPlay();
    } else {
      isPlaying = true;
      playBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
      if (currentTime >= totalTime) updateTrace(0);
      playInterval = setInterval(() => {
        if (currentTime >= totalTime) { stopPlay(); return; }
        updateTrace(currentTime + 1);
      }, 500);
    }
  });

  function stopPlay() {
    isPlaying = false;
    clearInterval(playInterval);
    playBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  }

  updateTrace(0);
}