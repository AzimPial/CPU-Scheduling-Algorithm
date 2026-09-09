/**
 * @fileoverview SchedViz — Dynamic process input table for the input bar.
 * Columns are driven by the selected algorithm's `fields` metadata.
 * @module ui/processForm
 */

import { getActivePalette, ALGORITHMS, VALIDATION, FIELD_LABELS } from '../core/types.js';
import { validateAllProcesses } from '../core/validators.js';

/**
 * Create and manage the process input table.
 * @param {HTMLElement} container - The element to render the table into
 * @param {Object} options
 * @returns {{getProcesses: () => Array<Object>, setProcesses: (rows: Array<Object>) => void, setFieldValues: (key: string, value: any) => void, setAlgorithm: (string) => void, render: () => void, validate: () => {valid: boolean, errors: Array}, randomize: () => void, getActiveFields: () => string[]}}
 */
export function createProcessForm(container, options = {}) {
  let processCount = options.initialCount || 4;
  let processRows = [];
  let algorithmKey = options.algorithmKey || 'fcfs';

  function activeFields() {
    const algo = ALGORITHMS[algorithmKey];
    const rest = (algo ? algo.fields : []).filter(f => f !== 'arrivalTime' && f !== 'burstTime');
    return ['arrivalTime', 'burstTime', ...rest];
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function defaultFieldValue(field, index) {
    switch (field) {
      case 'arrivalTime': return randomInt(VALIDATION.MIN_ARRIVAL, Math.min(8, VALIDATION.MAX_ARRIVAL));
      case 'burstTime': return randomInt(VALIDATION.MIN_BURST, 10);
      case 'priority': return randomInt(VALIDATION.MIN_PRIORITY, 5);
      case 'deadline': return randomInt(2, 10);
      case 'period': return randomInt(4, 12);
      case 'wcet': return randomInt(VALIDATION.MIN_WCET, 3);
      case 'tickets': return randomInt(1, 10);
      case 'weight': return randomInt(1, 6);
      case 'nice': return randomInt(-10, 10);
      case 'share': return randomInt(1, 100);
      case 'queue': return randomInt(1, 2);
      default: return 1;
    }
  }

  function defaultRow(index) {
    const row = { id: `P${index + 1}` };
    for (const field of activeFields()) {
      row[field] = defaultFieldValue(field, index);
    }
    return row;
  }

  function generateDefaultRows(count) {
    const rows = [];
    for (let i = 0; i < count; i++) {
      rows.push(defaultRow(i));
    }
    return rows;
  }

  processRows = generateDefaultRows(processCount);

  function render() {
    const fields = activeFields();

    let html = '<table class="process-table"><thead><tr>';
    html += '<th>Process</th>';
    for (const f of fields) {
      html += `<th title="${FIELD_LABELS[f]?.hint || ''}">${FIELD_LABELS[f]?.label || f}</th>`;
    }
    html += '</tr></thead><tbody>';

    for (let i = 0; i < processCount; i++) {
      const row = processRows[i] || defaultRow(i);
      if (!processRows[i]) processRows[i] = row;
      const palette = getActivePalette();
      const color = palette[i % palette.length];
      html += '<tr>';
      html += `<td><div class="proc-id"><span class="proc-dot" style="background:${color}"></span><span class="mono">${row.id}</span></div></td>`;
      for (const f of fields) {
        const min = VALIDATION['MIN_' + f.toUpperCase()] ?? null;
        html += `<td><input type="number" class="input input-sm" data-idx="${i}" data-field="${f}" value="${row[f] ?? ''}"${min !== null ? ` min="${min}"` : ''} aria-label="P${i + 1} ${FIELD_LABELS[f]?.label || f}"></td>`;
      }
      html += '</tr>';
    }

    html += '</tbody></table>';
    container.innerHTML = html;

    container.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', handleInputChange);
      input.addEventListener('input', debounce(handleInputChange, 300));
    });
  }

  function handleInputChange(e) {
    const idx = parseInt(e.target.dataset.idx);
    const field = e.target.dataset.field;
    const val = e.target.value === '' ? '' : Number(e.target.value);
    if (processRows[idx]) {
      processRows[idx][field] = val;
    }
  }

  let debounceTimer;
  function debounce(fn, ms) {
    return function (...args) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function getProcesses() {
    const fields = activeFields();
    const palette = getActivePalette();
    return processRows.slice(0, processCount).map((row, i) => {
      const proc = { id: row.id || `P${i + 1}`, color: palette[i % palette.length] };
      for (const f of fields) {
        proc[f] = row[f];
      }
      return proc;
    });
  }

  function setProcesses(rows) {
    const fields = activeFields();
    processRows = rows.map((r, i) => {
      const row = { ...r, id: r.id || `P${i + 1}` };
      for (const f of fields) {
        if (row[f] === undefined) row[f] = defaultFieldValue(f, i);
      }
      return row;
    });
    processCount = rows.length;
    render();
  }

  function setAlgorithm(key) {
    algorithmKey = key;
    processCount = processRows.length || processCount;
    for (let i = 0; i < processCount; i++) {
      const fields = activeFields();
      const row = processRows[i] || { id: `P${i + 1}` };
      for (const f of fields) {
        if (row[f] === undefined) row[f] = defaultFieldValue(f, i);
      }
      processRows[i] = row;
    }
    render();
  }

  function setFieldValues(key, value) {
    for (let i = 0; i < processCount; i++) {
      if (processRows[i]) processRows[i][key] = value;
    }
    render();
  }

  function setCount(count) {
    processCount = Math.max(VALIDATION.MIN_PROCESSES, Math.min(VALIDATION.MAX_PROCESSES, count));
    processRows = generateDefaultRows(processCount);
    render();
  }

  function addRow() {
    if (processCount >= VALIDATION.MAX_PROCESSES) return false;
    processCount += 1;
    if (!processRows[processCount - 1]) processRows[processCount - 1] = defaultRow(processCount - 1);
    render();
    return true;
  }

  function removeRow() {
    if (processCount <= VALIDATION.MIN_PROCESSES) return false;
    processCount -= 1;
    processRows.pop();
    render();
    return true;
  }

  function validate() {
    const fields = activeFields();
    return validateAllProcesses(
      processRows.slice(0, processCount).map(r => {
        const row = {};
        for (const f of fields) row[f] = r[f];
        return row;
      }),
      fields
    );
  }

  function randomize() {
    for (let i = 0; i < processCount; i++) {
      processRows[i] = { ...defaultRow(i) };
    }
    render();
  }

  render();

  return { getProcesses, setProcesses, setAlgorithm, setFieldValues, setCount, addRow, removeRow, validate, render, randomize, getProcessCount: () => processCount, getActiveFields: activeFields };
}
