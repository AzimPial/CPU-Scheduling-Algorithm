/**
 * @fileoverview SchedViz — Main application controller.
 * Wires together all modules: algorithms, UI, storage, and event handling.
 * @module app
 */

import { ALGORITHMS, ALGO_PALETTE, PROC_PALETTE } from './core/types.js';
import { saveScenario, copyShareableLink, encodeState, decodeState } from './core/storage.js';
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
import { renderResultsTable, renderMetricCards, resultsToCSV, downloadCSV, downloadGanttPNG } from './ui/resultsTable.js';
import { createChatThread } from './ui/chatThread.js';
import { createSidebar } from './ui/sidebar.js';
import { createInputBar } from './ui/inputBar.js';
import { initTheme } from './ui/theme.js';
import { showAlgorithmInfo, showShortcutsModal, close as closeModal } from './ui/modal.js';

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
let currentSessionId = null;
let lastResult = null;

document.addEventListener('DOMContentLoaded', init);

function init() {
  const threadEl = document.getElementById('chat-thread');
  const messagesEl = document.getElementById('chat-messages');
  const sidebarEl = document.getElementById('sidebar');
  const inputBarEl = document.getElementById('input-bar-inner');
  const themeBtn = document.getElementById('btn-theme');
  const hamburgerBtn = document.getElementById('btn-hamburger');
  const sidebarOverlay = document.getElementById('sidebar-overlay');

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
  }

  const sidebar = createSidebar(sidebarEl, {
    onLoad: (scenario) => {
      const s = scenario.state;
      currentMode = s.mode || 'visualize';
      updateModeTabs(currentMode);
      inputBar.setMode(currentMode);
      inputBar.setAlgorithm(s.algorithm || 'fcfs');
      if (s.selectedAlgorithms) inputBar.setSelectedAlgorithms(s.selectedAlgorithms);
      if (s.options?.quantum) inputBar.setQuantum(s.options.quantum);
      if (s.processes) inputBar.setProcesses(s.processes);
      currentSessionId = scenario.id;
      sidebar.highlightActive(currentSessionId);
      closeModal();
      if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    },
    onNew: () => {
      currentSessionId = null;
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
  });

  document.getElementById('btn-new-chat')?.addEventListener('click', () => {
    currentSessionId = null;
    chat.clear();
    inputBar.resetToDefaults();
    currentMode = 'visualize';
    updateModeTabs('visualize');
    sidebar.highlightActive(null);
    chat.addWelcomeCard(
      () => { setMode('visualize'); },
      () => { setMode('compare'); }
    );
  });

  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      setMode(tab.dataset.mode);
    });
  });

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

  chat.addWelcomeCard(
    () => { setMode('visualize'); },
    () => { setMode('compare'); }
  );
}

function executeAndRender(runData, chat, inputBar) {
  const { algorithm, options, processes, mode } = runData;

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

  const state = { algorithm, options, processes, mode, selectedAlgorithms: mode === 'compare' ? algorithm : undefined };
  const scenario = saveScenario(summaryText, state);
  currentSessionId = scenario.id;

  document.dispatchEvent(new CustomEvent('schedviz:sidebar-refresh'));

  const sidebarList = document.querySelector('.sidebar-list');
  if (sidebarList) {
    sidebarList.querySelectorAll('.sidebar-item').forEach(el => {
      el.classList.toggle('active', el.dataset.id === scenario.id);
    });
  }
}

function renderSingle(algorithmKey, options, processes, chat) {
  const runner = ALGO_RUNNERS[algorithmKey];
  if (!runner) return;

  const result = runner(processes, options);
  lastResult = result;

  const { element: resultMsg, body } = chat.addAssistantMessage((body) => {
    const text = document.createElement('div');
    text.className = 'msg-text';
    text.innerHTML = `<strong>${result.algorithm}</strong> completed. Avg wait: <strong>${result.avgWaitingTime.toFixed(2)}</strong> | CPU utilization: <strong>${result.cpuUtilization.toFixed(1)}%</strong>`;
    body.appendChild(text);

    const actionsBar = document.createElement('div');
    actionsBar.className = 'result-actions';
    actionsBar.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;';
    actionsBar.innerHTML = `
      <button class="btn btn-sm btn-ghost info-btn" data-algo="${algorithmKey}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> About</button>
      <button class="btn btn-sm btn-ghost share-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> Share</button>
      <button class="btn btn-sm btn-ghost save-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save</button>
      <button class="btn btn-sm btn-ghost export-csv-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> CSV</button>
      <button class="btn btn-sm btn-ghost export-png-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> PNG</button>
    `;
    body.appendChild(actionsBar);

    actionsBar.querySelector('.info-btn')?.addEventListener('click', () => showAlgorithmInfo(algorithmKey));
    actionsBar.querySelector('.share-btn')?.addEventListener('click', async () => {
      const state = { algorithm: algorithmKey, options, processes, mode: 'visualize' };
      const ok = await copyShareableLink(state);
      const btn = actionsBar.querySelector('.share-btn');
      if (btn) {
        btn.innerHTML = ok ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!' : 'Failed';
        setTimeout(() => { btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> Share'; }, 2000);
      }
    });

    const resultCard = document.createElement('div');
    resultCard.className = 'result-card';
    const cardHeader = document.createElement('div');
    resultCard.appendChild(cardHeader);

    const ganttWrapper = document.createElement('div');
    ganttWrapper.className = 'gantt-container';
    resultCard.appendChild(ganttWrapper);

    const ganttResult = renderGantt(ganttWrapper, result);

    const traceWrapper = document.createElement('div');
    resultCard.appendChild(traceWrapper);
    createTraceControls(traceWrapper, result, ganttWrapper, processes);

    body.appendChild(resultCard);

    const tableCard = document.createElement('div');
    tableCard.className = 'result-card';
    tableCard.style.marginTop = '12px';
    renderResultsTable(tableCard, result, { algorithmKey });
    body.appendChild(tableCard);

    if (result.realTime && result.allDeadlinesMet !== undefined) {
      const rtVerdict = document.createElement('div');
      rtVerdict.className = 'rt-verdict';
      rtVerdict.style.marginTop = '12px';
      rtVerdict.style.padding = '10px 12px';
      rtVerdict.style.borderRadius = 'var(--radius, 8px)';
      rtVerdict.style.fontSize = '13px';
      const met = result.allDeadlinesMet;
      rtVerdict.style.backgroundColor = met ? 'rgba(129,199,132,0.12)' : 'rgba(240,98,146,0.14)';
      rtVerdict.style.border = '1px solid ' + (met ? '#81C784' : '#F06292');
      const misses = (result.deadlineMissedAt || []).length;
      rtVerdict.innerHTML = met
        ? '<strong>All deadlines met</strong> — task set is schedulable under this policy.'
        : `<strong>${misses} missed deadline${misses === 1 ? '' : 's'}</strong> — task set is <b>not</b> schedulable under this policy. (Simplified educational simulation.)`;
      body.appendChild(rtVerdict);
    }

    const metricsCard = document.createElement('div');
    metricsCard.style.marginTop = '12px';
    renderMetricCards(metricsCard, result);
    body.appendChild(metricsCard);

    actionsBar.querySelector('.export-csv-btn')?.addEventListener('click', () => {
      const csv = resultsToCSV(result, algorithmKey);
      downloadCSV(csv, `${result.algorithm.replace(/[^a-z0-9]/gi, '_')}_results.csv`);
    });
    actionsBar.querySelector('.export-png-btn')?.addEventListener('click', () => {
      downloadGanttPNG(ganttResult.getSVGForExport(), `${result.algorithm.replace(/[^a-z0-9]/gi, '_')}_gantt.png`);
    });
    actionsBar.querySelector('.save-btn')?.addEventListener('click', () => {
      const name = prompt('Save as:', result.algorithm);
      if (name) {
        saveScenario(name, { algorithm: algorithmKey, options, processes, mode: 'visualize' });
        document.dispatchEvent(new CustomEvent('schedviz:sidebar-refresh'));
      }
    });
  });
}

function renderComparison(algorithmKeys, options, processes, chat) {
  const results = algorithmKeys.map(key => {
    const runner = ALGO_RUNNERS[key];
    return runner ? runner(processes, options) : null;
  }).filter(Boolean);

  chat.addAssistantMessage((body) => {
    const text = document.createElement('div');
    text.className = 'msg-text';
    text.innerHTML = `Compared <strong>${results.length}</strong> algorithms across <strong>${processes.length}</strong> processes.`;
    body.appendChild(text);

    const actionsBar = document.createElement('div');
    actionsBar.className = 'result-actions';
    actionsBar.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;';
    actionsBar.innerHTML = `
      <button class="btn btn-sm btn-ghost share-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> Share</button>
      <button class="btn btn-sm btn-ghost export-csv-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> CSV</button>
    `;
    body.appendChild(actionsBar);

    actionsBar.querySelector('.share-btn')?.addEventListener('click', async () => {
      const state = { algorithm: algorithmKeys, options, processes, mode: 'compare', selectedAlgorithms: algorithmKeys };
      await copyShareableLink(state);
      const btn = actionsBar.querySelector('.share-btn');
      if (btn) { btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!'; setTimeout(() => { btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> Share'; }, 2000); }
    });

    const maxMakespan = Math.max(...results.map(r => r.totalTime));

    const ganttGroup = document.createElement('div');
    ganttGroup.className = 'comparison-gantt-group';
    body.appendChild(ganttGroup);

    results.forEach((result, idx) => {
      const item = document.createElement('div');
      item.className = 'comparison-gantt-item';
      const label = document.createElement('div');
      label.className = 'algo-label';
      label.style.color = ALGO_PALETTE[idx % ALGO_PALETTE.length];
      label.textContent = result.algorithm;
      item.appendChild(label);

      const ganttContainer = document.createElement('div');
      ganttContainer.className = 'gantt-container';
      item.appendChild(ganttContainer);
      ganttGroup.appendChild(item);

      renderGantt(ganttContainer, result, { maxWidth: 800 });
    });

    const chartsGrid = document.createElement('div');
    chartsGrid.className = 'charts-grid';
    chartsGrid.style.marginTop = '16px';
    body.appendChild(chartsGrid);

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

      if (typeof Chart !== 'undefined') {
        new Chart(canvas.getContext('2d'), {
          type: 'bar',
          data: {
            labels: results.map(r => r.algorithm),
            datasets: [{
              data: results.map(r => r[metric.key]),
              backgroundColor: results.map((_, i) => ALGO_PALETTE[i % ALGO_PALETTE.length]),
              borderRadius: 4,
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9AA5B4', font: { family: 'JetBrains Mono', size: 10 } } },
              x: { grid: { display: false }, ticks: { color: '#9AA5B4', font: { family: 'JetBrains Mono', size: 10 } } }
            }
          }
        });
      }
    }

    const ranked = [...results].sort((a, b) => a.avgWaitingTime - b.avgWaitingTime);
    const best = ranked[0];
    const worst = ranked[ranked.length - 1];
    const diff = worst.avgWaitingTime - best.avgWaitingTime;
    const pct = worst.avgWaitingTime > 0 ? ((diff / worst.avgWaitingTime) * 100).toFixed(1) : '0';

    const verdict = document.createElement('div');
    verdict.className = 'verdict-box';
    verdict.innerHTML = `For this input, <strong>${best.algorithm}</strong> achieved the lowest average waiting time (${best.avgWaitingTime.toFixed(2)}) and <strong>${worst.algorithm}</strong> the highest (${worst.avgWaitingTime.toFixed(2)}), a difference of ${diff.toFixed(2)} time units (${pct}%). <strong>${best.algorithm}</strong> also had the best CPU utilization at ${best.cpuUtilization.toFixed(1)}%.`;
    body.appendChild(verdict);

    const rankTable = document.createElement('div');
    rankTable.className = 'result-card';
    rankTable.style.marginTop = '12px';
    let rankHtml = '<table class="data-table"><thead><tr><th>Rank</th><th>Algorithm</th><th>Avg Wait</th><th>Avg Turnaround</th><th>Idle Time</th><th>CPU Util</th></tr></thead><tbody>';
    ranked.forEach((r, i) => {
      const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-other';
      rankHtml += `<tr><td><span class="rank-badge ${rankClass}">${i + 1}</span></td><td>${r.algorithm}</td><td>${r.avgWaitingTime.toFixed(2)}</td><td>${r.avgTurnaroundTime.toFixed(2)}</td><td>${r.totalIdleTime}</td><td>${r.cpuUtilization.toFixed(1)}%</td></tr>`;
    });
    rankHtml += '</tbody></table>';
    rankTable.innerHTML = rankHtml;
    body.appendChild(rankTable);

    actionsBar.querySelector('.export-csv-btn')?.addEventListener('click', () => {
      let csv = 'Algorithm,Avg Waiting Time,Avg Turnaround Time,Idle Time,CPU Utilization,Context Switches\n';
      for (const r of results) {
        csv += `"${r.algorithm}",${r.avgWaitingTime.toFixed(2)},${r.avgTurnaroundTime.toFixed(2)},${r.totalIdleTime},${r.cpuUtilization.toFixed(1)}%,${r.contextSwitches}\n`;
      }
      downloadCSV(csv, 'comparison_results.csv');
    });
  });
}

function createTraceControls(container, result, ganttContainer, processes) {
  const gantt = result.gantt;
  if (!gantt || gantt.length === 0) return;

  const totalTime = result.totalTime;
  let currentTime = 0;
  let isPlaying = false;
  let playInterval = null;

  container.innerHTML = `
    <div class="trace-controls">
      <button class="btn-icon trace-reset" aria-label="Reset"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></button>
      <button class="btn-icon trace-prev" aria-label="Step back"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg></button>
      <button class="btn-icon trace-play" aria-label="Play"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg></button>
      <button class="btn-icon trace-next" aria-label="Step forward"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg></button>
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
    for (const p of processes) {
      if (p.arrivalTime > currentTime) continue;
      if (isFinished(p.id, currentTime)) continue;
      const isRunning = p.id === runningId;
      const color = PROC_PALETTE[procIndex.get(p.id) % PROC_PALETTE.length];
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

document.addEventListener('schedviz:sidebar-refresh', () => {
  document.dispatchEvent(new CustomEvent('schedviz:refresh-sidebar'));
});
