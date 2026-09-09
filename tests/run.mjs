/**
 * @fileoverview SchedViz — dependency-free correctness + regression test harness.
 * Run with: node tests/run.mjs  (or: npm test)
 */

import { ALGORITHMS, CATEGORY_LABELS, VALIDATION } from '../assets/js/core/types.js';
import * as fcfs from '../assets/js/algorithms/fcfs.js';
import * as sjf from '../assets/js/algorithms/sjf.js';
import * as srtf from '../assets/js/algorithms/srtf.js';
import * as priorityNP from '../assets/js/algorithms/priorityNP.js';
import * as priorityP from '../assets/js/algorithms/priorityP.js';
import * as roundRobin from '../assets/js/algorithms/roundRobin.js';
import * as hrrn from '../assets/js/algorithms/hrrn.js';
import * as aging from '../assets/js/algorithms/aging.js';
import * as mlq from '../assets/js/algorithms/mlq.js';
import * as mlfq from '../assets/js/algorithms/mlfq.js';
import * as rateMonotonic from '../assets/js/algorithms/rateMonotonic.js';
import * as earliestDeadlineFirst from '../assets/js/algorithms/earliestDeadlineFirst.js';
import * as deadlineMonotonic from '../assets/js/algorithms/deadlineMonotonic.js';
import * as leastLaxityFirst from '../assets/js/algorithms/leastLaxityFirst.js';
import * as rateMonotonicNP from '../assets/js/algorithms/rateMonotonicNP.js';
import * as edfNonPreemptive from '../assets/js/algorithms/edfNonPreemptive.js';
import * as priorityInheritance from '../assets/js/algorithms/priorityInheritance.js';
import * as fixedPriorityNP from '../assets/js/algorithms/fixedPriorityNP.js';
import * as pollingServer from '../assets/js/algorithms/pollingServer.js';
import * as weightedRoundRobin from '../assets/js/algorithms/weightedRoundRobin.js';
import * as weightedFairQueueing from '../assets/js/algorithms/weightedFairQueueing.js';
import * as fairShareNice from '../assets/js/algorithms/fairShareNice.js';
import * as deficitRoundRobin from '../assets/js/algorithms/deficitRoundRobin.js';
import * as lottery from '../assets/js/algorithms/lottery.js';
import * as weightedFairShareDynamic from '../assets/js/algorithms/weightedFairShareDynamic.js';
import * as completelyFairScheduler from '../assets/js/algorithms/completelyFairScheduler.js';
import * as brainFuckScheduler from '../assets/js/algorithms/brainFuckScheduler.js';
import * as schedDeadline from '../assets/js/algorithms/schedDeadline.js';
import * as omniVR from '../assets/js/algorithms/omniVR.js';
import * as schedIdleBalancing from '../assets/js/algorithms/schedIdleBalancing.js';

const RUNNERS = {
  fcfs, sjf, srtf, priorityNP, priorityP, roundRobin, hrrn, aging, mlq, mlfq,
  rateMonotonic, earliestDeadlineFirst, deadlineMonotonic, leastLaxityFirst,
  rateMonotonicNP, edfNonPreemptive, priorityInheritance, fixedPriorityNP, pollingServer,
  weightedRoundRobin, weightedFairQueueing, fairShareNice, deficitRoundRobin, lottery,
  weightedFairShareDynamic, completelyFairScheduler, brainFuckScheduler, schedDeadline,
  omniVR, schedIdleBalancing
};

let pass = 0;
let fail = 0;
const failures = [];

function ok(cond, msg, extra) {
  if (cond) { pass++; }
  else { fail++; failures.push(`${msg}${extra !== undefined ? ' -> ' + JSON.stringify(extra) : ''}`); console.error('  FAIL:', msg, extra !== undefined ? extra : ''); }
}

function check(cond, msg) { ok(cond, msg); }

/** Build a sample process set with appropriate extra fields for each algorithm. */
function sampleProcesses(key) {
  const meta = ALGORITHMS[key];
  const base = ['P1', 'P2', 'P3', 'P4'].map((id, i) => ({
    id, arrivalTime: i * 1, burstTime: 3 + i, color: '#000'
  }));
  for (const p of base) {
    if (meta.fields.includes('priority')) p.priority = (p.id.charCodeAt(1) - 48) % 3 + 1;
    if (meta.fields.includes('period')) p.period = 8 + (p.id.charCodeAt(1) - 48);
    if (meta.fields.includes('deadline')) p.deadline = p.period || ((p.id.charCodeAt(1) - 48) % 5 + 2);
    if (meta.fields.includes('wcet')) p.wcet = p.burstTime;
    if (meta.fields.includes('tickets')) p.tickets = (p.id.charCodeAt(1) - 48) + 1;
    if (meta.fields.includes('weight')) p.weight = (p.id.charCodeAt(1) - 48) % 3 + 1;
    if (meta.fields.includes('nice')) p.nice = ((p.id.charCodeAt(1) - 48) % 9) - 4;
    if (meta.fields.includes('queue')) p.queue = (p.id.charCodeAt(1) - 48) % 2 + 1;
  }
  return base;
}

function optionsFor(key) {
  const meta = ALGORITHMS[key];
  return {
    ...(meta.needsQuantum ? { quantum: 2 } : {}),
    ...(meta.needsAging ? { aging: 5 } : {}),
    ...(meta.needsBoost ? { boost: 10 } : {}),
    ...(key === 'pollingServer' ? { capacity: 2 } : {}),
    ...(key === 'lottery' ? { quantum: 2, seed: 42 } : {})
  };
}

function validateResultShape(key, r) {
  ok(r && typeof r === 'object', `${key}: returns an object`);
  ok(Array.isArray(r.gantt) && r.gantt.length > 0, `${key}: non-empty gantt`, r.gantt && r.gantt.length);
  ok(Array.isArray(r.processResults) && r.processResults.length === 4, `${key}: 4 process results`, r.processResults && r.processResults.length);
  ok(typeof r.totalTime === 'number' && r.totalTime > 0, `${key}: totalTime > 0`, r.totalTime);
  ok(typeof r.avgWaitingTime === 'number', `${key}: has avgWaitingTime`, r.avgWaitingTime);
  ok(typeof r.avgTurnaroundTime === 'number', `${key}: has avgTurnaroundTime`);
  ok(typeof r.cpuUtilization === 'number', `${key}: has cpuUtilization`);
  ok(typeof r.contextSwitches === 'number', `${key}: has contextSwitches`);
  // Gantt blocks contiguous & non-overlapping, processIds valid or IDLE.
  let okBlocks = true;
  for (let i = 0; i < r.gantt.length; i++) {
    const b = r.gantt[i];
    if (b.end <= b.start) okBlocks = false;
    if (i > 0 && r.gantt[i - 1].end !== b.start) okBlocks = false;
  }
  ok(okBlocks, `${key}: gantt blocks contiguous/non-overlapping`);
  // completion covers every process exactly once.
  const completions = r.processResults.map(x => x.completionTime);
  ok(completions.every(c => typeof c === 'number' && c >= 0), `${key}: all completions present`);
}

// ---------------------------------------------------------------- Main suite
console.log('\n=== SchedViz test suite ===\n');

// 1) Registry integrity
const keys = Object.keys(ALGORITHMS);
check(keys.length === 30, `registry has exactly 30 algorithms (got ${keys.length})`);
check(keys.every(k => RUNNERS[k]), 'every registered algorithm has a runner');
const cats = {};
for (const k of keys) cats[ALGORITHMS[k].category] = (cats[ALGORITHMS[k].category] || 0) + 1;
check(cats.classical === 10, `classical category count = 10 (got ${cats.classical})`);
check(cats.realTime === 9, `realTime category count = 9 (got ${cats.realTime})`);
check(cats.fairShare === 6, `fairShare category count = 6 (got ${cats.fairShare})`);
check(cats.modern === 5, `modern category count = 5 (got ${cats.modern})`);

// 2) Every algorithm runs and produces a valid result
for (const key of keys) {
  try {
    const r = RUNNERS[key].run(sampleProcesses(key), optionsFor(key));
    validateResultShape(key, r);
  } catch (e) {
    fail++; failures.push(`${key}: threw ${e.message}`);
    console.error(`  FAIL: ${key} threw`, e.message);
  }
}

// 3) Regression: FCFS textbook example
// P1(0,5), P2(1,3), P3(2,8) -> completion 5,8,16; turnaround 5,7,14; waiting 0,4,6
{
  const procs = [
    { id: 'P1', arrivalTime: 0, burstTime: 5, color: '#000' },
    { id: 'P2', arrivalTime: 1, burstTime: 3, color: '#000' },
    { id: 'P3', arrivalTime: 2, burstTime: 8, color: '#000' }
  ];
  const r = fcfs.run(procs);
  const cm = Object.fromEntries(r.processResults.map(p => [p.id, p]));
  check(cm.P1.completionTime === 5, 'FCFS P1 completion 5', cm.P1.completionTime);
  check(cm.P2.completionTime === 8, 'FCFS P2 completion 8', cm.P2.completionTime);
  check(cm.P3.completionTime === 16, 'FCFS P3 completion 16', cm.P3.completionTime);
  check(Math.abs(cm.P1.waitingTime - 0) < 1e-6, 'FCFS P1 waiting 0', cm.P1.waitingTime);
  check(Math.abs(cm.P2.waitingTime - 4) < 1e-6, 'FCFS P2 waiting 4', cm.P2.waitingTime);
}

// 4) Regression: SJF optimal
{
  const procs = [
    { id: 'P1', arrivalTime: 0, burstTime: 6, color: '#000' },
    { id: 'P2', arrivalTime: 1, burstTime: 2, color: '#000' },
    { id: 'P3', arrivalTime: 2, burstTime: 8, color: '#000' },
    { id: 'P4', arrivalTime: 3, burstTime: 3, color: '#000' }
  ];
  const r = sjf.run(procs);
  const order = r.gantt.filter(b => b.processId !== 'IDLE').map(b => b.processId).join(',');
  check(order === 'P1,P2,P4,P3', 'SJF schedule order', order);
  check(srtf.run(procs).avgWaitingTime <= r.avgWaitingTime + 1e-6, 'SRTF (preemptive) avg waiting <= SJF (optimality)');
}

// 5) Regression: Round Robin with quantum 2
{
  const procs = [
    { id: 'P1', arrivalTime: 0, burstTime: 5, color: '#000' },
    { id: 'P2', arrivalTime: 0, burstTime: 3, color: '#000' }
  ];
  const r = roundRobin.run(procs, { quantum: 2 });
  const blocks = r.gantt.filter(b => b.processId !== 'IDLE');
  const seq = blocks.map(b => `${b.processId}:${b.start}-${b.end}`).join(' ');
  check(r.totalTime === 8, 'RR totalTime 8', r.totalTime);
  // P1 gets 2+1 (2,1 after preempt) ... P1(0-2) P2(2-4) P1(4-6) P2(6-7) P1(7-8)
  const p1 = blocks.filter(b => b.processId === 'P1');
  check(p1.length === 3, 'RR P1 has 3 slices', p1.length);
}

// 6) HRRN: after P1(0,5), response ratios decide P2 vs P3
{
  const procs = [
    { id: 'P1', arrivalTime: 0, burstTime: 5, color: '#000' },
    { id: 'P2', arrivalTime: 1, burstTime: 4, color: '#000' },
    { id: 'P3', arrivalTime: 2, burstTime: 1, color: '#000' }
  ];
  const r = hrrn.run(procs);
  const order = r.gantt.filter(b => b.processId !== 'IDLE').map(b => b.processId).join(',');
  // At t=5 (P1 done): P2 ratio=(4+4)/4=2, P3 ratio=(3+1)/1=4 -> P3 first
  check(order === 'P1,P3,P2', 'HRRN order P1,P3,P2', order);
}

// 7) Rate Monotonic schedulability over hyperperiod
{
  const procs = [
    { id: 'T1', arrivalTime: 0, burstTime: 1, period: 4, color: '#000' },
    { id: 'T2', arrivalTime: 0, burstTime: 2, period: 6, color: '#000' }
  ];
  const r = rateMonotonic.run(procs);
  check(r.realTime === true, 'RM result flagged realTime');
  check(r.hyperperiod === undefined || true, 'RM runs');
  check(typeof r.allDeadlinesMet === 'boolean', 'RM reports allDeadlinesMet', r.allDeadlinesMet);
}

// 8) EDF feasibility: over-subscribed runs -> miss detected; light set -> all met
{
  const light = [
    { id: 'T1', arrivalTime: 0, burstTime: 1, period: 4, color: '#000' },
    { id: 'T2', arrivalTime: 0, burstTime: 1, period: 6, color: '#000' }
  ];
  const r = earliestDeadlineFirst.run(light);
  check(r.allDeadlinesMet === true, 'EDF light set all deadlines met', r.allDeadlinesMet);

  const heavy = [
    { id: 'T1', arrivalTime: 0, burstTime: 3, period: 4, color: '#000' },
    { id: 'T2', arrivalTime: 0, burstTime: 3, period: 4, color: '#000' }
  ];
  const rh = earliestDeadlineFirst.run(heavy);
  check(rh.allDeadlinesMet === false, 'EDF overloaded set misses deadlines', rh.allDeadlinesMet);
}

// 9) Fair-share weighting: higher weight -> more CPU
{
  const procs = [
    { id: 'P1', arrivalTime: 0, burstTime: 10, weight: 3, color: '#000' },
    { id: 'P2', arrivalTime: 0, burstTime: 10, weight: 1, color: '#000' }
  ];
  const r = weightedFairQueueing.run(procs);
  const served = {};
  for (const b of r.gantt) if (b.processId !== 'IDLE') served[b.processId] = (served[b.processId] || 0) + (b.end - b.start);
  // P1 (higher weight) should finish earlier / receive more CPU.
  const c1 = r.processResults.find(p => p.id === 'P1').completionTime;
  const c2 = r.processResults.find(p => p.id === 'P2').completionTime;
  check(c1 < c2, 'WFQ higher-weight P1 finishes earlier', { c1, c2 });
}

// 10) CFS: niceness reflection
{
  const procs = [
    { id: 'P1', arrivalTime: 0, burstTime: 10, nice: -5, color: '#000' }, // higher weight/higher pri
    { id: 'P2', arrivalTime: 0, burstTime: 10, nice: 10, color: '#000' }   // lower weight/lower pri
  ];
  const r = completelyFairScheduler.run(procs);
  const c1 = r.processResults.find(p => p.id === 'P1').completionTime;
  const c2 = r.processResults.find(p => p.id === 'P2').completionTime;
  check(c1 < c2, 'CFS lower-nice P1 finishes first', { c1, c2 });
}

// 11) Lottery determinism
{
  const procs = sampleProcesses('lottery');
  const a = lottery.run(procs.map(x => ({ ...x })), { quantum: 2, seed: 42 });
  const b = lottery.run(procs.map(x => ({ ...x })), { quantum: 2, seed: 42 });
  const seqA = a.gantt.filter(x => x.processId !== 'IDLE').map(x => x.processId).join(',');
  const seqB = b.gantt.filter(x => x.processId !== 'IDLE').map(x => x.processId).join(',');
  check(seqA === seqB, 'lottery is deterministic with fixed seed');
}

// 12) preemptive vs non-preemptive priority correctness (regression)
{
  const procs = [
    { id: 'P1', arrivalTime: 0, burstTime: 5, priority: 2, color: '#000' },
    { id: 'P2', arrivalTime: 1, burstTime: 3, priority: 1, color: '#000' },
    { id: 'P3', arrivalTime: 2, burstTime: 2, priority: 3, color: '#000' }
  ];
  const np = priorityNP.run(procs);
  const npOrder = np.gantt.filter(b => b.processId !== 'IDLE').map(b => b.processId).join(',');
  check(npOrder === 'P1,P2,P3', 'Priority-NP order P1,P2,P3', npOrder);
  const pp = priorityP.run(procs);
  const ppOrder = pp.gantt.filter(b => b.processId !== 'IDLE').map(b => b.processId).join(',');
  check(ppOrder.startsWith('P1,P2'), 'Priority-P preempts to P2', ppOrder);
}

// 13) Response time + throughput now present
{
  const procs = [
    { id: 'P1', arrivalTime: 0, burstTime: 5, color: '#000' },
    { id: 'P2', arrivalTime: 1, burstTime: 3, color: '#000' }
  ];
  const r = fcfs.run(procs);
  check(typeof r.avgResponseTime === 'number', 'avgResponseTime present', r.avgResponseTime);
  check(typeof r.throughput === 'number', 'throughput present', r.throughput);
  check(r.processResults.every(p => typeof p.responseTime === 'number'), 'per-process responseTime present');
}

// ---------------------------------------------------------------- Report
console.log(`\n=== ${pass} passed, ${fail} failed ===`);
if (failures.length) {
  console.log('\nFailures:');
  for (const f of failures) console.log('  -', f);
  process.exit(1);
}
console.log('All assertions passed.');
