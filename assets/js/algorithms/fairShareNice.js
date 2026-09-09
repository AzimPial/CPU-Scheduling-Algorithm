/**
 * @fileoverview SchedViz — Fair Share scheduling by nice value.
 * @module algorithms/fairShareNice
 */

import { computeProcessResults, computeAggregateMetrics } from '../core/metrics.js';
import { simulate } from '../core/engine.js';

/**
 * Fair Share by nice value. Nice ranges -20..19; a lower nice value maps to a
 * higher CPU weight via weight = 20 - nice, so a nicer (lower-nice) task receives
 * a larger share. Scheduling by virtual finish (WFQ/GPS), preemptive.
 * Simplified educational model.
 * @param {import('../core/types.js').Process[]} processes
 * @returns {import('../core/types.js').ScheduleResult}
 */
export function run(processes) {
  const result = simulate(processes, (ready, ctx) => {
    let best = null;
    let bestFinish = Infinity;
    for (const p of ready) {
      const nice = p.nice ?? 0;
      const weight = Math.max(1, 20 - nice);
      const finish = ctx.currentTime + ctx.remaining.get(p.id) / weight;
      const key = finish * 1e6 - p.arrivalTime;
      if (key < bestFinish) { bestFinish = key; best = p; }
    }
    return best;
  }, { preemptive: true });

  const name = 'Fair Share (nice)';
  const processResults = result.processResults.map(pr => {
    const p = processes.find(x => x.id === pr.id);
    return { ...pr, nice: p?.nice, weight: Math.max(1, 20 - (p?.nice ?? 0)) };
  });
  const metrics = computeAggregateMetrics(processResults, result.gantt, result.totalTime);
  return { algorithm: name, gantt: result.gantt, processResults, ...metrics, totalTime: result.totalTime };
}
