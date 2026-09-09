/**
 * @fileoverview SchedViz — Weighted Fair Share (dynamic), combining weight + nice.
 * @module algorithms/weightedFairShareDynamic
 */

import { computeProcessResults, computeAggregateMetrics } from '../core/metrics.js';
import { simulate } from '../core/engine.js';

/**
 * Dynamic Weighted Fair Share: effective weight = weight * (20 - nice), combining
 * an explicit weight with a nice-based factor. Scheduling by virtual finish
 * (WFQ/GPS) with a dynamic priority that also rewards waiting (aging). Preemptive.
 * Simplified educational model.
 * @param {import('../core/types.js').Process[]} processes
 * @returns {import('../core/types.js').ScheduleResult}
 */
export function run(processes) {
  const agingInterval = 5;
  const result = simulate(processes, (ready, ctx) => {
    let best = null;
    let bestFinish = Infinity;
    for (const p of ready) {
      const weight = (p.weight || 1) * Math.max(1, 20 - (p.nice ?? 0));
      const waited = ctx.currentTime - p.arrivalTime;
      const aging = Math.floor(waited / agingInterval) * 0.5;
      const finish = ctx.currentTime + ctx.remaining.get(p.id) / weight - aging;
      const key = finish * 1e6 - p.arrivalTime;
      if (key < bestFinish) { bestFinish = key; best = p; }
    }
    return best;
  }, { preemptive: true });

  const processResults = result.processResults.map(pr => {
    const p = processes.find(x => x.id === pr.id);
    return { ...pr, weight: (p?.weight || 1) * Math.max(1, 20 - (p?.nice ?? 0)), nice: p?.nice };
  });
  const metrics = computeAggregateMetrics(processResults, result.gantt, result.totalTime);
  return { algorithm: 'Weighted Fair Share (Dynamic)', gantt: result.gantt, processResults, ...metrics, totalTime: result.totalTime };
}
