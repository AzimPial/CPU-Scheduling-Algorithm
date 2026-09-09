/**
 * @fileoverview SchedViz — Fixed Priority, non-preemptive periodic scheduling.
 * @module algorithms/fixedPriorityNP
 */

import { simulateRt, tasksFromProcesses, makeRtResult } from '../core/rtEngine.js';

/**
 * Fixed Priority, non-preemptive. Each task carries an explicit `priority`
 * (lower value = higher priority). Once a job starts it runs to completion.
 * Educational deterministic simulation over the hyperperiod.
 * @param {import('../core/types.js').Process[]} processes
 * @returns {import('../core/types.js').ScheduleResult}
 */
export function run(processes) {
  const tasks = tasksFromProcesses(processes);
  const byPri = new Map(tasks.map(t => [t.id, t.priority ?? 99]));

  const rt = simulateRt(tasks, {
    preemptive: false,
    pickJob: (jobs) => {
      let best = null;
      let bestPri = Infinity;
      for (const j of jobs) {
        const pri = byPri.get(j.taskId);
        if (pri < bestPri) { bestPri = pri; best = j; }
      }
      return best;
    }
  });

  return makeRtResult(rt, 'Fixed Priority (NP)', processes);
}
