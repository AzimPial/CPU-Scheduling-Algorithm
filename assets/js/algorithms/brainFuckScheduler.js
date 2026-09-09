/**
 * @fileoverview SchedViz — Brain Fuck Scheduler (educational BFS simulation).
 * @module algorithms/brainFuckScheduler
 */

import { computeProcessResults, computeAggregateMetrics } from '../core/metrics.js';

/**
 * BFS (educational): tasks are ranked by a virtual deadline. A task's virtual
 * deadline is derived from its nice-based priority and its current virtual runtime;
 * the task with the smallest virtual deadline runs. Like Linux BFS, this yields
 * O(1) selection among eligible tasks and good interactivity for nice-favored
 * processes. Single-CPU, work-conserving approximation.
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
  const vruntime = new Map();
  const done = new Set();
  const enqueued = new Set();
  let currentTime = 0;

  for (const p of processes) { remaining.set(p.id, p.burstTime); vruntime.set(p.id, 0); }

  const niceFactor = (nice) => Math.pow(1.25, nice);

  const arriveOrder = [...processes].sort((a, b) =>
    a.arrivalTime - b.arrivalTime || processes.indexOf(a) - processes.indexOf(b)
  );

  function releaseUpTo(t) {
    for (const p of arriveOrder) {
      if (p.arrivalTime <= t && !enqueued.has(p.id) && !done.has(p.id)) enqueued.add(p.id);
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
    const ready = processes.filter(p => enqueued.has(p.id) && !done.has(p.id));
    if (ready.length === 0) {
      const notDone = processes.filter(p => !done.has(p.id));
      const nextArr = Math.min(...notDone.map(p => p.arrivalTime));
      pushBlock('IDLE', currentTime, nextArr);
      currentTime = nextArr;
      releaseUpTo(currentTime);
      continue;
    }

    // Virtual deadline = virtual runtime scaled by nice; smallest runs.
    let best = null;
    let bestVd = Infinity;
    for (const p of ready) {
      const f = niceFactor(p.nice ?? 0);
      const vd = vruntime.get(p.id) * f + (remaining.get(p.id) * 0.001);
      if (vd < bestVd) { bestVd = vd; best = p; }
    }
    const id = best.id;
    const execTime = Math.min(remaining.get(id), quantum);
    pushBlock(id, currentTime, currentTime + execTime);
    remaining.set(id, remaining.get(id) - execTime);
    vruntime.set(id, vruntime.get(id) + execTime * niceFactor(best.nice ?? 0));
    currentTime += execTime;
    releaseUpTo(currentTime);

    if (remaining.get(id) === 0) {
      done.add(id);
      completionMap.set(id, {
        completionTime: currentTime,
        arrivalTime: best.arrivalTime,
        burstTime: best.burstTime,
        nice: best.nice ?? 0
      });
    }
  }

  const totalTime = currentTime;
  const processResults = computeProcessResults(completionMap);
  const metrics = computeAggregateMetrics(processResults, gantt, totalTime);
  return { algorithm: 'BFS (Educational)', gantt, processResults, ...metrics, totalTime };
}
