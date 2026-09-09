/**
 * @fileoverview SchedViz — Lottery Scheduling (fair-share).
 * @module algorithms/lottery
 */

import { computeProcessResults, computeAggregateMetrics } from '../core/metrics.js';

/**
 * Deterministic mulberry32 PRNG — produces reproducible lottery draws so results
 * can be tested and compared.
 * @param {number} a - seed
 * @returns {() => number} function returning [0,1)
 */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Lottery Scheduling: each process holds `tickets`. At each scheduling decision a
 * random ticket is drawn and the owning process runs for a fixed quantum.
 * Preemptive at quantum boundaries. Seeds the PRNG for reproducibility.
 * @param {import('../core/types.js').Process[]} processes
 * @param {{quantum?: number, seed?: number}} [options]
 * @returns {import('../core/types.js').ScheduleResult}
 */
export function run(processes, options = {}) {
  const quantum = options.quantum || 2;
  const rnd = mulberry32(options.seed ?? 42);
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

  function drawWinner(poolIds) {
    const total = poolIds.reduce((s, id) => s + (processes.find(x => x.id === id).tickets || 1), 0);
    let r = rnd() * total;
    for (const id of poolIds) {
      r -= (processes.find(x => x.id === id).tickets || 1);
      if (r < 0) return id;
    }
    return poolIds[poolIds.length - 1];
  }

  while (done.size < n) {
    const poolIds = queue.filter(id => !done.has(id));
    if (poolIds.length === 0) {
      const notDone = processes.filter(p => !done.has(p.id));
      const nextArr = Math.min(...notDone.map(p => p.arrivalTime));
      pushBlock('IDLE', currentTime, nextArr);
      currentTime = nextArr;
      releaseUpTo(currentTime);
      continue;
    }

    const id = drawWinner(poolIds);
    const p = processes.find(x => x.id === id);
    const execTime = Math.min(remaining.get(id), quantum);
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
        tickets: p.tickets || 1
      });
    }
  }

  const totalTime = currentTime;
  const processResults = computeProcessResults(completionMap);
  const metrics = computeAggregateMetrics(processResults, gantt, totalTime);
  return { algorithm: `Lottery (q=${quantum})`, gantt, processResults, ...metrics, totalTime };
}
