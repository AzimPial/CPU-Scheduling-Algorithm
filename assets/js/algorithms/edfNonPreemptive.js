/**
 * @fileoverview SchedViz — EDF, non-preemptive.
 * @module algorithms/edfNonPreemptive
 */

import { simulateRt, tasksFromProcesses, makeRtResult } from '../core/rtEngine.js';

/**
 * EDF, non-preemptive. Jobs selected by earliest absolute deadline and run to
 * completion. Non-preemption can reduce schedulability vs. preemptive EDF.
 * Educational simulation over the hyperperiod.
 * @param {import('../core/types.js').Process[]} processes
 * @returns {import('../core/types.js').ScheduleResult}
 */
export function run(processes) {
  const tasks = tasksFromProcesses(processes);

  const rt = simulateRt(tasks, {
    preemptive: false,
    pickJob: (jobs) => {
      let best = null;
      let bestDl = Infinity;
      for (const j of jobs) {
        if (j.deadline < bestDl) { bestDl = j.deadline; best = j; }
      }
      return best;
    }
  });

  return makeRtResult(rt, 'EDF (NP)', processes);
}
