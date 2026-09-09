/**
 * @fileoverview SchedViz — Completely Fair Scheduler (educational CFS simulation).
 * @module algorithms/completelyFairScheduler
 */

import { computeProcessResults, computeAggregateMetrics } from '../core/metrics.js';

/**
 * CFS (educational): each process accumulates `vruntime` proportional to the CPU
 * time it consumes divided by its weight (nice-derived). At every decision the
 * process with the smallest vruntime runs, keeping execution perfectly fair in
 * virtual time. This is a single-CPU, work-conserving approximation of Linux CFS —
 * it omits wakeup preemption heuristics, granularity clamping and scheduler tick
 * details, but preserves the core vruntime fairness model.
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
  let minVruntime = 0;

  for (const p of processes) { remaining.set(p.id, p.burstTime); vruntime.set(p.id, 0); }

  const niceWeight = (nice) => 1024 / Math.pow(1.25, nice);

  const arriveOrder = [...processes].sort((a, b) =>
    a.arrivalTime - b.arrivalTime || processes.indexOf(a) - processes.indexOf(b)
  );

  function releaseUpTo(t) {
    // New arrivals start with the current minimum vruntime (CFS "lessness").
    for (const p of arriveOrder) {
      if (p.arrivalTime <= t && !enqueued.has(p.id) && !done.has(p.id)) {
        enqueued.add(p.id);
        vruntime.set(p.id, minVruntime);
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
    const ready = processes.filter(p => enqueued.has(p.id) && !done.has(p.id));
    if (ready.length === 0) {
      const notDone = processes.filter(p => !done.has(p.id));
      const nextArr = Math.min(...notDone.map(p => p.arrivalTime));
      pushBlock('IDLE', currentTime, nextArr);
      currentTime = nextArr;
      releaseUpTo(currentTime);
      continue;
    }

    // Pick smallest vruntime.
    let best = null;
    let bestVr = Infinity;
    for (const p of ready) {
      const vr = vruntime.get(p.id);
      if (vr < bestVr) { bestVr = vr; best = p; }
    }
    const id = best.id;
    const p = best;
    const weight = niceWeight(p.nice ?? 0);
    const execTime = Math.min(remaining.get(id), quantum);

    pushBlock(id, currentTime, currentTime + execTime);
    remaining.set(id, remaining.get(id) - execTime);
    vruntime.set(id, vruntime.get(id) + execTime / weight);
    currentTime += execTime;
    releaseUpTo(currentTime);

    // Track min vruntime among remaining for fair new arrivals.
    const cands = processes.map(x => vruntime.get(x.id)).filter(v => v !== undefined);
    minVruntime = cands.length ? Math.min(...cands) : 0;

    if (remaining.get(id) === 0) {
      done.add(id);
      completionMap.set(id, {
        completionTime: currentTime,
        arrivalTime: p.arrivalTime,
        burstTime: p.burstTime,
        nice: p.nice ?? 0
      });
    }
  }

  const totalTime = currentTime;
  const processResults = computeProcessResults(completionMap);
  const metrics = computeAggregateMetrics(processResults, gantt, totalTime);
  return { algorithm: 'CFS (Educational)', gantt, processResults, ...metrics, totalTime };
}
