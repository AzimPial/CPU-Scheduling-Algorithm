/**
 * @fileoverview SchedViz — Deadline Monotonic Scheduling (fixed priority).
 * @module algorithms/deadlineMonotonic
 */

import { simulateRt, tasksFromProcesses, makeRtResult } from '../core/rtEngine.js';

/**
 * Deadline Monotonic: fixed priority by relative deadline — shorter relative
 * deadline => higher priority. Generalizes RM when deadlines differ from periods.
 * Preemptive. Educational deterministic simulation over the hyperperiod.
 * @param {import('../core/types.js').Process[]} processes
 * @returns {import('../core/types.js').ScheduleResult}
 */
export function run(processes) {
  const tasks = tasksFromProcesses(processes);
  const byDl = new Map(tasks.map(t => [t.id, t.deadline]));

  const rt = simulateRt(tasks, {
    pickJob: (jobs) => {
      let best = null;
      let bestDl = Infinity;
      for (const j of jobs) {
        const dl = byDl.get(j.taskId);
        if (dl < bestDl) { bestDl = dl; best = j; }
      }
      return best;
    }
  });

  return makeRtResult(rt, 'Deadline Monotonic', processes);
}
