/**
 * @fileoverview SchedViz — SCHED_DEADLINE (Linux EDF-based real-time scheduler).
 * @module algorithms/schedDeadline
 */

import { simulateRt, tasksFromProcesses, makeRtResult } from '../core/rtEngine.js';

/**
 * SCHED_DEADLINE — Linux's EDF-based real-time scheduling class. Each task carries
 * a runtime (wcet), deadline and period; jobs are scheduled by earliest absolute
 * deadline, which matches EDF optimality on a preemptive uniprocessor. Educational
 * simulation: it models the EDF core and ignores the admission-control
 * (bandwidth) algorithm and dl_timer granularity.
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

  return makeRtResult(rt, 'SCHED_DEADLINE (EDF)', processes);
}
