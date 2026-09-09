/**
 * @fileoverview SchedViz — Earliest Deadline First (preemptive, dynamic priority).
 * @module algorithms/earliestDeadlineFirst
 */

import { simulateRt, tasksFromProcesses, makeRtResult } from '../core/rtEngine.js';

/**
 * EDF: at any instant the released job with the earliest absolute deadline wins.
 * Preemptive and optimal for feasibility among preemptive uniprocessor policies.
 * Educational deterministic simulation over the hyperperiod.
 * @param {import('../core/types.js').Process[]} processes
 * @returns {import('../core/types.js').ScheduleResult}
 */
export function run(processes) {
  const tasks = tasksFromProcesses(processes);

  const rt = simulateRt(tasks, {
    pickJob: (jobs) => {
      let best = null;
      let bestDl = Infinity;
      for (const j of jobs) {
        if (j.deadline < bestDl) { bestDl = j.deadline; best = j; }
      }
      return best;
    }
  });

  return makeRtResult(rt, 'Earliest Deadline First', processes);
}
