/**
 * @fileoverview SchedViz — Inline results editor for tweaking process inputs
 * after results are shown. Provides always-editable inputs with debounced re-render.
 * @module ui/resultsEditor
 */

import { getActivePalette, FIELD_LABELS, VALIDATION } from '../core/types.js';

/**
 * Create an editable process table for post-result tweaking.
 * @param {Object} options
 * @param {HTMLElement} options.container - Where to render the table
 * @param {Array} options.processes - Current process data
 * @param {string} options.algorithmKey
 * @param {string[]} options.activeFields - Which fields to display
 * @param {Function} options.onEdit - Called (debounced 400ms) with updated processes
 * @param {Function} [options.onAddRow] - Called when a row is added
 * @param {Function} [options.onRemoveRow] - Called when a row is removed
 * @param {Function} [options.onReset] - Called when reset is clicked
 * @returns {{getProcesses: () => Array, setProcesses: (Array) => void, destroy: () => void}}
 */
export function createResultsEditor(options) {
  const {
    container,
    processes: initialProcesses,
    algorithmKey,
    activeFields,
    onEdit,
    onAddRow,
    onRemoveRow,
    onReset
  } = options;

  let processes = initialProcesses.map(p => ({ ...p }));
  let debounceTimer = null;

  function getProcesses() {
    return processes.map(p => ({ ...p }));
  }

  function setProcesses(newProcesses) {
    processes = newProcesses.map(p => ({ ...p }));
    render();
  }

  function destroy() {
    clearTimeout(debounceTimer);
    container.innerHTML = '';
  }

  function render() {
    const fields = activeFields || [];
    let html = '<div class="process-table-wrapper">';
    html += '<table class="process-table"><thead><tr>';
    html += '<th>Process</th>';
    for (const f of fields) {
      const label = FIELD_LABELS[f]?.label || f;
      const hint = FIELD_LABELS[f]?.hint || '';
      html += `<th title="${hint}">${label}</th>`;
    }
    html += '</tr></thead><tbody>';

    for (let i = 0; i < processes.length; i++) {
      const row = processes[i];
      const palette = getActivePalette();
      const color = palette[i % palette.length];
      html += '<tr>';
      html += `<td><div class="proc-id"><span class="proc-dot" style="background:${color}"></span><span class="mono">${row.id}</span></div></td>`;
      for (const f of fields) {
        const val = row[f] ?? '';
        const min = VALIDATION['MIN_' + f.toUpperCase()] ?? null;
        const max = VALIDATION['MAX_' + f.toUpperCase()] ?? null;
        let attrs = `type="number" class="input input-sm" data-idx="${i}" data-field="${f}" value="${val}"`;
        if (min !== null) attrs += ` min="${min}"`;
        if (max !== null) attrs += ` max="${max}"`;
        attrs += ` aria-label="${row.id} ${FIELD_LABELS[f]?.label || f}"`;
        html += `<td><input ${attrs}></td>`;
      }
      html += '</tr>';
    }

    html += '</tbody></table></div>';

    html += '<div class="editor-actions" style="display:flex;gap:4px;align-items:center;margin-top:6px;flex-wrap:wrap;">';
    if (processes.length < 10) {
      html += '<button class="btn btn-xs btn-ghost editor-add-btn"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add</button>';
    }
    if (processes.length > 1) {
      html += '<button class="btn btn-xs btn-ghost editor-remove-btn"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg> Remove</button>';
    }
    if (onReset) {
      html += '<button class="btn btn-xs btn-ghost editor-reset-btn">&#x21BA; Reset</button>';
    }
    html += '</div>';

    container.innerHTML = html;
    bindEvents();
  }

  function bindEvents() {
    container.querySelectorAll('.process-table input').forEach(input => {
      input.addEventListener('change', handleImmediateChange);
      input.addEventListener('input', handleDebouncedChange);
    });

    container.querySelector('.editor-add-btn')?.addEventListener('click', () => {
      if (processes.length >= 10) return;
      const newIdx = processes.length;
      const newRow = { id: `P${newIdx + 1}` };
      for (const f of activeFields) {
        newRow[f] = defaultFieldValue(f, newIdx);
      }
      processes.push(newRow);
      render();
      if (onAddRow) onAddRow();
      if (onEdit) onEdit(getProcesses());
    });

    container.querySelector('.editor-remove-btn')?.addEventListener('click', () => {
      if (processes.length <= 1) return;
      processes.pop();
      render();
      if (onRemoveRow) onRemoveRow();
      if (onEdit) onEdit(getProcesses());
    });

    container.querySelector('.editor-reset-btn')?.addEventListener('click', () => {
      if (onReset) onReset();
    });
  }

  function handleImmediateChange(e) {
    const idx = parseInt(e.target.dataset.idx);
    const field = e.target.dataset.field;
    const val = e.target.value === '' ? '' : Number(e.target.value);
    if (processes[idx]) {
      processes[idx][field] = val;
    }
    scheduleEdit();
  }

  function handleDebouncedChange() {
    scheduleEdit();
  }

  function scheduleEdit() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      syncFromInputs();
      if (onEdit) onEdit(getProcesses());
    }, 400);
  }

  function syncFromInputs() {
    container.querySelectorAll('.process-table input').forEach(input => {
      const idx = parseInt(input.dataset.idx);
      const field = input.dataset.field;
      if (processes[idx]) {
        processes[idx][field] = input.value === '' ? '' : Number(input.value);
      }
    });
  }

  function defaultFieldValue(field, index) {
    switch (field) {
      case 'arrivalTime': return Math.floor(Math.random() * Math.min(9, VALIDATION.MAX_ARRIVAL - VALIDATION.MIN_ARRIVAL + 1)) + VALIDATION.MIN_ARRIVAL;
      case 'burstTime': return Math.floor(Math.random() * 10) + VALIDATION.MIN_BURST;
      case 'priority': return Math.floor(Math.random() * 5) + VALIDATION.MIN_PRIORITY;
      case 'deadline': return Math.floor(Math.random() * 9) + 2;
      case 'period': return Math.floor(Math.random() * 9) + 4;
      case 'wcet': return Math.floor(Math.random() * 3) + VALIDATION.MIN_WCET;
      case 'tickets': return Math.floor(Math.random() * 10) + 1;
      case 'weight': return Math.floor(Math.random() * 6) + 1;
      case 'nice': return Math.floor(Math.random() * 31) - 10;
      case 'share': return Math.floor(Math.random() * 100) + 1;
      case 'queue': return Math.floor(Math.random() * 2) + 1;
      default: return 1;
    }
  }

  render();

  return { getProcesses, setProcesses, destroy };
}

/**
 * Update the editor's internal state and re-render without triggering onEdit.
 * @param {Object} editorInstance - The return value of createResultsEditor
 * @param {Array} processes - New process data
 */
export function updateEditorProcesses(editorInstance, processes) {
  editorInstance.setProcesses(processes);
}
