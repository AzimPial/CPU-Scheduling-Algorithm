/**
 * @fileoverview SchedViz — OmniVR Task Scheduler (educational simulation).
 * @module algorithms/omniVR
 */

import { simulate, makeResult } from '../core/engine.js';

/**
 * OmniVR — educational simulation of a modern hierarchical/virtual-runtime task
 * scheduler. Each task carries a relative `deadline` and a `priority` (lower =
 * higher priority). Selection ranks first by priority, then by scheduling urgency
 * (remaining time relative to deadline) so that urgent work is favoured within the
 * same priority band. Preemptive. This is a conceptual approximation, not the
 * proprietary OmniVR implementation.
 * @param {import('../core/types.js').Process[]} processes
 * @returns {import('../core/types.js').ScheduleResult}
 */
export function run(processes) {
  const result = simulate(processes, (ready, ctx) => {
    let best = null;
    let bestKey = Infinity;
    for (const p of ready) {
      const pri = p.priority ?? 1;
      const deadline = p.deadline ?? p.burstTime;
      const urgency = ctx.remaining.get(p.id) / Math.max(1, deadline - p.arrivalTime);
      // Primary: priority; secondary: urgency; then arrival order.
      const key = pri * 1e9 + urgency * 1e6 - p.arrivalTime;
      if (key < bestKey) { bestKey = key; best = p; }
    }
    return best;
  }, { preemptive: true });

  return makeResult(result, 'OmniVR (Educational)');
}
