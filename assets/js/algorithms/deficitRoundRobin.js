/**
 * @fileoverview SchedViz — Deficit Round Robin (DRR).
 * @module algorithms/deficitRoundRobin
 */

import { computeProcessResults, computeAggregateMetrics } from '../core/metrics.js';

/**
 * DRR: each process keeps a deficit counter. Each round adds a credit (base
 * quantum modulated by weight), then the process may run up to its accumulated
 * deficit; leftover deficit is carried to the next round. Work-conserving.
 * @param {import('../core/types.js').Process[]} processes
 * @param {{quantum?: number}} [options]
 * @returns {import('../core/types.js').ScheduleResult}
 */
export function run(processes, options = {}) {
  const baseQuantum = options.quantum || 4;
  const n = processes.length;
  const gantt = [];
  const completionMap = new Map();
  const remaining = new Map();
  const deficit = new Map();
  const done = new Set();
  const enqueued = new Set();
  let currentTime = 0;

  for (const p of processes) { remaining.set(p.id, p.burstTime); deficit.set(p.id, 0); }

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
    const active = processes.filter(p => enqueued.has(p.id) && !done.has(p.id));
    // Only add new credit to processes that still need work this pass.
    const roundPool = active.filter(p => deficit.get(p.id) === 0 && remaining.get(p.id) > 0);
    if (active.length === 0) {
      const notDone = processes.filter(p => !done.has(p.id));
      const nextArr = Math.min(...notDone.map(p => p.arrivalTime));
      pushBlock('IDLE', currentTime, nextArr);
      currentTime = nextArr;
      releaseUpTo(currentTime);
      continue;
    }

    let served = false;
    for (const p of active) {
      if (remaining.get(p.id) === 0) continue;
      const weight = p.weight || 1;
      deficit.set(p.id, deficit.get(p.id) + baseQuantum * weight);
      const execTime = Math.min(remaining.get(p.id), deficit.get(p.id));
      if (execTime <= 0) continue;
      served = true;
      pushBlock(p.id, currentTime, currentTime + execTime);
      remaining.set(p.id, remaining.get(p.id) - execTime);
      deficit.set(p.id, deficit.get(p.id) - execTime);
      currentTime += execTime;
      releaseUpTo(currentTime);
      if (remaining.get(p.id) === 0) {
        done.add(p.id);
        completionMap.set(p.id, {
          completionTime: currentTime,
          arrivalTime: p.arrivalTime,
          burstTime: p.burstTime,
          weight
        });
      }
    }

    // If the pass served nobody (all deficits carried from prior rounds consumed),
    // force credit refresh to avoid a livelock.
    if (!served) {
      for (const p of active) {
        if (deficit.get(p.id) === 0 && remaining.get(p.id) > 0) {
          deficit.set(p.id, (p.weight || 1) * baseQuantum);
        }
      }
    }
  }

  const totalTime = currentTime;
  const processResults = computeProcessResults(completionMap);
  const metrics = computeAggregateMetrics(processResults, gantt, totalTime);
  return { algorithm: `Deficit Round Robin (q=${baseQuantum})`, gantt, processResults, ...metrics, totalTime };
}
