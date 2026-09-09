/**
 * @fileoverview SchedViz — Weighted Fair Queuing (WFQ) — simplified educational.
 * @module algorithms/weightedFairQueueing
 */

import { simulate, makeResult } from '../core/engine.js';

/**
 * WFQ (Generalized Processor Sharing approximation): at each scheduling decision
 * the ready job whose finish time is smallest runs. virtualFinish = now + remaining/weight.
 * A higher-weight job therefore finishes earlier and gets a larger fraction of the
 * CPU. Preemptive. Simplified educational model — no packetization, weights sum
 * need not be 1, and fair queuing is approximated in virtual (work-conserving) time.
 * @param {import('../core/types.js').Process[]} processes
 * @returns {import('../core/types.js').ScheduleResult}
 */
export function run(processes) {
  const result = simulate(processes, (ready, ctx) => {
    let best = null;
    let bestFinish = Infinity;
    for (const p of ready) {
      const weight = p.weight || 1;
      const finish = ctx.currentTime + ctx.remaining.get(p.id) / weight;
      const key = finish * 1e6 - p.arrivalTime;
      if (key < bestFinish) { bestFinish = key; best = p; }
    }
    return best;
  }, { preemptive: true });

  return makeResult(result, 'Weighted Fair Queuing');
}
