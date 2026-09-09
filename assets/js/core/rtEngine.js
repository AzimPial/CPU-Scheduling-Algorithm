/**
 * @fileoverview SchedViz — Periodic real-time scheduling engine.
 * Generates repeating jobs for each task over a time horizon (default: the
 * hyperperiod, capped), schedules them with a user-supplied job-selection policy,
 * and reports per-task deadline behaviour. This is an educational deterministic
 * simulation — it assumes implicit periodic releases with fixed WCET and no
 * release jitter.
 * @module core/rtEngine
 */

import { computeAggregateMetrics } from './metrics.js';

/**
 * Greatest common divisor.
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { const t = b; b = a % b; a = t; }
  return a;
}

/**
 * Least common multiple of a set of numbers.
 * @param {number[]} nums
 * @returns {number}
 */
export function lcm(nums) {
  if (!nums.length) return 0;
  let r = nums[0];
  for (let i = 1; i < nums.length; i++) {
    r = (r / gcd(r, nums[i])) * nums[i];
  }
  return r;
}

/**
 * Run a periodic real-time simulation.
 * @param {Array<{id: string, period: number, deadline?: number, wcet: number}>} tasks
 * @param {Object} [options]
 * @param {Function} [options.pickJob] - (jobs: Array<Object>, ctx: Object) => job|null
 *   jobs are released-not-done jobs with {id, taskId, jobIndex, release, deadline, remaining}.
 * @param {number} [options.horizon] - Sim time units (default: hyperperiod of periods).
 * @param {boolean} [options.preemptive=true]
 * @returns {Object} { gantt, tasks: Array<{id, period, deadline, wcet, jobs, misses, totalExec}>,
 *   allDeadlinesMet, deadlineMissedAt, totalTime, utilization }
 */
export function simulateRt(tasks, options = {}) {
  const { pickJob, preemptive = true } = options;
  const MAX_HORIZON = 5000;
  let horizon = options.horizon || lcm(tasks.map(t => t.period));
  if (horizon > MAX_HORIZON) horizon = MAX_HORIZON;
  const gantt = [];
  const taskStats = new Map();
  const doneJobs = new Map(); // job key -> {taskId, jobIndex, release, deadline, completion}
  const missedAt = [];

  for (const t of tasks) {
    taskStats.set(t.id, { id: t.id, period: t.period, deadline: t.deadline || t.period, wcet: t.wcet, jobs: 0, misses: 0, totalExec: 0 });
  }

  // Track released jobs that still have remaining work.
  const activeJobs = []; // {id(taskId_jobIndex), taskId, jobIndex, release, deadline, remaining}
  const pendingRelease = new Map(); // taskId -> next release time

  for (const t of tasks) {
    pendingRelease.set(t.id, t.offset || 0);
  }

  let currentTime = 0;

  function pushBlock(pid, start, end) {
    if (end <= start) return;
    const prev = gantt[gantt.length - 1];
    if (prev && prev.processId === pid && prev.end === start) {
      prev.end = end;
      return;
    }
    gantt.push({ processId: pid, start, end });
  }

  function releaseDue() {
    for (const t of tasks) {
      let rel = pendingRelease.get(t.id);
      while (rel <= currentTime) {
        const idx = taskStats.get(t.id).jobs;
        const job = {
          id: `${t.id}_j${idx}`,
          taskId: t.id,
          jobIndex: idx,
          release: rel,
          deadline: rel + (t.deadline || t.period),
          remaining: t.wcet
        };
        activeJobs.push(job);
        taskStats.get(t.id).jobs++;
        pendingRelease.set(t.id, rel + t.period);
        rel = rel + t.period;
      }
    }
  }

  while (currentTime < horizon) {
    releaseDue();

    if (activeJobs.length === 0) {
      // Idle until next release.
      let nextRel = horizon;
      for (const t of tasks) {
        const r = pendingRelease.get(t.id);
        if (r < nextRel) nextRel = r;
      }
      pushBlock('IDLE', currentTime, nextRel);
      currentTime = nextRel;
      releaseDue();
    }

    if (activeJobs.length === 0) continue;

    const selected = pickJob(activeJobs, { currentTime });
    if (!selected) {
      // No schedulable job right now — step to next event.
      const deadlines = activeJobs.map(j => j.deadline);
      const nextRel = [] ; for (const t of tasks) nextRel.push(pendingRelease.get(t.id));
      let nextEvent = Math.min(...deadlines, ...nextRel, horizon);
      if (nextEvent <= currentTime) nextEvent = currentTime + 1;
      pushBlock('IDLE', currentTime, nextEvent);
      // Flag missed deadlines for all jobs whose deadline passed during idle.
      for (const j of [...activeJobs]) {
        if (j.deadline < nextEvent) {
          missedAt.push(j.deadline);
          taskStats.get(j.taskId).misses++;
        }
      }
      currentTime = nextEvent;
      continue;
    }

    // Determine run until: next release, job completion, or optionally a preemption point.
    const releaseTimes = [];
    for (const t of tasks) releaseTimes.push(pendingRelease.get(t.id));
    const nextRelease = Math.min(...releaseTimes);
    const finishTime = currentTime + selected.remaining;
    let runUntil = preemptive ? Math.min(nextRelease, finishTime) : finishTime;
    runUntil = Math.min(runUntil, horizon);

    pushBlock(selected.taskId, currentTime, runUntil);
    const elapsed = runUntil - currentTime;
    selected.remaining -= elapsed;
    taskStats.get(selected.taskId).totalExec += elapsed;
    currentTime = runUntil;

    if (selected.remaining <= 0) {
      const idx = activeJobs.indexOf(selected);
      if (idx >= 0) activeJobs.splice(idx, 1);
      doneJobs.set(selected.id, { ...selected, completion: currentTime });
      const stat = taskStats.get(selected.taskId);
      stat.lastCompletion = currentTime;
      stat.lastTurnaround = currentTime - selected.release;
    }
  }

  // Any jobs still pending at horizon that missed deadlines.
  for (const j of activeJobs) {
    if (j.deadline <= horizon && !j.completed) {
      taskStats.get(j.taskId).misses++;
      missedAt.push(j.deadline);
      j.completed = true;
    }
  }

  const tasksOut = [...taskStats.values()];
  const allDeadlinesMet = missedAt.length === 0;
  const utilization = tasks.reduce((s, t) => s + t.wcet / t.period, 0);

  // Build a compatible processResults-like aggregate for metrics cards.
  const totalTime = horizon;

  // Fill any trailing idle gap so the Gantt spans the full horizon.
  if (gantt.length === 0 || gantt[gantt.length - 1].end < horizon) {
    pushBlock('IDLE', gantt.length ? gantt[gantt.length - 1].end : 0, horizon);
  }

  return {
    gantt,
    tasks: tasksOut,
    allDeadlinesMet,
    deadlineMissedAt: missedAt,
    totalTime: horizon,
    utilization
  };
}

/**
 * Convert form processes (arrivalTime=offset, burstTime=wcet, period, deadline?)
 * into the task model consumed by simulateRt.
 * @param {Array<{id, burstTime, period, deadline?, priority?, arrivalTime?}>} processes
 * @returns {Array<{id, period, deadline, wcet, offset?, priority?}>}
 */
export function tasksFromProcesses(processes) {
  return processes.map(p => ({
    id: p.id,
    period: p.period,
    deadline: p.deadline || p.period,
    wcet: p.burstTime,
    offset: p.arrivalTime || 0,
    ...(p.priority !== undefined ? { priority: p.priority } : {})
  }));
}

/**
 * Build a ScheduleResult-compatible object from a periodic RT simulation,
 * adding per-task processResults and aggregate metrics over the produced Gantt.
 * @param {Object} rtOut - output of simulateRt (plus tasks array)
 * @param {string} algorithmName
 * @param {Array} sourceProcesses - original processes (for palette ordering / extra fields)
 * @returns {import('./types.js').ScheduleResult}
 */
export function makeRtResult(rtOut, algorithmName, sourceProcesses) {
  const { gantt, tasks, allDeadlinesMet, deadlineMissedAt, totalTime, utilization } = rtOut;

  const processResults = tasks.map(t => ({
    id: t.id,
    arrivalTime: sourceProcesses.find(p => p.id === t.id)?.arrivalTime ?? 0,
    burstTime: t.wcet,
    period: t.period,
    deadline: t.deadline,
    wcet: t.wcet,
    jobs: t.jobs,
    misses: t.misses,
    deadlineMissed: t.misses > 0,
    completionTime: t.lastCompletion ?? totalTime,
    turnaroundTime: t.lastTurnaround ?? 0,
    waitingTime: t.lastTurnaround !== undefined ? (t.lastTurnaround - t.wcet) : 0
  }));

  const { avgWaitingTime, avgTurnaroundTime, totalIdleTime, cpuUtilization, contextSwitches, avgResponseTime, throughput } =
    computeAggregateMetrics(processResults, gantt, totalTime);

  return {
    algorithm: algorithmName,
    gantt,
    processResults,
    totalTime,
    avgWaitingTime,
    avgTurnaroundTime,
    avgResponseTime,
    throughput,
    totalIdleTime,
    cpuUtilization,
    contextSwitches,
    allDeadlinesMet,
    deadlineMissedAt,
    utilization,
    realTime: true
  };
}
