/**
 * @fileoverview SchedViz — Polling Server for aperiodic tasks (simplified educational).
 * @module algorithms/pollingServer
 */

import { simulateRt, tasksFromProcesses, makeRtResult } from '../core/rtEngine.js';

/**
 * Polling Server — simplified educational simulation.
 *
 * A periodic "server" is created with a fixed capacity (`capacity` = small fixed
 * budget, default 2) and it becomes available at the start of each server period.
 * Aperiodic jobs that have arrived are served first during the server window;
 * when the server has no backlog it idles and the remaining time is used by
 * periodic background tasks (scheduled by rate-monotonic priority).
 *
 * Model: the task whose period is chosen as the server period provides the polling
 * window; all tasks are treated as periodic with RM priorities, and the server's
 * budget is reserved at the top of each window. This is a deterministic teaching
 * approximation of the classical polling server.
 * @param {import('../core/types.js').Process[]} processes
 * @returns {import('../core/types.js').ScheduleResult}
 */
export function run(processes, options = {}) {
  const tasks = tasksFromProcesses(processes);
  const capacity = options.capacity || 2;
  // Designate the task with the shortest period as the server driver.
  const serverPeriod = Math.min(...tasks.map(t => t.period));
  const byPeriod = new Map(tasks.map(t => [t.id, t.period]));
  const isServer = new Set(tasks.filter(t => t.period === serverPeriod).map(t => t.id));

  const rt = simulateRt(tasks, {
    pickJob: (jobs, ctx) => {
      // A server-backed job for the designated task consumes capacity first.
      let serverJob = null;
      let bestDl = Infinity;
      let bgBest = null;
      for (const j of jobs) {
        if (isServer.has(j.taskId) && j.remaining <= capacity) {
          if (!serverJob) serverJob = j;
        } else {
          // Background: rate-monotonic priority.
          const per = byPeriod.get(j.taskId);
          if (per < bestDl) { bestDl = per; bgBest = j; }
        }
      }
      return serverJob || bgBest;
    }
  });

  return makeRtResult(rt, `Polling Server (c=${capacity})`, processes);
}
