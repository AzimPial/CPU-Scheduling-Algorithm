/**
 * @fileoverview SchedViz — Least Laxity First (preemptive, dynamic priority).
 * @module algorithms/leastLaxityFirst
 */

import { simulateRt, tasksFromProcesses, makeRtResult } from '../core/rtEngine.js';

/**
 * LLF: the released job with the smallest laxity (deadline - now - remaining time)
 * is scheduled. Laxity reflects scheduling urgency. Preemptive.
 * Educational deterministic simulation over the hyperperiod.
 * @param {import('../core/types.js').Process[]} processes
 * @returns {import('../core/types.js').ScheduleResult}
 */
export function run(processes) {
  const tasks = tasksFromProcesses(processes);

  const rt = simulateRt(tasks, {
    pickJob: (jobs, ctx) => {
      let best = null;
      let bestLax = Infinity;
      for (const j of jobs) {
        const lax = (j.deadline - ctx.currentTime) - j.remaining;
        if (lax < bestLax) { bestLax = lax; best = j; }
      }
      return best;
    }
  });

  return makeRtResult(rt, 'Least Laxity First', processes);
}
