/**
 * @fileoverview SchedViz — Highest Response Ratio Next (HRRN) — non-preemptive.
 * @module algorithms/hrrn
 */

import { simulate, makeResult } from '../core/engine.js';

/**
 * HRRN: at each scheduling point choose the ready process with the greatest
 * response ratio = (waitingTime + burstTime) / burstTime. Non-preemptive.
 * @param {import('../core/types.js').Process[]} processes
 * @returns {import('../core/types.js').ScheduleResult}
 */
export function run(processes) {
  const result = simulate(processes, (ready, ctx) => {
    let best = null;
    let bestRatio = -1;
    for (const p of ready) {
      const waiting = ctx.currentTime - p.arrivalTime;
      const ratio = (waiting + p.burstTime) / p.burstTime;
      if (ratio > bestRatio) {
        bestRatio = ratio;
        best = p;
      }
    }
    return best;
  }, { preemptive: false });

  return makeResult(result, 'HRRN');
}
