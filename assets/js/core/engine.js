/**
 * @fileoverview SchedViz — Reusable event-driven scheduling engine.
 * Handles the common loop: track remaining burst, jump over idle gaps, select a
 * ready process, run until the next arrival / completion / quantum boundary, and
 * merge adjacent blocks. Produces a partial ScheduleResult that a concrete
 * algorithm decorates with its display name and any extra fields.
 * @module core/engine
 */

import { computeProcessResults, computeAggregateMetrics } from './metrics.js';

/**
 * Run a scheduling simulation over a set of processes.
 * @param {import('./types.js').Process[]} processes
 * @param {Function} selectFn - (ready: Array<Process>, ctx: Object) => Process | null
 *   `ready` is the list of arrived-not-done processes. The returned process is the one
 *   chosen to run next. ctx exposes {currentTime, remaining (Map id->int), firstRun (Map id->bool)}.
 * @param {Object} [options]
 * @param {boolean} [options.preemptive=false] - Re-evaluate selection at every arrival boundary.
 * @param {number} [options.quantum] - Optional maximum continuous run length (time-sharing engines).
 * @param {boolean} [options.contiguous=true] - Merge adjacent blocks of the same process.
 * @param {number} [options.maxTime] - Optional hard simulation horizon (default: unbounded).
 * @returns {Object} { gantt, processResults, totalTime, ...metrics }
 *   plus `extra` object merged into the result by the caller.
 */
export function simulate(processes, selectFn, options = {}) {
  const { preemptive = false, quantum, contiguous = true, maxTime } = options;
  const n = processes.length;
  const gantt = [];
  const completionMap = new Map();
  const remaining = new Map();
  const done = new Set();
  const seen = new Set();
  let currentTime = 0;
  let completedCount = 0;

  for (const p of processes) remaining.set(p.id, p.burstTime);

  const ctx = { currentTime: 0, remaining, firstRun: {} };

  function pushBlock(pid, start, end) {
    if (end <= start) return;
    if (contiguous) {
      const prev = gantt[gantt.length - 1];
      if (prev && prev.processId === pid && prev.end === start) {
        prev.end = end;
        return;
      }
    }
    gantt.push({ processId: pid, start, end });
  }

  while (completedCount < n) {
    if (maxTime !== undefined && currentTime >= maxTime) break;

    ctx.currentTime = currentTime;
    const ready = processes.filter(p =>
      p.arrivalTime <= currentTime && remaining.get(p.id) > 0 && !done.has(p.id)
    );

    if (ready.length === 0) {
      const notDone = processes.filter(p => !done.has(p.id));
      if (notDone.length === 0) break;
      const nextArr = Math.min(...notDone.map(p => p.arrivalTime));
      if (maxTime !== undefined && nextArr >= maxTime) {
        pushBlock('IDLE', currentTime, maxTime);
        currentTime = maxTime;
        break;
      }
      pushBlock('IDLE', currentTime, nextArr);
      currentTime = nextArr;
      continue;
    }

    const selected = selectFn(ready, ctx);
    if (!selected) break;
    const pid = selected.id;
    if (!seen.has(pid)) { seen.add(pid); ctx.firstRun[pid] = true; }

    const futureArrivals = processes
      .filter(p => p.arrivalTime > currentTime && !done.has(p.id))
      .map(p => p.arrivalTime);

    let runUntil;
    if (preemptive) {
      const finishTime = currentTime + remaining.get(pid);
      if (futureArrivals.length === 0) {
        runUntil = finishTime;
      } else {
        runUntil = Math.min(finishTime, Math.min(...futureArrivals));
      }
      if (quantum !== undefined) runUntil = Math.min(runUntil, currentTime + quantum);
    } else {
      runUntil = currentTime + remaining.get(pid);
    }

    if (maxTime !== undefined) runUntil = Math.min(runUntil, maxTime);

    pushBlock(pid, currentTime, runUntil);
    const elapsed = runUntil - currentTime;
    remaining.set(pid, remaining.get(pid) - elapsed);
    currentTime = runUntil;

    if (remaining.get(pid) === 0) {
      done.add(pid);
      completionMap.set(pid, {
        completionTime: currentTime,
        arrivalTime: selected.arrivalTime,
        burstTime: selected.burstTime
      });
      completedCount++;
    }
  }

  if (maxTime !== undefined) pushBlock('IDLE', currentTime, maxTime);

  const totalTime = currentTime;
  const processResults = computeProcessResults(completionMap);
  const metrics = computeAggregateMetrics(processResults, gantt, totalTime);
  return { gantt, processResults, totalTime, ...metrics };
}

/**
 * Convenience: build a final ScheduleResult from an engine result plus a display name.
 * @param {Object} engineResult - from simulate()
 * @param {string} algorithmName
 * @param {Object} [extra]
 * @returns {import('./types.js').ScheduleResult}
 */
export function makeResult(engineResult, algorithmName, extra = {}) {
  return { algorithm: algorithmName, ...engineResult, ...extra };
}
