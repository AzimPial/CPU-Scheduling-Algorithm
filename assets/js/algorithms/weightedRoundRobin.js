/**
 * @fileoverview SchedViz — Weighted Round Robin (WRR).
 * @module algorithms/weightedRoundRobin
 */

import { computeProcessResults, computeAggregateMetrics } from '../core/metrics.js';

/**
 * WRR: processes are served in a fixed cyclic order, but each gets a slice
 * proportional to its weight (slice = weight * quantum). Preemptive at slice
 * boundaries. New arrivals join at the back of the cycle.
 * @param {import('../core/types.js').Process[]} processes
 * @param {{quantum?: number}} [options]
 * @returns {import('../core/types.js').ScheduleResult}
 */
export function run(processes, options = {}) {
  const quantum = options.quantum || 2;
  const n = processes.length;
  const gantt = [];
  const completionMap = new Map();
  const remaining = new Map();
  const done = new Set();
  const enqueued = new Set();
  const queue = [];
  let currentTime = 0;

  for (const p of processes) remaining.set(p.id, p.burstTime);

  const arriveOrder = [...processes].sort((a, b) =>
    a.arrivalTime - b.arrivalTime || processes.indexOf(a) - processes.indexOf(b)
  );

  function releaseUpTo(t) {
    for (const p of arriveOrder) {
      if (p.arrivalTime <= t && !enqueued.has(p.id) && !done.has(p.id)) {
        enqueued.add(p.id);
        queue.push(p.id);
      }
    }
  }
  function pushBlock(pid, start, end) {
    if (end <= start) return;
    const prev = gantt[gantt.length - 1];
    if (prev && prev.processId === pid && prev.end === start) prev.end = end;
    else gantt.push({ processId: pid, start, end });
  }

  releaseUpTo(0);

  while (done.size < n) {
    if (queue.length === 0) {
      const notDone = processes.filter(p => !done.has(p.id));
      const nextArr = Math.min(...notDone.map(p => p.arrivalTime));
      pushBlock('IDLE', currentTime, nextArr);
      currentTime = nextArr;
      releaseUpTo(currentTime);
      continue;
    }

    const id = queue.shift();
    const p = processes.find(x => x.id === id);
    const weight = p.weight || 1;
    const slice = weight * quantum;
    const execTime = Math.min(remaining.get(id), slice);

    pushBlock(id, currentTime, currentTime + execTime);
    remaining.set(id, remaining.get(id) - execTime);
    currentTime += execTime;
    releaseUpTo(currentTime);

    if (remaining.get(id) === 0) {
      done.add(id);
      completionMap.set(id, {
        completionTime: currentTime,
        arrivalTime: p.arrivalTime,
        burstTime: p.burstTime,
        weight
      });
    } else {
      queue.push(id);
    }
  }

  const totalTime = currentTime;
  const processResults = computeProcessResults(completionMap);
  const metrics = computeAggregateMetrics(processResults, gantt, totalTime);
  return { algorithm: `Weighted Round Robin (q=${quantum})`, gantt, processResults, ...metrics, totalTime };
}
