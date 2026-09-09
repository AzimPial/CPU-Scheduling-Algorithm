/**
 * @fileoverview SchedViz — Results table and metric summary renderer.
 * @module ui/resultsTable
 */

import { PROC_PALETTE, ALGORITHMS, FIELD_LABELS } from '../core/types.js';

const RESULT_ONLY_FIELDS = {
  priority: '#',
  deadline: 'Deadline',
  period: 'Period',
  wcet: 'WCET',
  tickets: 'Tickets',
  weight: 'Weight',
  nice: 'Nice'
};

/**
 * Determine which input columns to show for a result.
 * @param {import('../core/types.js').ScheduleResult} result
 * @param {string} [algorithmKey]
 * @returns {string[]}
 */
function inputColumns(result, algorithmKey) {
  const meta = algorithmKey ? ALGORITHMS[algorithmKey] : null;
  if (meta && meta.fields && meta.fields.length) return meta.fields.filter(f => f !== 'arrivalTime' && f !== 'burstTime');
  // Fallback: infer from result rows.
  const fields = ['priority', 'deadline', 'period', 'wcet', 'tickets', 'weight', 'nice'];
  return fields.filter(f => result.processResults.some(pr => pr[f] !== undefined));
}

/**
 * Render a results table for a schedule result.
 * @param {HTMLElement} container
 * @param {import('../core/types.js').ScheduleResult} result
 * @param {Object} [options]
 * @param {string} [options.algorithmKey]
 * @returns {HTMLElement}
 */
export function renderResultsTable(container, result, options = {}) {
  const pr = result.processResults;
  const extraCols = inputColumns(result, options.algorithmKey);
  const realTime = !!result.realTime;

  let html = '<div style="overflow-x:auto;">';
  html += '<table class="data-table"><thead><tr>';
  html += '<th>Process</th><th>Arrival</th><th>Burst</th>';
  for (const f of extraCols) html += `<th>${FIELD_LABELS[f]?.label || RESULT_ONLY_FIELDS[f] || f}</th>`;
  html += '<th>Completion</th><th>Turnaround</th><th>Waiting</th>';
  if (realTime) html += '<th>Jobs</th><th>Missed</th>';
  html += '</tr></thead><tbody>';

  pr.forEach((p, i) => {
    const color = PROC_PALETTE[i % PROC_PALETTE.length];
    html += '<tr>';
    html += `<td><span class="proc-color" style="background:${color}"></span><span class="mono">${p.id}</span></td>`;
    html += `<td>${p.arrivalTime ?? '—'}</td>`;
    html += `<td>${p.burstTime ?? '—'}</td>`;
    for (const f of extraCols) {
      html += `<td>${p[f] ?? '—'}</td>`;
    }
    html += `<td>${p.completionTime}</td>`;
    html += `<td>${typeof p.turnaroundTime === 'number' ? p.turnaroundTime.toFixed(1) : p.turnaroundTime}</td>`;
    html += `<td>${typeof p.waitingTime === 'number' ? p.waitingTime.toFixed(1) : p.waitingTime}</td>`;
    if (realTime) {
      const missBadge = p.deadlineMissed
        ? '<span style="color:#F06292;font-weight:600">' + p.misses + '</span>'
        : `<span style="color:var(--text-muted)">${p.misses || 0}</span>`;
      html += `<td>${p.jobs ?? '—'}</td>`;
      html += `<td>${missBadge}</td>`;
    }
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  container.innerHTML = html;
  return container;
}

/**
 * Render metric summary cards.
 * @param {HTMLElement} container
 * @param {import('../core/types.js').ScheduleResult} result
 */
export function renderMetricCards(container, result) {
  const metrics = [
    { label: 'Avg Waiting Time', value: result.avgWaitingTime.toFixed(2), unit: 'tu' },
    { label: 'Avg Turnaround Time', value: result.avgTurnaroundTime.toFixed(2), unit: 'tu' },
    { label: 'Avg Response Time', value: (result.avgResponseTime ?? 0).toFixed(2), unit: 'tu' },
    { label: 'Throughput', value: (result.throughput ?? 0).toFixed(3), unit: 'proc/tu' },
    { label: 'CPU Idle', value: result.totalIdleTime, unit: 'tu' },
    { label: 'CPU Utilization', value: result.cpuUtilization.toFixed(1), unit: '%' },
    { label: 'Context Switches', value: result.contextSwitches, unit: '' }
  ];
  if (result.realTime && result.utilization !== undefined) {
    metrics.push({ label: 'Utilization (ΣC/T)', value: (result.utilization * 100).toFixed(1), unit: '%' });
  }

  let html = '<div class="stat-grid">';
  for (const m of metrics) {
    html += `<div class="stat-card"><div class="stat-label">${m.label}</div><div class="stat-value">${m.value}</div><div class="stat-unit">${m.unit}</div></div>`;
  }
  html += '</div>';
  container.innerHTML = html;
}

/**
 * Export results table to CSV string.
 * @param {import('../core/types.js').ScheduleResult} result
 * @param {string} [algorithmKey]
 * @returns {string}
 */
export function resultsToCSV(result, algorithmKey) {
  const extraCols = inputColumns(result, algorithmKey);
  const lines = [];
  const headers = ['Process', 'Arrival Time', 'Burst Time'];
  for (const f of extraCols) headers.push(FIELD_LABELS[f]?.label || f);
  headers.push('Completion Time', 'Turnaround Time', 'Waiting Time');
  if (result.realTime) headers.push('Jobs', 'Missed Deadlines');
  lines.push(headers.join(','));

  for (const p of result.processResults) {
    const row = [p.id, p.arrivalTime, p.burstTime];
    for (const f of extraCols) row.push(p[f] ?? '');
    row.push(p.completionTime, p.turnaroundTime, p.waitingTime);
    if (result.realTime) row.push(p.jobs ?? '', p.misses ?? 0);
    lines.push(row.join(','));
  }

  lines.push('');
  lines.push(`Algorithm,${result.algorithm}`);
  lines.push(`Average Waiting Time,${result.avgWaitingTime.toFixed(2)}`);
  lines.push(`Average Turnaround Time,${result.avgTurnaroundTime.toFixed(2)}`);
  lines.push(`Average Response Time,${(result.avgResponseTime ?? 0).toFixed(2)}`);
  lines.push(`Throughput,${(result.throughput ?? 0).toFixed(3)}`);
  lines.push(`Total Idle Time,${result.totalIdleTime}`);
  lines.push(`CPU Utilization,${result.cpuUtilization.toFixed(1)}%`);
  lines.push(`Context Switches,${result.contextSwitches}`);
  if (result.realTime) {
    lines.push(`All Deadlines Met,${result.allDeadlinesMet}`);
    lines.push(`Deadline Misses,${(result.deadlineMissedAt || []).length}`);
    lines.push(`Utilization (Sum C/T),${((result.utilization || 0) * 100).toFixed(1)}%`);
  }

  return lines.join('\n');
}

/**
 * Trigger a CSV download.
 * @param {string} csvContent
 * @param {string} filename
 */
export function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export a Gantt SVG to PNG.
 * @param {SVGElement} svgElement
 * @param {string} filename
 */
export function downloadGanttPNG(svgElement, filename) {
  if (!svgElement) return;
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width * 2;
    canvas.height = img.height * 2;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    canvas.toBlob((blob) => {
      const pngUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(pngUrl);
    });
  };
  img.src = url;
}
