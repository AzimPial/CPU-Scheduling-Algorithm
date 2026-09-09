/**
 * @fileoverview SchedViz — Multilevel Queue (simplified 2-level).
 * @module algorithms/mlq
 */

import { computeProcessResults, computeAggregateMetrics } from '../core/metrics.js';

/**
 * Simplified 2-queue MLQ:
 *   queue 1 (high, default) — Round Robin with fixed quantum
 *   queue 2 (low)           — FCFS
 * Queue 1 runs to absolute priority (no starvation here: background starts only
 * when no foreground process is ready). Processes without an explicit `queue`
 * field are treated as queue 1.
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
  const q1 = [];
  const q2 = [];
  let currentTime = 0;

  for (const p of processes) remaining.set(p.id, p.burstTime);

  const arriveOrder = [...processes].sort((a, b) =>
    a.arrivalTime - b.arrivalTime || processes.indexOf(a) - processes.indexOf(b)
  );

  function releaseUpTo(t) {
    for (const p of arriveOrder) {
      if (p.arrivalTime <= t && !enqueued.has(p.id) && !done.has(p.id)) {
        enqueued.add(p.id);
        ((p.queue || 1) === 1 ? q1 : q2).push(p.id);
      }
    }
  }

  function pushBlock(pid, start, end) {
    if (end <= start) return;
    const prev = gantt[gantt.length - 1];
    if (prev && prev.processId === pid && prev.end === start) prev.end = end;
    else gantt.push({ processId: pid, start, end });
  }

  while (done.size < n) {
    releaseUpTo(currentTime);

    if (q1.length === 0 && q2.length === 0) {
      const notDone = processes.filter(p => !done.has(p.id));
      const nextArr = Math.min(...notDone.map(p => p.arrivalTime));
      pushBlock('IDLE', currentTime, nextArr);
      currentTime = nextArr;
      releaseUpTo(currentTime);
      continue;
    }

    const fromHigh = q1.length > 0;
    const pool = fromHigh ? q1 : q2;

    if (fromHigh) {
      // Round Robin on queue 1.
      const id = pool.shift();
      const execTime = Math.min(remaining.get(id), quantum);
      const p = processes.find(x => x.id === id);
      pushBlock(id, currentTime, currentTime + execTime);
      remaining.set(id, remaining.get(id) - execTime);
      currentTime += execTime;
      releaseUpTo(currentTime);
      if (remaining.get(id) === 0) { done.add(id); completion(id, p); }
      else pool.push(id);
    } else {
      // FCFS on queue 2: run to completion unless a high-priority job arrives.
      const id = pool[0];
      const p = processes.find(x => x.id === id);
      const finish = currentTime + remaining.get(id);
      const nextHighArr = arriveOrder
        .filter(x => (x.queue || 1) === 1 && x.arrivalTime > currentTime && !done.has(x.id) && !enqueued.has(x.id))
        .map(x => x.arrivalTime);
      const stop = nextHighArr.length ? Math.min(finish, Math.min(...nextHighArr)) : finish;
      pushBlock(id, currentTime, stop);
      const elapsed = stop - currentTime;
      remaining.set(id, remaining.get(id) - elapsed);
      currentTime = stop;
      releaseUpTo(currentTime);
      if (remaining.get(id) === 0) { done.add(id); q2.shift(); completion(id, p); }
    }
  }

  function completion(id, p) {
    completionMap.set(id, {
      completionTime: currentTime,
      arrivalTime: p.arrivalTime,
      burstTime: p.burstTime
    });
  }

  const totalTime = currentTime;
  const processResults = computeProcessResults(completionMap);
  const metrics = computeAggregateMetrics(processResults, gantt, totalTime);
  return { algorithm: `Multilevel Queue (q=${quantum})`, gantt, processResults, ...metrics, totalTime };
}
