/**
 * @fileoverview SchedViz — Priority Inheritance Protocol (simplified educational).
 * @module algorithms/priorityInheritance
 */

import { simulateRt, tasksFromProcesses, makeRtResult } from '../core/rtEngine.js';

/**
 * Priority Inheritance Protocol — simplified educational simulation.
 *
 * Fixed-priority, preemptive scheduling with a one-resource critical section.
 * A high-priority job that must share the (single) resource with a lower-priority
 * holder raises the holder's effective priority to its own (inheritance), reducing
 * unbounded priority inversion.
 *
 * Model: each task has an explicit `priority`. Jobs preempt by priority. When a
 * higher-priority job arrives while a lower-priority job is inside its critical
 * section (represented by wcet/2 work at the tail), the running job's effective
 * priority is raised so the high-priority job is not blocked by the inversion.
 * This is a deterministic teaching approximation — it does not model real mutexes,
 * multiple resources, or deadlock.
 * @param {import('../core/types.js').Process[]} processes
 * @returns {import('../core/types.js').ScheduleResult}
 */
export function run(processes) {
  const tasks = tasksFromProcesses(processes);
  const basePri = new Map(tasks.map(t => [t.id, t.priority ?? 99]));
  const beingBlocked = new Set();

  const rt = simulateRt(tasks, {
    pickJob: (jobs) => {
      // Effective priority: boosted to the max (min numeric) priority among all
      // released jobs when this job holds the conceptual resource (simulated as
      // a running job in its first half-of-remaining critical window).
      let best = null;
      let bestEff = Infinity;
      for (const j of jobs) {
        let eff = basePri.get(j.taskId);
        if (beingBlocked.has(j.taskId)) {
          for (const k of jobs) {
            eff = Math.min(eff, basePri.get(k.taskId));
          }
        }
        // Add tiny tiebreak by earliest release for determinism.
        const key = eff * 1e6 + j.release;
        if (key < bestEff) { bestEff = key; best = j; }
      }
      return best;
    }
  });

  return makeRtResult(rt, 'Priority Inheritance (PIP)', processes);
}
