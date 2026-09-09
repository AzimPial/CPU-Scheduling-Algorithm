/**
 * @fileoverview SchedViz — SRTF with Aging (prevents starvation).
 * @module algorithms/aging
 */

import { simulate, makeResult } from '../core/engine.js';

/**
 * Preemptive SRTF extended with aging: a process's effective remaining time is
 * reduced as it waits (by agingInterval, its remaining-time estimate shrinks by 1
 * for each full aging interval spent waiting). This prevents starvation of long jobs.
 * @param {import('../core/types.js').Process[]} processes
 * @param {{aging?: number}} [options]
 * @returns {import('../core/types.js').ScheduleResult}
 */
export function run(processes, options = {}) {
  const agingInterval = options.aging || 5;

  const result = simulate(processes, (ready, ctx) => {
    let best = null;
    let bestKey = Infinity;
    for (const p of ready) {
      const remaining = ctx.remaining.get(p.id);
      const waited = ctx.currentTime - p.arrivalTime;
      const agingBonus = Math.floor(waited / agingInterval);
      const effective = remaining - agingBonus;
      const key = effective * 1000000 - p.arrivalTime;
      if (key < bestKey) {
        bestKey = key;
        best = p;
      }
    }
    return best;
  }, { preemptive: true });

  return makeResult(result, `Aging SRTF (i=${agingInterval})`);
}
