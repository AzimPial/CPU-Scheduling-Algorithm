/**
 * @fileoverview SchedViz — Input bar: algorithm picker, process table, and controls.
 * @module ui/inputBar
 */

import { ALGORITHMS, CATEGORY_LABELS, VALIDATION } from '../core/types.js';
import { validateQuantum, validateAging, validateBoost } from '../core/validators.js';
import { createProcessForm } from './processForm.js';

const ALGO_KEYS = Object.keys(ALGORITHMS);

/**
 * Create the input bar controller.
 * @param {HTMLElement} container - The input bar inner container
 * @param {Object} callbacks
 * @param {Function} callbacks.onRun - Called with {algorithm, options, processes} when user runs
 * @param {Object} [callbacks.initialState] - Pre-fill state from URL
 * @returns {{getAlgorithm: () => string, getOptions: () => Object, getProcesses: () => Array, setMode: (string) => void, setAlgorithm: (string) => void, setSelectedAlgorithms: (Array) => void, setQuantum: (number) => void, setProcesses: (Array) => void, resetToDefaults: () => void}}
 */
export function createInputBar(container, callbacks) {
  let currentAlgorithm = callbacks.initialState?.algorithm || 'fcfs';
  let currentMode = callbacks.initialState?.mode || 'visualize';
  let quantum = callbacks.initialState?.options?.quantum || 2;
  let aging = callbacks.initialState?.options?.aging || 5;
  let boost = callbacks.initialState?.options?.boost || 10;
  let selectedAlgorithms = callbacks.initialState?.selectedAlgorithms || ['fcfs', 'sjf'];

  let processForm = null;

  function render() {
    const isCompare = currentMode === 'compare';
    const prevProcesses = processForm ? processForm.getProcesses() : null;

    let html = '<div class="input-bar-config">';
    html += '<label for="algo-select">Algorithm</label>';

    if (isCompare) {
      html += '<div class="algo-multiselect" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">';
      for (const [cat, catLabel] of Object.entries(CATEGORY_LABELS)) {
        const keys = ALGO_KEYS.filter(k => ALGORITHMS[k].category === cat);
        if (!keys.length) continue;
        html += `<span class="cat-separator">${catLabel}</span>`;
        for (const key of keys) {
          const algo = ALGORITHMS[key];
          const checked = selectedAlgorithms.includes(key) ? 'checked' : '';
          html += `<label class="chip${checked ? ' chip-active' : ''}" style="cursor:pointer;margin:0;">`;
          html += `<input type="checkbox" value="${key}" ${checked} class="sr-only algo-check">`;
          html += algo.name;
          html += '</label>';
        }
      }
      html += '</div>';
    } else {
      html += '<select id="algo-select" class="input input-sm" style="max-width:340px">';
      for (const [cat, catLabel] of Object.entries(CATEGORY_LABELS)) {
        const keys = ALGO_KEYS.filter(k => ALGORITHMS[k].category === cat);
        if (!keys.length) continue;
        html += `<optgroup label="${catLabel}">`;
        for (const key of keys) {
          const algo = ALGORITHMS[key];
          html += `<option value="${key}"${key === currentAlgorithm ? ' selected' : ''}>${algo.fullName}</option>`;
        }
        html += '</optgroup>';
      }
      html += '</select>';
    }

    const opt = currentOptions();
    if (opt.quantum) {
      html += `<label for="quantum-input" style="margin-left:12px">Quantum</label>`;
      html += `<input id="quantum-input" type="number" class="input input-sm" style="width:64px" min="${VALIDATION.MIN_QUANTUM}" max="${VALIDATION.MAX_QUANTUM}" value="${quantum}" aria-label="Time quantum">`;
    }
    if (opt.aging) {
      html += `<label for="aging-input" style="margin-left:12px">Aging interval</label>`;
      html += `<input id="aging-input" type="number" class="input input-sm" style="width:64px" min="${VALIDATION.MIN_AGING}" max="${VALIDATION.MAX_AGING}" value="${aging}" aria-label="Aging interval">`;
    }
    if (opt.boost) {
      html += `<label for="boost-input" style="margin-left:12px">Boost interval</label>`;
      html += `<input id="boost-input" type="number" class="input input-sm" style="width:64px" min="${VALIDATION.MIN_BOOST}" max="${VALIDATION.MAX_BOOST}" value="${boost}" aria-label="Boost interval">`;
    }

    html += '</div>';

    html += '<div class="process-table-wrapper" id="process-table-wrapper"></div>';

    html += '<div class="input-bar-bottom" style="margin-top:8px">';
    html += '<div class="input-bar-left">';
    html += '<button class="btn btn-sm btn-ghost" id="btn-randomize" aria-label="Randomize process data"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg> Randomize</button>';
    html += '<span class="row-count-hint" id="row-count-hint"></span>';
    html += '<button class="btn btn-sm btn-ghost" id="btn-remove-row" aria-label="Remove a process" title="Remove process"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg> Remove</button>';
    html += '<button class="btn btn-sm btn-ghost" id="btn-add-row" aria-label="Add a process" title="Add process"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add</button>';
    html += '</div>';
    html += '<div class="input-bar-right">';
    html += '<button class="send-btn" id="btn-run"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> Run</button>';
    html += '</div>';
    html += '</div>';

    html += '<div id="validation-errors"></div>';

    container.innerHTML = html;

    const tableWrapper = document.getElementById('process-table-wrapper');

    processForm = createProcessForm(tableWrapper, {
      initialCount: 4,
      algorithmKey: currentAlgorithm
    });

    if (prevProcesses) {
      processForm.setProcesses(prevProcesses);
    }

    const algoSelect = document.getElementById('algo-select');
    if (algoSelect) {
      algoSelect.addEventListener('change', (e) => {
        currentAlgorithm = e.target.value;
        render();
      });
    }

    if (isCompare) {
      container.querySelectorAll('.algo-check').forEach(cb => {
        cb.addEventListener('change', () => {
          selectedAlgorithms = Array.from(container.querySelectorAll('.algo-check:checked')).map(c => c.value);
          container.querySelectorAll('.algo-multiselect .chip').forEach(chip => {
            const inp = chip.querySelector('input');
            chip.classList.toggle('chip-active', inp.checked);
          });
        });
      });
    }

    bind('quantum-input', 'change', v => { quantum = parseInt(v) || 2; });
    bind('aging-input', 'change', v => { aging = parseInt(v) || 5; });
    bind('boost-input', 'change', v => { boost = parseInt(v) || 10; });

    document.getElementById('btn-randomize')?.addEventListener('click', () => {
      processForm.randomize();
    });

    document.getElementById('btn-add-row')?.addEventListener('click', () => {
      processForm.addRow();
      updateRowCount();
    });

    document.getElementById('btn-remove-row')?.addEventListener('click', () => {
      processForm.removeRow();
      updateRowCount();
    });

    document.getElementById('btn-run')?.addEventListener('click', () => {
      handleRun();
    });

    updateRowCount();
  }

  function updateRowCount() {
    const hint = document.getElementById('row-count-hint');
    if (!hint || !processForm) return;
    hint.textContent = `${processForm.getProcessCount()} process${processForm.getProcessCount() === 1 ? '' : 'es'}`;
  }

  function bind(id, event, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, (e) => handler(e.target.value));
  }

  function currentOptions() {
    if (currentMode === 'compare') {
      return {
        quantum: selectedAlgorithms.some(k => ALGORITHMS[k]?.needsQuantum),
        aging: selectedAlgorithms.some(k => ALGORITHMS[k]?.needsAging),
        boost: selectedAlgorithms.some(k => ALGORITHMS[k]?.needsBoost)
      };
    }
    const algo = ALGORITHMS[currentAlgorithm] || {};
    return { quantum: !!algo.needsQuantum, aging: !!algo.needsAging, boost: !!algo.needsBoost };
  }

  function handleRun() {
    const errorEl = document.getElementById('validation-errors');
    if (errorEl) errorEl.innerHTML = '';

    if (currentMode === 'compare' && selectedAlgorithms.length < 2) {
      if (errorEl) errorEl.innerHTML = '<div class="input-error-text" style="margin-top:6px">Select at least 2 algorithms to compare</div>';
      return;
    }

    const opt = currentOptions();
    const options = {};

    if (opt.quantum) {
      const qEl = document.getElementById('quantum-input');
      const qVal = validateQuantum(qEl ? qEl.value : String(quantum));
      if (!qVal.valid) {
        if (errorEl) errorEl.innerHTML = `<div class="input-error-text" style="margin-top:6px">Quantum: ${qVal.error}</div>`;
        return;
      }
      options.quantum = qEl ? parseInt(qEl.value) : quantum;
    }
    if (opt.aging) {
      const aEl = document.getElementById('aging-input');
      const aVal = validateAging(aEl ? aEl.value : String(aging));
      if (!aVal.valid) {
        if (errorEl) errorEl.innerHTML = `<div class="input-error-text" style="margin-top:6px">Aging: ${aVal.error}</div>`;
        return;
      }
      options.aging = aEl ? parseInt(aEl.value) : aging;
    }
    if (opt.boost) {
      const bEl = document.getElementById('boost-input');
      const bVal = validateBoost(bEl ? bEl.value : String(boost));
      if (!bVal.valid) {
        if (errorEl) errorEl.innerHTML = `<div class="input-error-text" style="margin-top:6px">Boost: ${bVal.error}</div>`;
        return;
      }
      options.boost = bEl ? parseInt(bEl.value) : boost;
    }

    const validation = processForm.validate();
    if (!validation.valid) {
      let errHtml = '<div style="margin-top:6px">';
      validation.processErrors.forEach((errs, idx) => {
        if (errs) {
          for (const [field, msg] of Object.entries(errs)) {
            errHtml += `<div class="input-error-text">P${idx + 1} ${field}: ${msg}</div>`;
          }
        }
      });
      errHtml += '</div>';
      if (errorEl) errorEl.innerHTML = errHtml;
      return;
    }

    const processes = processForm.getProcesses();
    const algo = currentMode === 'compare' ? selectedAlgorithms : currentAlgorithm;

    callbacks.onRun({
      algorithm: algo,
      options,
      processes,
      mode: currentMode
    });
  }

  function setMode(mode) {
    currentMode = mode;
    render();
  }

  function setAlgorithm(key) {
    currentAlgorithm = key;
    if (processForm) processForm.setAlgorithm(key);
  }

  function setSelectedAlgorithms(arr) {
    selectedAlgorithms = [...arr];
    container.querySelectorAll('.algo-check').forEach(cb => {
      cb.checked = selectedAlgorithms.includes(cb.value);
      const chip = cb.closest('.chip');
      if (chip) chip.classList.toggle('chip-active', cb.checked);
    });
  }

  function setQuantum(q) {
    quantum = q;
    const qInput = document.getElementById('quantum-input');
    if (qInput) qInput.value = q;
  }

  function getProcesses() {
    return processForm ? processForm.getProcesses() : [];
  }

  function getOptions() {
    const opt = currentOptions();
    const options = {};
    if (opt.quantum) options.quantum = quantum;
    if (opt.aging) options.aging = aging;
    if (opt.boost) options.boost = boost;
    return options;
  }

  function setProcesses(rows) {
    if (!rows || !Array.isArray(rows)) return;
    if (processForm) processForm.setProcesses(rows);
  }

  function resetToDefaults() {
    currentAlgorithm = 'fcfs';
    quantum = 2;
    aging = 5;
    boost = 10;
    selectedAlgorithms = ['fcfs', 'sjf'];
    render();
  }

  render();

  return {
    getAlgorithm: () => currentAlgorithm,
    getOptions,
    getProcesses,
    setProcesses,
    getSelectedAlgorithms: () => [...selectedAlgorithms],
    setMode,
    setAlgorithm,
    setSelectedAlgorithms,
    setQuantum,
    resetToDefaults
  };
}
