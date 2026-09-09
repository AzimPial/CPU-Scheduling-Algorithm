/**
 * @fileoverview SchedViz — Metrics calculators shared by all algorithms.
 * @module core/metrics
 */

/**
 * Compute per-process results from completion times.
 * @param {Map<string, {completionTime: number, arrivalTime: number, burstTime: number}>} completionMap
 * @returns {import('./types.js').ProcessResult[]}
 */
export function computeProcessResults(completionMap) {
  const results = [];
  for (const [id, data] of completionMap) {
    const turnaroundTime = data.completionTime - data.arrivalTime;
    const waitingTime = turnaroundTime - data.burstTime;
    results.push({
      id,
      arrivalTime: data.arrivalTime,
      burstTime: data.burstTime,
      completionTime: data.completionTime,
      turnaroundTime,
      waitingTime,
      responseTime: data.responseTime ?? data.startTime ?? 0
    });
  }
  return results;
}

/**
 * Compute per-process response times (first CPU allocation minus arrival) from a Gantt.
 * Returns a Map id -> firstCpuStartTime (before subtracting arrival).
 * @param {import('./types.js').GanttBlock[]} gantt
 * @returns {Map<string, number>}
 */
export function computeResponseTimes(gantt) {
  const firstStart = new Map();
  for (const block of gantt) {
    if (block.processId === 'IDLE') continue;
    if (!firstStart.has(block.processId)) {
      firstStart.set(block.processId, block.start);
    }
  }
  return firstStart;
}

/**
 * Compute aggregate metrics from process results and gantt.
 * Also stamps responseTime onto each process result (first CPU allocation minus arrival).
 * @param {import('./types.js').ProcessResult[]} processResults
 * @param {import('./types.js').GanttBlock[]} gantt
 * @param {number} totalTime - makespan
 * @returns {{avgWaitingTime: number, avgTurnaroundTime: number, avgResponseTime: number, throughput: number, totalIdleTime: number, cpuUtilization: number, contextSwitches: number}}
 */
export function computeAggregateMetrics(processResults, gantt, totalTime) {
  const n = processResults.length;
  if (n === 0) {
    return { avgWaitingTime: 0, avgTurnaroundTime: 0, avgResponseTime: 0, throughput: 0, totalIdleTime: 0, cpuUtilization: 0, contextSwitches: 0 };
  }

  const firstStart = computeResponseTimes(gantt);
  for (const pr of processResults) {
    const start = firstStart.get(pr.id);
    pr.responseTime = start !== undefined ? Math.max(0, start - pr.arrivalTime) : 0;
  }

  let totalWaiting = 0;
  let totalTurnaround = 0;
  let totalResponse = 0;
  for (const pr of processResults) {
    totalWaiting += pr.waitingTime;
    totalTurnaround += pr.turnaroundTime;
    totalResponse += pr.responseTime;
  }

  let totalIdleTime = 0;
  for (const block of gantt) {
    if (block.processId === 'IDLE') {
      totalIdleTime += block.end - block.start;
    }
  }

  const busyTime = totalTime - totalIdleTime;
  const cpuUtilization = totalTime > 0 ? (busyTime / totalTime) * 100 : 0;

  let contextSwitches = 0;
  for (let i = 1; i < gantt.length; i++) {
    if (gantt[i].processId !== gantt[i - 1].processId) {
      contextSwitches++;
    }
  }

  return {
    avgWaitingTime: totalWaiting / n,
    avgTurnaroundTime: totalTurnaround / n,
    avgResponseTime: totalResponse / n,
    throughput: totalTime > 0 ? Math.round((n / totalTime) * 10000) / 10000 : 0,
    totalIdleTime,
    cpuUtilization: Math.round(cpuUtilization * 100) / 100,
    contextSwitches
  };
}
