/**
 * @fileoverview SchedViz — First Come First Served (FCFS) algorithm.
 * @module algorithms/fcfs
 */

import { computeProcessResults, computeAggregateMetrics } from '../core/metrics.js';

/**
 * Run FCFS scheduling algorithm.
 * Non-preemptive. Sort by arrival time, ties by input order. Run to completion in order.
 * @param {import('../core/types.js').Process[]} processes
 * @returns {import('../core/types.js').ScheduleResult}
 */
export function run(processes) {
  const sorted = [...processes].sort((a, b) => {
    if (a.arrivalTime !== b.arrivalTime) return a.arrivalTime - b.arrivalTime;
    return processes.indexOf(a) - processes.indexOf(b);
  });

  const gantt = [];
  const completionMap = new Map();
  let currentTime = 0;

  for (const proc of sorted) {
    if (currentTime < proc.arrivalTime) {
      gantt.push({ processId: 'IDLE', start: currentTime, end: proc.arrivalTime });
      currentTime = proc.arrivalTime;
    }

    const start = currentTime;
    const end = currentTime + proc.burstTime;
    gantt.push({ processId: proc.id, start, end });

    completionMap.set(proc.id, {
      completionTime: end,
      arrivalTime: proc.arrivalTime,
      burstTime: proc.burstTime
    });

    currentTime = end;
  }

  const totalTime = currentTime;
  const processResults = computeProcessResults(completionMap);
  const metrics = computeAggregateMetrics(processResults, gantt, totalTime);

  return {
    algorithm: 'FCFS',
    gantt,
    processResults,
    ...metrics,
    totalTime
  };
}
