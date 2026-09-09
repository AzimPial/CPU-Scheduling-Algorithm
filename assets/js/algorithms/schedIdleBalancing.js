/**
 * @fileoverview SchedViz — Load-balanced shared-queue scheduler (educational).
 * @module algorithms/schedIdleBalancing
 */

import { simulate, makeResult } from '../core/engine.js';

/**
 * Idle-balancing scheduler — educational model of a load-balanced shared runqueue.
 * All processes are visible to a single logical scheduler that advances whichever
 * process has received the least CPU so far, keeping the perceived load balanced
 * and preventing idle imbalance/starvation. This abstracts the multi-core load
 * balancer (e.g. Linux/little-sched balancing) into an O(1) "least-served first"
 * policy on one CPU.
 * @param {import('../core/types.js').Process[]} processes
 * @param {{quantum?: number}} [options]
 * @returns {import('../core/types.js').ScheduleResult}
 */
export function run(processes, options = {}) {
  const quantum = options.quantum || 2;

  const result = simulate(processes, (ready, ctx) => {
    let best = null;
    let bestServed = Infinity;
    for (const p of ready) {
      const served = p.burstTime - ctx.remaining.get(p.id);
      if (served < bestServed) { bestServed = served; best = p; }
    }
    return best;
  }, { preemptive: true, quantum });

  return makeResult(result, 'Idle Balancing (LB)');
}
