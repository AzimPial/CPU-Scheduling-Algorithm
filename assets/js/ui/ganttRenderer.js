/**
 * @fileoverview SchedViz — Animated Gantt chart renderer (SVG-based).
 * @module ui/ganttRenderer
 */

import { getActivePalette } from '../core/types.js';

const BLOCK_MIN_PX = 28;
const TICK_HEIGHT = 6;
const AXIS_HEIGHT = 24;

/**
 * Build an animated Gantt chart from a ScheduleResult.
 * @param {HTMLElement} container - The element to render into
 * @param {import('../core/types.js').ScheduleResult} result
 * @param {Object} [options]
 * @param {boolean} [options.animate=true] - Whether to animate blocks in
 * @param {number} [options.maxWidth] - Maximum chart width in px
 * @returns {{element: HTMLElement, getSVGForExport: () => SVGElement}}
 */
export function renderGantt(container, result, options = {}) {
  const animate = options.animate !== false;
  const gantt = result.gantt;

  if (!gantt || gantt.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">No schedule data</p>';
    return { element: container, getSVGForExport: () => null };
  }

  const totalTime = result.totalTime || gantt[gantt.length - 1].end;
  const chartWidth = Math.max(400, Math.min(totalTime * 50, options.maxWidth || 800));
  const pxPerUnit = chartWidth / totalTime;

  const procPalette = getActivePalette();
  const procColorMap = new Map();
  for (let i = 0; i < (result.processResults || []).length; i++) {
    const pr = result.processResults[i];
    procColorMap.set(pr.id, procPalette[i % procPalette.length]);
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let html = `<div class="gantt-chart" style="width:${chartWidth}px">`;

  html += '<div class="gantt-bars">';
  gantt.forEach((block, idx) => {
    const left = block.start * pxPerUnit;
    const width = (block.end - block.start) * pxPerUnit;
    const isIdle = block.processId === 'IDLE';
    const color = isIdle ? 'var(--idle-color)' : (procColorMap.get(block.processId) || '#888');
    const animClass = animate && !reducedMotion ? ' entering' : '';
    const delay = animate && !reducedMotion ? `animation-delay:${idx * 80}ms` : '';

    html += `<div class="gantt-block${isIdle ? ' idle' : ' process'}${animClass}" `;
    html += `style="left:${left}px;width:${width}px;background-color:${color};${delay}" `;
    html += `data-pid="${block.processId}" data-start="${block.start}" data-end="${block.end}" `;
    html += `role="img" aria-label="${block.processId} from ${block.start} to ${block.end}">`;

    if (isIdle) {
      // Hatch pattern rendered via CSS repeating-linear-gradient on .gantt-block.idle
    }

    if (width >= 30) {
      html += `<span class="block-label">${block.processId}</span>`;
    }

    html += `<div class="gantt-tooltip"><span class="tt-proc">${block.processId}</span><span class="tt-time">${block.start} → ${block.end} (${block.end - block.start})</span></div>`;
    html += '</div>';
  });
  html += '</div>';

  html += '<div class="gantt-axis">';
  const tickStep = totalTime <= 20 ? 1 : totalTime <= 40 ? 2 : totalTime <= 80 ? 5 : 10;
  for (let t = 0; t <= totalTime; t += tickStep) {
    const left = t * pxPerUnit;
    html += `<div class="gantt-tick" style="left:${left}px"><span>${t}</span></div>`;
  }
  html += '</div>';

  html += '</div>';

  container.innerHTML = html;

  const chartEl = container.querySelector('.gantt-chart');

  function getSVGForExport() {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('xmlns', svgNS);
    svg.setAttribute('width', String(chartWidth + 20));
    svg.setAttribute('height', '80');
    svg.setAttribute('viewBox', `0 0 ${chartWidth + 20} 80`);

    const bg = document.createElementNS(svgNS, 'rect');
    bg.setAttribute('width', '100%');
    bg.setAttribute('height', '100%');
    bg.setAttribute('fill', '#1A2130');
    svg.appendChild(bg);

    gantt.forEach((block) => {
      const x = block.start * pxPerUnit + 10;
      const w = (block.end - block.start) * pxPerUnit;
      const isIdle = block.processId === 'IDLE';
      const color = isIdle ? '#3A4558' : (procColorMap.get(block.processId) || '#888');

      const rect = document.createElementNS(svgNS, 'rect');
      rect.setAttribute('x', String(x));
      rect.setAttribute('y', '10');
      rect.setAttribute('width', String(w));
      rect.setAttribute('height', '36');
      rect.setAttribute('rx', '4');
      rect.setAttribute('fill', color);
      if (isIdle) rect.setAttribute('stroke', '#5C6A7A');
      svg.appendChild(rect);

      if (!isIdle && w > 20) {
        const text = document.createElementNS(svgNS, 'text');
        text.setAttribute('x', String(x + w / 2));
        text.setAttribute('y', '32');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#fff');
        text.setAttribute('font-size', '11');
        text.setAttribute('font-family', 'monospace');
        text.setAttribute('font-weight', 'bold');
        text.textContent = block.processId;
        svg.appendChild(text);
      }
    });

    return svg;
  }

  return { element: container, getSVGForExport };
}
