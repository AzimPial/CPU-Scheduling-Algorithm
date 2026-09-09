/**
 * @fileoverview SchedViz — Share and export system (PDF, PNG, shareable link).
 * Provides a popover menu with export options and implements each flow.
 * @module ui/shareExport
 */

import { encodeState } from '../core/storage.js';

/**
 * Create a "Share / Export" button with a popover dropdown.
 * @param {HTMLElement} container - Element to append the button+popover to
 * @param {Object} options
 * @param {import('../core/types.js').ScheduleResult} options.result
 * @param {string} [options.algorithmKey]
 * @param {Array} options.processes
 * @param {string[]} [options.selectedAlgorithms]
 * @param {Object} [options.runOptions] - quantum, aging, boost
 * @returns {{destroy: () => void}}
 */
export function createShareExportPopover(container, options = {}) {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  wrapper.style.display = 'inline-flex';

  const btn = document.createElement('button');
  btn.className = 'btn btn-sm btn-ghost';
  btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> Share / Export';

  const popover = document.createElement('div');
  popover.className = 'popover';
  popover.style.display = 'none';

  const pdfItem = document.createElement('button');
  pdfItem.className = 'popover-item';
  pdfItem.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> Download PDF';
  pdfItem.addEventListener('click', (e) => {
    e.stopPropagation();
    hidePopover();
    exportPDF(options);
  });

  const pngItem = document.createElement('button');
  pngItem.className = 'popover-item';
  pngItem.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Download PNG';
  pngItem.addEventListener('click', (e) => {
    e.stopPropagation();
    hidePopover();
    exportPNG(options);
  });

  const linkItem = document.createElement('button');
  linkItem.className = 'popover-item';
  linkItem.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Copy Shareable Link';
  linkItem.addEventListener('click', (e) => {
    e.stopPropagation();
    hidePopover();
    copyShareLink(options);
  });

  popover.appendChild(pdfItem);
  popover.appendChild(pngItem);
  popover.appendChild(linkItem);

  wrapper.appendChild(btn);
  wrapper.appendChild(popover);
  container.appendChild(wrapper);

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePopover();
  });

  function togglePopover() {
    const visible = popover.style.display !== 'none';
    if (visible) {
      hidePopover();
    } else {
      showPopover();
    }
  }

  function showPopover() {
    popover.style.display = 'block';
    setTimeout(() => {
      document.addEventListener('click', outsideClickHandler);
    }, 0);
  }

  function hidePopover() {
    popover.style.display = 'none';
    document.removeEventListener('click', outsideClickHandler);
  }

  function outsideClickHandler(e) {
    if (!wrapper.contains(e.target)) {
      hidePopover();
    }
  }

  function destroy() {
    hidePopover();
    wrapper.remove();
  }

  return { destroy };
}

/**
 * Find the closest results container (gantt + table + metrics).
 * @param {Object} options
 * @returns {HTMLElement|null}
 */
function findResultElement(options) {
  if (options.result && options.result._resultContainer) {
    return options.result._resultContainer;
  }
  const msgBody = document.querySelector('.msg-assistant:last-child .msg-body');
  if (msgBody) return msgBody;
  const card = document.querySelector('.result-card');
  if (card) return card.closest('.msg-body') || card.parentElement;
  return null;
}

/**
 * Prepare the element for export: force light theme, disable animations.
 * @returns {{element: HTMLElement, theme: string|null, styleTag: HTMLElement}}
 */
function prepareForCapture(element) {
  const theme = document.documentElement.getAttribute('data-theme');
  document.documentElement.setAttribute('data-theme', 'light');

  const styleTag = document.createElement('style');
  styleTag.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; }';
  document.head.appendChild(styleTag);

  return { element, theme, styleTag };
}

/**
 * Restore theme and animations after capture.
 * @param {string|null} theme
 * @param {HTMLElement} styleTag
 */
function restoreAfterCapture(theme, styleTag) {
  if (theme !== null) {
    document.documentElement.setAttribute('data-theme', theme);
  }
  styleTag.remove();
}

/**
 * Export the results as a PDF file.
 * @param {Object} options
 */
export async function exportPDF(options) {
  const element = findResultElement(options);
  if (!element) {
    showToast('No results to export');
    return;
  }

  const { theme, styleTag } = prepareForCapture(element);

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#FAF9F5'
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    const pdf = new jspdf.jsPDF({
      orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
      unit: 'px',
      format: [imgWidth, imgHeight]
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    if (imgHeight <= pdfHeight) {
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    } else {
      const pageContentHeight = pdfHeight;
      const sourceHeight = (imgHeight / pdfHeight) * pageContentHeight;
      let remainingHeight = imgHeight;
      let yOffset = 0;
      let pageAdded = false;

      while (remainingHeight > 0) {
        const sliceHeight = Math.min(sourceHeight, remainingHeight);

        if (pageAdded) {
          pdf.addPage([imgWidth, imgHeight], imgWidth > imgHeight ? 'landscape' : 'portrait');
        }

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imgWidth;
        tempCanvas.height = sliceHeight;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, yOffset, imgWidth, sliceHeight, 0, 0, imgWidth, sliceHeight);

        const sliceData = tempCanvas.toDataURL('image/png');
        const sliceImgHeight = (sliceHeight / imgHeight) * pdfHeight;
        pdf.addImage(sliceData, 'PNG', 0, 0, pdfWidth, sliceImgHeight);

        remainingHeight -= sliceHeight;
        yOffset += sliceHeight;
        pageAdded = true;
      }
    }

    const date = new Date().toISOString().slice(0, 10);
    const name = options.algorithmKey || 'compare';
    pdf.save(`algo-results-${name}-${date}.pdf`);
    showToast('PDF downloaded');
  } catch (err) {
    console.error('PDF export failed:', err);
    showToast('PDF export failed');
  } finally {
    restoreAfterCapture(theme, styleTag);
  }
}

/**
 * Export the results as a PNG file.
 * @param {Object} options
 */
export async function exportPNG(options) {
  const element = findResultElement(options);
  if (!element) {
    showToast('No results to export');
    return;
  }

  const { theme, styleTag } = prepareForCapture(element);

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#FAF9F5'
    });

    canvas.toBlob((blob) => {
      if (!blob) {
        showToast('PNG export failed');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      const name = options.algorithmKey || 'compare';
      a.download = `algo-results-${name}-${date}.png`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('PNG downloaded');
    });
  } catch (err) {
    console.error('PNG export failed:', err);
    showToast('PNG export failed');
  } finally {
    restoreAfterCapture(theme, styleTag);
  }
}

/**
 * Build a shareable URL from the current state and copy to clipboard.
 * @param {Object} options
 */
export async function copyShareLink(options) {
  const state = {
    algorithm: options.mode === 'compare' ? (options.selectedAlgorithms || []) : options.algorithmKey,
    options: options.options || {},
    processes: options.processes,
    mode: options.mode || 'visualize',
    selectedAlgorithms: options.selectedAlgorithms || [],
    autoRun: true
  };

  const url = window.location.origin + window.location.pathname + encodeState(state);

  try {
    await navigator.clipboard.writeText(url);
    showToast('Link copied!');
  } catch {
    const ta = document.createElement('textarea');
    ta.value = url;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    showToast(ok ? 'Link copied!' : 'Failed to copy');
  }
}

/**
 * Show a temporary toast notification.
 * @param {string} message
 */
export function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, 2000);
}
