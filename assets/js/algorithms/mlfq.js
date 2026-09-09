/**
 * @fileoverview SchedViz — Multilevel Feedback Queue (simplified 3-level).
 * @module algorithms/mlfq
 */

import { computeProcessResults, computeAggregateMetrics } from '../core/metrics.js';

/**
 * Simplified MLFQ with 3 priority queues Q0<Q1<Q2 (Q0 highest) and RR within each.
 * Quanta double down the levels: q0=quantum, q1=2*quantum, q2=4*quantum.
 * A job that exhausts its quantum without finishing drops one level. A periodic
 * priority boost (options.boost) moves all jobs back to Q0 to prevent starvation.
 * Educational simplification — no per-process CPU-accounting aging beyond the boost.
 * @param {import('../core/types.js').Process[]} processes
 * @param {{quantum?: number, boost?: number}} [options]
 * @returns {import('../core/types.js').ScheduleResult}
 */
export function run(processes, options = {}) {
  const quantum = options.quantum || 2;
  const boost = options.boost || 10;
  const LEVELS = 3;
  const n = processes.length;
  const gantt = [];
  const completionMap = new Map();
  const remaining = new Map();
  const done = new Set();
  const enqueued = new Set();
  const level = new Map(); // id -> current queue level
  const queues = [[], [], []];
  const arriveOrder = [...processes].sort((a, b) =>
    a.arrivalTime - b.arrivalTime || processes.indexOf(a) - processes.indexOf(b)
  );
  let currentTime = 0;

  for (const p of processes) { remaining.set(p.id, p.burstTime); level.set(p.id, 0); }

  function releaseUpTo(t) {
    for (const p of arriveOrder) {
      if (p.arrivalTime <= t && !enqueued.has(p.id) && !done.has(p.id)) {
        enqueued.add(p.id);
        queues[level.get(p.id)].push(p.id);
      }
    }
  }

  function boostAll() {
    const all = [];
    for (let lv = 0; lv < LEVELS; lv++) all.push(...queues[lv]);
    queues[0].length = 0; queues[1].length = 0; queues[2].length = 0;
    for (const id of all) { level.set(id, 0); queues[0].push(id); }
  }

  function pushBlock(pid, start, end) {
    if (end <= start) return;
    const prev = gantt[gantt.length - 1];
    if (prev && prev.processId === pid && prev.end === start) prev.end = end;
    else gantt.push({ processId: pid, start, end });
  }

  releaseUpTo(0);
  let nextBoost = boost;

  while (done.size < n) {
    if (currentTime >= nextBoost) {
      boostAll();
      releaseUpTo(currentTime);
      nextBoost = currentTime + boost;
    }

    let lv = queues.findIndex(q => q.length > 0);
    if (lv === -1) {
      const notDone = processes.filter(p => !done.has(p.id));
      const nextArr = Math.min(...notDone.map(p => p.arrivalTime));
      pushBlock('IDLE', currentTime, nextArr);
      currentTime = nextArr;
      releaseUpTo(currentTime);
      continue;
    }

    const id = queues[lv].shift();
    const p = processes.find(x => x.id === id);
    const q = quantum * Math.pow(2, lv);
    const execTime = Math.min(remaining.get(id), q);

    // Preempt if a boost is due before this slice finishes, or a higher job arrives.
    let runUntil = currentTime + execTime;
    if (currentTime + execTime > nextBoost) runUntil = Math.min(runUntil, nextBoost);

    pushBlock(id, currentTime, runUntil);
    const elapsed = runUntil - currentTime;
    remaining.set(id, remaining.get(id) - elapsed);
    currentTime = runUntil;

    if (remaining.get(id) === 0) {
      done.add(id);
      completionMap.set(id, { completionTime: currentTime, arrivalTime: p.arrivalTime, burstTime: p.burstTime });
    } else if (currentTime >= nextBoost) {
      // Boost happened mid-slice — keep at current level but re-add to top after boost.
      releaseUpTo(currentTime);
      queues[lv].push(id);
    } else if (elapsed >= q) {
      // Exhausted its quantum slice: demote.
      const nl = Math.min(LEVELS - 1, lv + 1);
      level.set(id, nl);
      queues[nl].push(id);
    } else {
      // Preempted early (by a boost) — stay at current level.
      queues[lv].push(id);
    }
    releaseUpTo(currentTime);
  }

  const totalTime = currentTime;
  const processResults = computeProcessResults(completionMap);
  const metrics = computeAggregateMetrics(processResults, gantt, totalTime);
  return { algorithm: `MLFQ (q=${quantum}, boost=${boost})`, gantt, processResults, ...metrics, totalTime };
}
