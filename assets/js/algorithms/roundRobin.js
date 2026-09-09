/**
 * @fileoverview SchedViz — Round Robin algorithm.
 * @module algorithms/roundRobin
 */

import { computeProcessResults, computeAggregateMetrics } from '../core/metrics.js';

/**
 * Run Round Robin scheduling.
 * FIFO ready queue. Each process runs for min(remaining, quantum).
 * If it doesn't finish, re-queued at the back.
 * Newly arrived processes during a quantum are enqueued before the preempted process.
 * @param {import('../core/types.js').Process[]} processes
 * @param {{quantum: number}} options
 * @returns {import('../core/types.js').ScheduleResult}
 */
export function run(processes, options = {}) {
  const quantum = options.quantum || 2;
  const n = processes.length;
  const gantt = [];
  const completionMap = new Map();
  const remaining = new Map();
  const done = new Set();
  let currentTime = 0;

  for (const p of processes) {
    remaining.set(p.id, p.burstTime);
  }

  const queue = [];
  const enqueued = new Set();

  const arriveOrder = [...processes].sort((a, b) => {
    if (a.arrivalTime !== b.arrivalTime) return a.arrivalTime - b.arrivalTime;
    return processes.indexOf(a) - processes.indexOf(b);
  });

  for (const p of arriveOrder) {
    if (p.arrivalTime <= currentTime && !enqueued.has(p.id)) {
      queue.push(p.id);
      enqueued.add(p.id);
    }
  }

  while (queue.length > 0 || done.size < n) {
    if (queue.length === 0) {
      const notDone = processes.filter(p => !done.has(p.id));
      const nextArr = Math.min(...notDone.map(p => p.arrivalTime));
      gantt.push({ processId: 'IDLE', start: currentTime, end: nextArr });
      currentTime = nextArr;

      for (const p of arriveOrder) {
        if (p.arrivalTime <= currentTime && !enqueued.has(p.id) && !done.has(p.id)) {
          queue.push(p.id);
          enqueued.add(p.id);
        }
      }
      continue;
    }

    const currentId = queue.shift();
    const currentProc = processes.find(p => p.id === currentId);
    const execTime = Math.min(remaining.get(currentId), quantum);
    const start = currentTime;
    const end = currentTime + execTime;

    gantt.push({ processId: currentId, start, end });
    remaining.set(currentId, remaining.get(currentId) - execTime);
    currentTime = end;

    const newlyArrived = [];
    for (const p of arriveOrder) {
      if (p.arrivalTime <= currentTime && !enqueued.has(p.id) && !done.has(p.id)) {
        newlyArrived.push(p.id);
        enqueued.add(p.id);
      }
    }

    if (remaining.get(currentId) === 0) {
      done.add(currentId);
      completionMap.set(currentId, {
        completionTime: currentTime,
        arrivalTime: currentProc.arrivalTime,
        burstTime: currentProc.burstTime
      });
    } else {
      for (const id of newlyArrived) {
        queue.push(id);
      }
      queue.push(currentId);
    }
  }

  const totalTime = currentTime;
  const processResults = computeProcessResults(completionMap);
  const metrics = computeAggregateMetrics(processResults, gantt, totalTime);

  return {
    algorithm: `Round Robin (q=${quantum})`,
    gantt,
    processResults,
    ...metrics,
    totalTime
  };
}
