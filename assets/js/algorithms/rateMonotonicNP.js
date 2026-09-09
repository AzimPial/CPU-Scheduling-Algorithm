/**
 * @fileoverview SchedViz — Rate Monotonic, non-preemptive.
 * @module algorithms/rateMonotonicNP
 */

import { simulateRt, tasksFromProcesses, makeRtResult } from '../core/rtEngine.js';

/**
 * Rate Monotonic, non-preemptive. Priority by period (shorter = higher).
 * Once a job starts it runs to completion (may cause deadline misses for
 * higher-priority jobs that arrive mid-execution). Educational simulation.
 * @param {import('../core/types.js').Process[]} processes
 * @returns {import('../core/types.js').ScheduleResult}
 */
export function run(processes) {
  const tasks = tasksFromProcesses(processes);
  const byPeriod = new Map(tasks.map(t => [t.id, t.period]));

  const rt = simulateRt(tasks, {
    preemptive: false,
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

  return makeRtResult(rt, 'Rate Monotonic (NP)', processes);
}
