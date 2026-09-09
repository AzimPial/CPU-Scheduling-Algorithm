/**
 * @fileoverview SchedViz — Priority Non-Preemptive algorithm.
 * @module algorithms/priorityNP
 */

import { computeProcessResults, computeAggregateMetrics } from '../core/metrics.js';

/**
 * Run Priority Non-Preemptive scheduling.
 * Lower priority number = higher priority. Tie-break: earliest arrival, then input order.
 * @param {import('../core/types.js').Process[]} processes
 * @returns {import('../core/types.js').ScheduleResult}
 */
export function run(processes) {
  const n = processes.length;
  const gantt = [];
  const completionMap = new Map();
  const done = new Set();
  let currentTime = 0;
  let completedCount = 0;

  while (completedCount < n) {
    const ready = processes.filter(p =>
      p.arrivalTime <= currentTime && !done.has(p.id)
    );

    if (ready.length === 0) {
      const notDone = processes.filter(p => !done.has(p.id));
      const nextArr = Math.min(...notDone.map(p => p.arrivalTime));
      gantt.push({ processId: 'IDLE', start: currentTime, end: nextArr });
      currentTime = nextArr;
      continue;
    }

    ready.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.arrivalTime !== b.arrivalTime) return a.arrivalTime - b.arrivalTime;
      return processes.indexOf(a) - processes.indexOf(b);
    });

    const selected = ready[0];
    const start = currentTime;
    const end = currentTime + selected.burstTime;

    gantt.push({ processId: selected.id, start, end });
    completionMap.set(selected.id, {
      completionTime: end,
      arrivalTime: selected.arrivalTime,
      burstTime: selected.burstTime
    });

    done.add(selected.id);
    currentTime = end;
    completedCount++;
  }

  const totalTime = currentTime;
  const processResults = computeProcessResults(completionMap);
  const metrics = computeAggregateMetrics(processResults, gantt, totalTime);

  return {
    algorithm: 'Priority (Non-Preemptive)',
    gantt,
    processResults,
    ...metrics,
    totalTime
  };
}
