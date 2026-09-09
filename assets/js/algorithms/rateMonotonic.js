/**
 * @fileoverview SchedViz — Rate Monotonic Scheduling (preemptive, fixed priority).
 * @module algorithms/rateMonotonic
 */

import { simulateRt, tasksFromProcesses, makeRtResult } from '../core/rtEngine.js';

/**
 * Rate Monotonic: fixed priority assigned by rate — a task with a shorter period
 * is assigned a higher priority. Jobs are preempted by higher-priority releases.
 * Educational deterministic simulation over the hyperperiod.
 * @param {import('../core/types.js').Process[]} processes
 * @returns {import('../core/types.js').ScheduleResult}
 */
export function run(processes) {
  const tasks = tasksFromProcesses(processes);
  const byPeriod = new Map(tasks.map(t => [t.id, t.period]));

  const rt = simulateRt(tasks, {
    pickJob: (jobs) => {
      let best = null;
      let bestPeriod = Infinity;
      for (const j of jobs) {
        const per = byPeriod.get(j.taskId);
        if (per < bestPeriod) { bestPeriod = per; best = j; }
      }
      return best;
    }
  });

  return makeRtResult(rt, 'Rate Monotonic', processes);
}
