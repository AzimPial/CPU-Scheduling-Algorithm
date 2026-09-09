/**
 * @fileoverview SchedViz — Shortest Remaining Time First (Preemptive SJF) algorithm.
 * @module algorithms/srtf
 */

import { computeProcessResults, computeAggregateMetrics } from '../core/metrics.js';

/**
 * Run SRTF (preemptive SJF) scheduling.
 * At every event (arrival/completion), the process with smallest remaining burst time runs.
 * Tie-break: earliest arrival, then input order.
 * @param {import('../core/types.js').Process[]} processes
 * @returns {import('../core/types.js').ScheduleResult}
 */
export function run(processes) {
  const n = processes.length;
  const gantt = [];
  const completionMap = new Map();
  const remaining = new Map();
  const done = new Set();
  let currentTime = 0;
  let completedCount = 0;
  let lastScheduled = null;

  for (const p of processes) {
    remaining.set(p.id, p.burstTime);
  }

  while (completedCount < n) {
    const ready = processes.filter(p =>
      p.arrivalTime <= currentTime && remaining.get(p.id) > 0 && !done.has(p.id)
    );

    if (ready.length === 0) {
      const notDone = processes.filter(p => !done.has(p.id));
      const nextArr = Math.min(...notDone.map(p => p.arrivalTime));
      gantt.push({ processId: 'IDLE', start: currentTime, end: nextArr });
      currentTime = nextArr;
      continue;
    }

    ready.sort((a, b) => {
      const remA = remaining.get(a.id);
      const remB = remaining.get(b.id);
      if (remA !== remB) return remA - remB;
      if (a.arrivalTime !== b.arrivalTime) return a.arrivalTime - b.arrivalTime;
      return processes.indexOf(a) - processes.indexOf(b);
    });

    const selected = ready[0];

    const futureArrivals = processes
      .filter(p => p.arrivalTime > currentTime && !done.has(p.id))
      .map(p => p.arrivalTime);

    let runUntil;
    if (futureArrivals.length === 0) {
      runUntil = currentTime + remaining.get(selected.id);
    } else {
      const nextArr = Math.min(...futureArrivals);
      const finishTime = currentTime + remaining.get(selected.id);
      runUntil = Math.min(nextArr, finishTime);
    }

    const prevBlock = gantt[gantt.length - 1];
    if (prevBlock && prevBlock.processId === selected.id && prevBlock.end === currentTime) {
      prevBlock.end = runUntil;
    } else {
      gantt.push({ processId: selected.id, start: currentTime, end: runUntil });
    }

    const elapsed = runUntil - currentTime;
    remaining.set(selected.id, remaining.get(selected.id) - elapsed);
    currentTime = runUntil;

    if (remaining.get(selected.id) === 0) {
      done.add(selected.id);
      completionMap.set(selected.id, {
        completionTime: currentTime,
        arrivalTime: selected.arrivalTime,
        burstTime: selected.burstTime
      });
      completedCount++;
    }
  }

  const totalTime = currentTime;
  const processResults = computeProcessResults(completionMap);
  const metrics = computeAggregateMetrics(processResults, gantt, totalTime);

  return {
    algorithm: 'SRTF (Preemptive SJF)',
    gantt,
    processResults,
    ...metrics,
    totalTime
  };
}
