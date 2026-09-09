/**
 * @fileoverview SchedViz — Type definitions (JSDoc) and shared constants.
 * @module core/types
 */

/**
 * @typedef {Object} Process
 * @property {string} id            e.g. "P1"
 * @property {number} arrivalTime   Non-negative integer
 * @property {number} burstTime     Positive integer (>=1)
 * @property {number} [priority]    Lower = higher priority; only for priority algorithms
 * @property {number} [deadline]    Relative deadline (offset from arrival/period start); real-time
 * @property {number} [period]      Task period; periodic real-time
 * @property {number} [wcet]        Worst-case execution time; periodic real-time <= burstTime
 * @property {number} [tickets]     Ticket count; lottery / fair-share
 * @property {number} [weight]      Weight; weighted fair-share
 * @property {number} [nice]        Nice value (-20..19); CFS/fair-share
 * @property {number} [share]       CPU share (fraction or count); fair-share
 * @property {string} color         Resolved from the categorical palette by index
 */
/**
 * @typedef {Object} AlgorithmField
 * @property {string} key          field name on Process, e.g. "deadline"
 * @property {string} label        column header, e.g. "Deadline"
 * @property {string} [hint]       short tooltip help text
 */

/** @typedef {'classical'|'realTime'|'fairShare'|'modern'} AlgorithmCategory */

/**
 * @typedef {Object} GanttBlock
 * @property {string} processId     or "IDLE"
 * @property {number} start
 * @property {number} end
 */

/**
 * @typedef {Object} ProcessResult
 * @property {string} id
 * @property {number} arrivalTime
 * @property {number} burstTime
 * @property {number} [priority]
 * @property {number} [deadline]
 * @property {number} [period]
 * @property {number} [wcet]
 * @property {number} [tickets]
 * @property {number} [weight]
 * @property {number} [nice]
 * @property {number} [share]
 * @property {number} [responseTime]   time from (first) arrival to first CPU allocation
 * @property {number} completionTime
 * @property {number} turnaroundTime   completionTime - arrivalTime
 * @property {number} waitingTime      turnaroundTime - burstTime
 * @property {boolean} [deadlineMissed]  true if the task missed its deadline
 */

/**
 * @typedef {Object} ScheduleResult
 * @property {string} algorithm            display name, e.g. "Round Robin (q=2)"
 * @property {GanttBlock[]} gantt
 * @property {ProcessResult[]} processResults
 * @property {number} avgWaitingTime
 * @property {number} avgTurnaroundTime
 * @property {number} [avgResponseTime]
 * @property {number} [throughput]
 * @property {number} totalIdleTime
 * @property {number} totalTime            makespan
 * @property {number} cpuUtilization       percent
 * @property {number} contextSwitches      number of context switches
 * @property {boolean} [allDeadlinesMet]   real-time: true if no deadline was missed
 * @property {number[]} [deadlineMissedAt] real-time: times at which deadlines were missed
 */

/** Process color palette — 10 distinct hues */
export const PROC_PALETTE = [
  '#4FC3F7', '#FF8A65', '#81C784', '#BA68C8', '#FFD54F',
  '#F06292', '#4DD0E1', '#FFB74D', '#9575CD', '#AED581'
];

/** Algorithm color palette — for comparison charts */
export const ALGO_PALETTE = [
  '#4FC3F7', '#FF8A65', '#81C784', '#BA68C8', '#FFD54F', '#F06292'
];

/** Algorithm display names and metadata. */
export const ALGORITHMS = {
  // ---------------------------------------------------------------- Classical
  fcfs:       { name: 'FCFS', fullName: 'First Come First Served', category: 'classical', fields: [] },
  sjf:        { name: 'SJF', fullName: 'Shortest Job First (Non-Preemptive)', category: 'classical', fields: [] },
  srtf:       { name: 'SRTF', fullName: 'Shortest Remaining Time First', category: 'classical', fields: [] },
  priorityNP: { name: 'Priority (NP)', fullName: 'Priority Non-Preemptive', category: 'classical', fields: ['priority'] },
  priorityP:  { name: 'Priority (P)', fullName: 'Priority Preemptive', category: 'classical', fields: ['priority'] },
  roundRobin: { name: 'Round Robin', fullName: 'Round Robin', category: 'classical', fields: [], needsQuantum: true },
  hrrn:       { name: 'HRRN', fullName: 'Highest Response Ratio Next', category: 'classical', fields: [] },
  aging:      { name: 'Aging SRTF', fullName: 'SRTF with Aging', category: 'classical', fields: [], needsAging: true },
  mlq:        { name: 'Multilevel Queue', fullName: 'Multilevel Queue (2-level)', category: 'classical', fields: ['queue'] },
  mlfq:       { name: 'MLFQ', fullName: 'Multilevel Feedback Queue', category: 'classical', fields: [], needsQuantum: true, needsBoost: true },

  // ---------------------------------------------------------------- Real-Time
  rateMonotonic:     { name: 'Rate Monotonic', fullName: 'Rate Monotonic Scheduling', category: 'realTime', fields: ['period', 'wcet', 'deadline'] },
  earliestDeadlineFirst: { name: 'EDF', fullName: 'Earliest Deadline First', category: 'realTime', fields: ['period', 'wcet', 'deadline'] },
  deadlineMonotonic: { name: 'Deadline Monotonic', fullName: 'Deadline Monotonic Scheduling', category: 'realTime', fields: ['period', 'wcet', 'deadline'] },
  leastLaxityFirst:  { name: 'LLF', fullName: 'Least Laxity First', category: 'realTime', fields: ['period', 'wcet', 'deadline'] },
  rateMonotonicNP:   { name: 'RM (NP)', fullName: 'Rate Monotonic Non-Preemptive', category: 'realTime', fields: ['period', 'wcet', 'deadline'] },
  edfNonPreemptive:  { name: 'EDF (NP)', fullName: 'EDF Non-Preemptive', category: 'realTime', fields: ['period', 'wcet', 'deadline'] },
  priorityInheritance: { name: 'PIP', fullName: 'Priority Inheritance Protocol', category: 'realTime', fields: ['period', 'wcet', 'deadline', 'priority'] },
  fixedPriorityNP:   { name: 'Fixed Priority NP', fullName: 'Fixed Priority Non-Preemptive Periodic', category: 'realTime', fields: ['period', 'wcet', 'deadline', 'priority'] },
  pollingServer:     { name: 'Polling Server', fullName: 'Polling Server (Aperiodic)', category: 'realTime', fields: ['period', 'wcet', 'deadline'] },

  // ---------------------------------------------------------------- Fair-Share
  weightedRoundRobin:      { name: 'WRR', fullName: 'Weighted Round Robin', category: 'fairShare', fields: ['weight'] },
  weightedFairQueueing:    { name: 'WFQ', fullName: 'Weighted Fair Queuing', category: 'fairShare', fields: ['weight'] },
  fairShareNice:           { name: 'Fair Share (nice)', fullName: 'Fair Share by Nice Value', category: 'fairShare', fields: ['nice'] },
  deficitRoundRobin:       { name: 'DRR', fullName: 'Deficit Round Robin', category: 'fairShare', fields: ['weight'], needsQuantum: true },
  lottery:                 { name: 'Lottery', fullName: 'Lottery Scheduling', category: 'fairShare', fields: ['tickets'] },
  weightedFairShareDynamic: { name: 'Dynamic Fair Share', fullName: 'Weighted Fair Share (Dynamic)', category: 'fairShare', fields: ['weight', 'nice'] },

  // ---------------------------------------------------------------- Modern / OS
  completelyFairScheduler: { name: 'CFS', fullName: 'Completely Fair Scheduler', category: 'modern', fields: ['nice'] },
  brainFuckScheduler:      { name: 'BFS', fullName: 'Brain Fuck Scheduler', category: 'modern', fields: [] },
  schedDeadline:           { name: 'SCHED_DEADLINE', fullName: 'SCHED_DEADLINE (EDF-based)', category: 'modern', fields: ['period', 'wcet', 'deadline'] },
  omniVR:                  { name: 'OmniVR', fullName: 'OmniVR Task Scheduler', category: 'modern', fields: ['deadline', 'priority'] },
  schedIdleBalancing:      { name: 'Idle Balancing', fullName: 'Load-Balanced Shared Queue', category: 'modern', fields: [] }
};

/** Human-readable labels for each algorithm category. */
export const CATEGORY_LABELS = {
  classical: 'Classical',
  realTime: 'Real-Time',
  fairShare: 'Fair-Share',
  modern: 'Modern / OS'
};

/** Field-column definition helper used by the process form. */
export const FIELD_LABELS = {
  arrivalTime: { label: 'Arrival', hint: 'When the process becomes ready' },
  burstTime:   { label: 'Burst', hint: 'Total CPU time needed' },
  priority:    { label: 'Priority', hint: 'Lower value = higher priority' },
  deadline:    { label: 'Deadline', hint: 'Relative deadline (<= period)' },
  period:      { label: 'Period', hint: 'Recurrence period of the periodic task' },
  wcet:        { label: 'WCET', hint: 'Worst-case execution time' },
  tickets:     { label: 'Tickets', hint: 'Ticket count for lottery' },
  weight:      { label: 'Weight', hint: 'Weight (>= share of CPU)' },
  nice:        { label: 'Nice', hint: 'Nice value, -20..19 (lower = higher priority)' },
  share:       { label: 'Share', hint: 'Target CPU share' },
  queue:       { label: 'Queue', hint: 'Which priority queue the process belongs to' }
};

/** Validation bounds */
export const VALIDATION = {
  MIN_PROCESSES: 1,
  MAX_PROCESSES: 10,
  MIN_BURST: 1,
  MAX_BURST: 99,
  MIN_ARRIVAL: 0,
  MAX_ARRIVAL: 99,
  MIN_PRIORITY: 1,
  MAX_PRIORITY: 9,
  MIN_QUANTUM: 1,
  MAX_QUANTUM: 20,
  MIN_DEADLINE: 1,
  MAX_DEADLINE: 999,
  MIN_PERIOD: 1,
  MAX_PERIOD: 999,
  MIN_WCET: 1,
  MAX_WCET: 99,
  MIN_TICKETS: 1,
  MAX_TICKETS: 99,
  MIN_WEIGHT: 1,
  MAX_WEIGHT: 99,
  MIN_NICE: -20,
  MAX_NICE: 19,
  MIN_SHARE: 1,
  MAX_SHARE: 100,
  MIN_QUEUE: 1,
  MAX_QUEUE: 3,
  MIN_AGING: 1,
  MAX_AGING: 20,
  MIN_BOOST: 1,
  MAX_BOOST: 50
};
