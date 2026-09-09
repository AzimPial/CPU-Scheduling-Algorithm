/**
 * @fileoverview SchedViz — Algorithm info modal with descriptions, pseudocode, and complexity.
 * @module ui/modal
 */

const ALGO_INFO = {
  fcfs: {
    name: 'First Come First Served (FCFS)',
    description: 'The simplest scheduling algorithm. Processes are executed in the exact order they arrive in the ready queue. Once a process gets the CPU, it keeps it until it completes or voluntarily releases it. Non-preemptive — no process can interrupt a running one.',
    pseudocode: `FCFS(processes):
  sort processes by arrival time
  currentTime = 0
  for each process in sorted order:
    if currentTime < process.arrivalTime:
      idle until process arrives
    process.start = currentTime
    process.end = currentTime + process.burstTime
    currentTime = process.end
    record completion time`,
    complexity: 'O(n log n)',
    complexityNote: 'Due to sorting by arrival time',
    bestUsedWhen: 'Best used when process burst times are similar, or in batch systems where simplicity matters more than response time. Poor choice for interactive systems due to the convoy effect.'
  },
  sjf: {
    name: 'Shortest Job First (Non-Preemptive)',
    description: 'At each scheduling point, the process with the smallest burst time is selected from all arrived-but-not-yet-run processes. Once selected, the process runs to completion without interruption. Optimal for minimizing average waiting time among non-preemptive algorithms.',
    pseudocode: `SJF(processes):
  done = empty set
  currentTime = 0
  while not all processes done:
    ready = arrived processes not in done
    if ready is empty:
      advance time to next arrival
      continue
    select process with smallest burstTime
      (ties: earliest arrival, then input order)
    process.start = currentTime
    process.end = currentTime + process.burstTime
    currentTime = process.end
    mark process as done`,
    complexity: 'O(n²)',
    complexityNote: 'Repeatedly scanning for shortest job',
    bestUsedWhen: 'Best when all burst times are known in advance (e.g., batch jobs with estimated runtimes). Not practical for general-purpose interactive systems since burst times are typically unknown.'
  },
  srtf: {
    name: 'Shortest Remaining Time First (Preemptive SJF)',
    description: 'The preemptive version of SJF. The process with the smallest remaining burst time always runs. If a new process arrives with a shorter remaining time than what\'s left of the current process, the current process is preempted. Optimal for minimum average waiting time.',
    pseudocode: `SRTF(processes):
  remaining[] = burstTime for each process
  currentTime = 0
  while not all processes done:
    ready = arrived processes with remaining > 0
    if ready is empty:
      advance to next arrival
      continue
    select process with smallest remaining
    nextEvent = min(next arrival, finish time)
    run from currentTime to nextEvent
    remaining[selected] -= elapsed
    if remaining[selected] == 0:
      record completion
    if preempted:
      context switch`,
    complexity: 'O(n²)',
    complexityNote: 'Event-driven simulation, each event O(n)',
    bestUsedWhen: 'Optimal for minimum average waiting time. Best for time-sharing systems where responsiveness matters. Higher overhead than SJF due to frequent preemption and context switches.'
  },
  priorityNP: {
    name: 'Priority Non-Preemptive',
    description: 'Each process has a priority (lower number = higher priority). When the CPU is free, the highest-priority arrived process runs to completion. Ties broken by arrival time, then input order. Processes must wait until the current process finishes.',
    pseudocode: `Priority_NP(processes):
  done = empty set
  currentTime = 0
  while not all done:
    ready = arrived processes not in done
    if ready is empty:
      advance to next arrival
      continue
    select highest priority (lowest number)
      ties: earliest arrival, then input order
    process.start = currentTime
    process.end = currentTime + process.burstTime
    currentTime = process.end
    mark done`,
    complexity: 'O(n²)',
    complexityNote: 'Repeatedly scanning for highest priority',
    bestUsedWhen: 'Best when processes have known priority levels (e.g., system vs user processes). Risk of starvation for low-priority processes if high-priority processes keep arriving.'
  },
  priorityP: {
    name: 'Priority Preemptive',
    description: 'Like non-preemptive priority, but the running process is preempted whenever a higher-priority process arrives. The CPU is always running the highest-priority available process at any given time.',
    pseudocode: `Priority_P(processes):
  remaining[] = burstTime for each
  currentTime = 0
  while not all done:
    ready = arrived with remaining > 0
    if ready is empty:
      advance to next arrival
      continue
    select highest priority (lowest number)
    nextEvent = min(next arrival, finish time)
    run from currentTime to nextEvent
    remaining[selected] -= elapsed
    if preempted by higher priority:
      context switch
      put current back in ready queue
    if remaining == 0: record completion`,
    complexity: 'O(n²)',
    complexityNote: 'Event-driven with priority comparison at each event',
    bestUsedWhen: 'Best when processes have clear priority levels and responsiveness for high-priority tasks is critical (e.g., real-time systems). Starvation of low-priority processes is a concern.'
  },
  roundRobin: {
    name: 'Round Robin',
    description: 'Each process gets a fixed time quantum (q). Processes are kept in a FIFO ready queue. Each process runs for at most q time units. If it doesn\'t finish, it goes to the back of the queue. New arrivals join the queue before the preempted process is re-queued.',
    pseudocode: `RoundRobin(processes, quantum):
  queue = processes in arrival order
  remaining[] = burstTime for each
  currentTime = 0
  while queue not empty:
    current = queue.dequeue()
    execTime = min(remaining[current], quantum)
    run from currentTime to currentTime+execTime
    remaining[current] -= execTime
    currentTime += execTime
    enqueue any new arrivals
    if remaining[current] > 0:
      queue.enqueue(current)  // after new arrivals
    else:
      record completion`,
    complexity: 'O(n × Q/B)',
    complexityNote: 'Where Q is total quantum slots needed',
    bestUsedWhen: 'Best for time-sharing and interactive systems. Provides fair CPU allocation and good response time. Quantum size is critical: too small = high overhead, too large = degrades to FCFS.'
  },
  hrrn: {
    name: 'Highest Response Ratio Next (HRRN)',
    description: 'Non-preemptive. At each scheduling point, the ready process with the largest response ratio (waitingTime + burstTime) / burstTime is selected. The ratio grows with waiting time, so long-waiting jobs are gradually prioritised — combining the strengths of FCFS (favours short jobs) and SJF (avoids starvation).',
    pseudocode: `HRRN(processes):
  done = empty set
  currentTime = 0
  while not all done:
    ready = arrived processes not in done
    if ready is empty: advance to next arrival
    for each process in ready:
      ratio = (currentTime - arrival + burst) / burst
    select process with largest ratio
    run to completion`, 
    complexity: 'O(n²)',
    complexityNote: 'Repeatedly recomputing response ratios',
    bestUsedWhen: 'Interactive batch systems where you want low average waiting time but must prevent starvation of long jobs.'
  },
  aging: {
    name: 'SRTF with Aging',
    description: 'Preemptive SJF (SRTF) extended with aging. A process waiting longer gets its effective remaining time reduced, boosting its scheduling priority so that long jobs are not starved by a stream of short jobs. The aging interval (options.aging) controls how quickly waiting reduces the effective remaining time.',
    pseudocode: `Aging_SRTF(processes, interval):
  remaining[] = burstTime
  while not all done:
    ready = arrived with remaining > 0
    for each p: effective[p] = remaining[p] - floor((now - arrival)/interval)
    select process with smallest effective remaining
    preempt on new arrivals
    ...`,
    complexity: 'O(n²)',
    complexityNote: 'Event-driven, each event O(n)',
    bestUsedWhen: 'When SRTF would otherwise starve long jobs but you still want near-optimal average waiting time.'
  },
  mlq: {
    name: 'Multilevel Queue (2-level)',
    description: 'Processes are partitioned into separate queues by type (here: a high-priority foreground queue running Round Robin and a background queue running FCFS). Absolute priority: the background only runs when no foreground process is ready. Simplified educational model with two queues.',
    pseudocode: `MLQ(processes):
  q1 = foreground (Round Robin, quantum)
  q2 = background (FCFS)
  while not all done:
    if q1 non-empty: run q1 head for min(quantum, remaining)
    else: run q2 head to completion (unless q1 job arrives)`,
    complexity: 'O(n·k)',
    complexityNote: 'k runs through queues',
    bestUsedWhen: 'Systems with clearly separable job classes (interactive vs batch) where one class must always be favoured.'
  },
  mlfq: {
    name: 'Multilevel Feedback Queue (MLFQ)',
    description: 'Three Round-Robin priority queues Q0<Q1<Q2 (Q0 highest) with doubling quanta (q, 2q, 4q). Jobs start in Q0 and are demoted one level each time they exhaust their quantum without finishing. A periodic priority boost (options.boost) moves all jobs back to Q0, preventing starvation and adapting to I/O-bound processes. Simplified educational model.',
    pseudocode: `MLFQ(processes, quantum, boost):
  level[id] = 0 for all
  while not all done:
    if now >= nextBoost: move all jobs to Q0
    run head of highest non-empty queue for its quantum
    if slice exhausted and not done: demote one level
    else re-queue at same level`,
    complexity: 'O(n·levels)',
    complexityNote: 'Linear per slice',
    bestUsedWhen: 'General-purpose time-sharing OSes that must serve both interactive (I/O-bound) and compute-heavy jobs without starvation.'
  },
  rateMonotonic: {
    name: 'Rate Monotonic (RM)',
    description: 'Fixed-priority real-time scheduling: tasks with shorter periods get higher priorities. Optimal among fixed-priority policies on a preemptive single CPU. Jobs of a task are released periodically; a release preempts lower-priority work. Educational deterministic simulation over the hyperperiod. Assumptions: implicit deadlines, independent tasks, no jitter.',
    pseudocode: `RM(tasks):
  assign priority by period (shorter = higher)
  simulate over hyperperiod:
    each period releases a job with execution time C
    run highest-priority ready job (preemptive)
    if a job misses its deadline: record miss`,
    complexity: 'O(H·n)',
    complexityNote: 'H = hyperperiod (LCM of periods)',
    bestUsedWhen: 'Hard real-time systems where tasks are periodic and periods are the natural priority ordering. Schedulability check: Σ(Cᵢ/Tᵢ) ≤ n(2^(1/n)−1).'
  },
  earliestDeadlineFirst: {
    name: 'Earliest Deadline First (EDF)',
    description: 'Dynamic-priority real-time scheduling: the released job with the earliest absolute deadline runs, preempting lower-urgency jobs. EDF is optimal for feasibility on a preemptive uniprocessor. Educational deterministic simulation over the hyperperiod. Assumptions: implicit deadlines, independent tasks, no jitter.',
    pseudocode: `EDF(tasks):
  simulate over hyperperiod:
    each period releases a job
    run job with the earliest absolute deadline
    preempt when a newer deadline arrives
    record deadline misses`,
    complexity: 'O(H·n)',
    complexityNote: 'H = hyperperiod (LCM of periods)',
    bestUsedWhen: 'Dynamic real-time task sets where feasibility (Σ Cᵢ/Tᵢ ≤ 1) is the goal rather than fixed priorities.'
  },
  deadlineMonotonic: {
    name: 'Deadline Monotonic (DM)',
    description: 'Fixed-priority real-time scheduling generalising RM: tasks with shorter relative deadlines get higher priorities. When deadlines differ from periods, DM can be feasible where RM is not. Preemptive. Educational simulation over the hyperperiod with the same assumptions as RM.',
    pseudocode: `DM(tasks):
  assign priority by relative deadline (shorter = higher)
  simulate over hyperperiod with fixed priorities (preemptive)
  record deadline misses`,
    complexity: 'O(H·n)',
    complexityNote: 'H = hyperperiod',
    bestUsedWhen: 'Periodic real-time systems where relative deadlines are not equal to periods.'
  },
  leastLaxityFirst: {
    name: 'Least Laxity First (LLF)',
    description: 'Dynamic-priority real-time scheduling: the released job with the smallest laxity (deadline − now − remaining execution) runs, since a smaller laxity means it is closer to missing its deadline. Preemptive. Educational deterministic simulation over the hyperperiod.',
    pseudocode: `LLF(tasks):
  simulate over hyperperiod:
    laxity[job] = deadline - now - remaining
    run the job with the smallest laxity
    preempt when a job becomes more urgent`,
    complexity: 'O(H·n)',
    complexityNote: 'H = hyperperiod',
    bestUsedWhen: 'Real-time systems needing dynamic urgency-driven scheduling; can hit thrashing when laxities tie, so use with care.'
  },
  rateMonotonicNP: {
    name: 'Rate Monotonic (Non-Preemptive)',
    description: 'Rate Monotonic without preemption: once a job starts, it runs to completion. Priority is still assigned by period (shorter = higher). Non-preemption means a higher-priority job arriving during a lower-priority job\'s execution must wait, which can reduce schedulability compared with preemptive RM.',
    pseudocode: `RM_NP(tasks):
  assign priority by period
  simulate over hyperperiod:
    when CPU free, run highest-priority ready job to completion
    record deadline misses`,
    complexity: 'O(H·n)',
    complexityNote: 'H = hyperperiod',
    bestUsedWhen: 'Where preemption overhead must be avoided and the start-time mattering (e.g. non-preemptable execution) is acceptable.'
  },
  edfNonPreemptive: {
    name: 'EDF (Non-Preemptive)',
    description: 'Earliest Deadline First without preemption: a job runs to completion once started. Selection is still by earliest absolute deadline. Non-preemption reduces schedulability compared with preemptive EDF but suits co-operative/non-preemptable tasks.',
    pseudocode: `EDF_NP(tasks):
  simulate over hyperperiod:
    when CPU free, run the job with the earliest deadline to completion
    record deadline misses`,
    complexity: 'O(H·n)',
    complexityNote: 'H = hyperperiod',
    bestUsedWhen: 'Hard-real-time systems with non-preemptable execution units where EDF priority ordering is still desired.'
  },
  priorityInheritance: {
    name: 'Priority Inheritance Protocol (PIP)',
    description: 'Simplified educational simulation. Fixed-priority preemptive scheduling with a single shared-resource critical section. When a higher-priority job needs the resource that a lower-priority job currently holds, the holder\'s effective priority is raised to the waiting job\'s priority (inheritance), bounding priority inversion. This model does not simulate real mutexes, multiple resources, or deadlock — it is a deterministic teaching approximation.',
    pseudocode: `PIP(tasks):
  fixed priority per task (preemptive)
  if higher-priority job is blocked on a resource:
    raise holder's effective priority (inheritance)
  schedule by effective priority
  record deadline misses`,
    complexity: 'O(H·n)',
    complexityNote: 'H = hyperperiod',
    bestUsedWhen: 'Real-time systems sharing resources where unbounded priority inversion must be avoided.'
  },
  fixedPriorityNP: {
    name: 'Fixed Priority Non-Preemptive (Periodic)',
    description: 'Periodic tasks scheduled by an explicit priority value (lower = higher priority), non-preemptively: each released job runs to completion. Educational deterministic simulation over the hyperperiod.',
    pseudocode: `FixedPriority_NP(tasks):
  priority from task.priority (lower = higher)
  simulate over hyperperiod (non-preemptive)
  record deadline misses`,
    complexity: 'O(H·n)',
    complexityNote: 'H = hyperperiod',
    bestUsedWhen: 'Periodic task sets with an explicit priority ordering and no preemption requirement.'
  },
  pollingServer: {
    name: 'Polling Server (Aperiodic)',
    description: 'Simplified educational simulation of a polling server for aperiodic tasks. A periodic server with a fixed capacity becomes available at the start of each server period and serves arrived aperiodic jobs within its window; when the server has no backlog the remaining time is used by periodic background tasks (rate-monotonic priority). This is a deterministic approximation of the classical polling server.',
    pseudocode: `PollingServer(tasks, capacity):
  server reserves capacity each period
  within the window, serve aperiodic backlog first
  otherwise run periodic background by RM priority
  record deadline misses`,
    complexity: 'O(H·n)',
    complexityNote: 'H = hyperperiod',
    bestUsedWhen: 'Real-time systems that must bound the response latency of aperiodic events while guaranteeing periodic tasks.'
  },
  weightedRoundRobin: {
    name: 'Weighted Round Robin (WRR)',
    description: 'Round Robin where each process\'s slice is proportional to its weight (slice = weight × quantum) instead of a fixed quantum. Higher-weight processes receive proportionally more CPU per round. Preemptive at slice boundaries; new arrivals join the back of the cycle.',
    pseudocode: `WRR(processes, quantum):
  queue = arrival order
  for each head: slice = weight * quantum
  run min(remaining, slice), then re-queue
  (only arrived processes are served)`,
    complexity: 'O(n) per round',
    complexityNote: 'Cyclic service',
    bestUsedWhen: 'Traffic-shaping / QoS where flows need proportional bandwidth with low overhead.'
  },
  weightedFairQueueing: {
    name: 'Weighted Fair Queuing (WFQ)',
    description: 'Simplified educational WFQ / Generalized Processor Sharing. At each scheduling decision the ready job with the smallest finish time runs, where finish = now + remaining/weight. Higher-weight jobs finish "earlier" in virtual time and receive a larger share. Preemptive. No packetization and weights need not sum to one.',
    pseudocode: `WFQ(processes):
  while not all done:
    now = current time
    run job minimizing now + remaining/weight
    (preempt when a job with smaller finish arrives)`,
    complexity: 'O(n) per decision',
    complexityNote: 'Linear scan',
    bestUsedWhen: 'Guaranteeing weighted fairness (e.g. network fair queuing, proportional-share CPU) with low latency for low burst sizes.'
  },
  fairShareNice: {
    name: 'Fair Share by Nice Value',
    description: 'Proportional-share scheduling where each process\'s CPU weight is derived from its nice value via weight = max(1, 20 − nice). A lower (nicer) value yields a higher weight, so the process receives a larger share. Scheduling is by virtual finish (WFQ/GPS), preemptive.',
    pseudocode: `FairShareNice(processes):
  weight[p] = max(1, 20 - nice[p])
  run job minimizing now + remaining/weight[p]`,
    complexity: 'O(n) per decision',
    complexityNote: 'Linear scan',
    bestUsedWhen: 'User-level fair sharing where a simple priority mapping (nice) drives proportional CPU allocation.'
  },
  deficitRoundRobin: {
    name: 'Deficit Round Robin (DRR)',
    description: 'Round Robin that uses a per-process deficit counter to honour weights precisely without floating-point sharing. Each round adds a credit (baseQuantum × weight) to a process\'s deficit, which it may spend on execution; unused deficit carries to the next round, so no credit is wasted. Weighted, work-conserving, and O(1)-ish per round.',
    pseudocode: `DRR(processes, baseQuantum):
  deficit[p] = 0
  for each round:
    for each active p:
      deficit[p] += baseQuantum * weight
      run min(remaining, deficit[p])
      deficit[p] -= executed
      if remaining == 0: complete`,
    complexity: 'O(n) per round',
    complexityNote: 'Per-round pass',
    bestUsedWhen: 'High-throughput proportional sharing (e.g. packet scheduling in routers) where fairness precision matters and per-process state is available.'
  },
  lottery: {
    name: 'Lottery Scheduling',
    description: 'Proportional-share scheduling using random ticket draws. Each process holds `tickets`; at each scheduling decision a random ticket is drawn and the owner runs for a quantum. Long-run CPU share is proportional to tickets. Uses a seeded PRNG (default seed 42) for deterministic, reproducible runs.',
    pseudocode: `Lottery(processes, quantum):
  total = sum of tickets
  while not all done:
    r = random() * total
    pick owner of the ticket at offset r
    run for min(remaining, quantum)
    (arrived processes only)`,
    complexity: 'O(n) per draw',
    complexityNote: 'Sum tickets + scan',
    bestUsedWhen: 'Simple proportional sharing with probabilistic fairness, low overhead, and easy support for dynamic ticket transfers.'
  },
  weightedFairShareDynamic: {
    name: 'Weighted Fair Share (Dynamic)',
    description: 'Combines an explicit weight with a nice-based factor (effectiveWeight = weight × max(1, 20 − nice)) and adds a small waiting-time aging term to prefer long-waiting processes. Scheduling by virtual finish (WFQ/GPS), preemptive. Simplified educational model.',
    pseudocode: `DynamicFairShare(processes):
  eff[p] = weight[p] * max(1, 20 - nice[p])
  finish[p] = now + remaining/eff[p] - aging(wait)
  run min-finish (preemptive)`,
    complexity: 'O(n) per decision',
    complexityNote: 'Linear scan',
    bestUsedWhen: 'Many-class workloads wanting both explicit weighting and temporal fairness.'
  },
  completelyFairScheduler: {
    name: 'Completely Fair Scheduler (CFS)',
    description: 'Educational CFS simulation. Each process accumulates vruntime proportional to the CPU time it consumes divided by its nice-derived weight (weight = 1024 / 1.25^nice). At every decision the process with the smallest vruntime runs, keeping execution fair in virtual time. Single-CPU, work-conserving approximation of Linux CFS — omits wakeup-preemption heuristics, granularity clamping and tick details.',
    pseudocode: `CFS(processes):
  vruntime[p] = 0; new arrivals start at min vruntime
  while not all done:
    run process with smallest vruntime for a slice
    vruntime[p] += slice / weight(nice)`,
    complexity: 'O(log n) with a tree',
    complexityNote: 'Red-black-tree selection in Linux; here O(n) scan',
    bestUsedWhen: 'General-purpose interactive OS scheduling that must remain fair under mixed interactive/CPU-bound workloads.'
  },
  brainFuckScheduler: {
    name: 'Brain Fuck Scheduler (BFS)',
    description: 'Educational BFS simulation. Tasks are ranked by a virtual deadline derived from their nice-based priority and virtual runtime; the task with the smallest virtual deadline runs. BFS targets very low O(1) selection overhead and excellent interactive responsiveness. Single-CPU, work-conserving approximation.',
    pseudocode: `BFS(processes):
  vruntime[p] += executed * niceFactor(nice)
  virtualDeadline[p] = scaled(vruntime, nice)
  run the smallest virtual deadline`,
    complexity: 'O(n) selection',
    complexityNote: 'Single scan; Linux uses skip-list',
    bestUsedWhen: 'Desktop/interactive responsiveness where simplicity and low-latency scheduling are valued over throughput.'
  },
  schedDeadline: {
    name: 'SCHED_DEADLINE (Linux EDF)',
    description: 'Educational simulation of Linux\'s SCHED_DEADLINE real-time class, which is EDF-based: each task carries runtime (wcet), deadline and period; released jobs are scheduled by earliest absolute deadline (matching EDF optimality on a preemptive uniprocessor). The model captures the EDF core and omits the admission-control (bandwidth) algorithm and timer granularity.',
    pseudocode: `SCHED_DEADLINE(tasks):
  for each period, release a job (runtime = C)
  schedule the released job with the earliest deadline
  admission control (simplified: skipped)
  record deadline misses`,
    complexity: 'O(H·n)',
    complexityNote: 'H = hyperperiod',
    bestUsedWhen: 'Linux real-time workloads needing precise runtime/deadline/period guarantees with EDF optimality.'
  },
  omniVR: {
    name: 'OmniVR Task Scheduler',
    description: 'Educational simulation inspired by modern hierarchical/virtual-runtime task schedulers. Each task carries a relative `deadline` and `priority` (lower = higher priority). Selection ranks first by priority, then by scheduling urgency (remaining time relative to deadline), so urgent work is favoured within a priority band. Preemptive. This is a conceptual approximation, not the proprietary OmniVR implementation.',
    pseudocode: `OmniVR(processes):
  for each ready p:
    urgency = remaining / (deadline - arrival)
    key = priority * BIG + urgency * MED - arrival
  run smallest key (preemptive)`,
    complexity: 'O(n) per decision',
    complexityNote: 'Linear scan',
    bestUsedWhen: 'Workloads with both priority and deadline constraints where urgency should break priority ties.'
  },
  schedIdleBalancing: {
    name: 'Load-Balanced Shared Queue',
    description: 'Educational model of a load-balanced shared runqueue. All processes are visible to a single logical scheduler that advances whichever process has received the least CPU so far ("least-served first"), keeping perceived load balanced and preventing starvation/idle imbalance. Abstracts multi-core load balancing into one CPU. Configurable slice via quantum.',
    pseudocode: `IdleBalancing(processes):
  served[p] = burst - remaining
  while not all done:
    run the ready process with the smallest served
    (slice = quantum), then re-evaluate`,
    complexity: 'O(n) per decision',
    complexityNote: 'Linear scan',
    bestUsedWhen: 'Multicore systems modelled as a single fair runqueue, or teaching the concept of load balancing.'
  }
};

let currentModal = null;

/**
 * Show the algorithm info modal.
 * @param {string} algorithmKey - Key from ALGORITHMS (e.g. 'fcfs', 'sjf')
 */
export function showAlgorithmInfo(algorithmKey) {
  const info = ALGO_INFO[algorithmKey];
  if (!info) return;

  close();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-labelledby="modal-title" aria-modal="true">
      <div class="modal-header">
        <h3 id="modal-title">${info.name}</h3>
        <button class="btn-icon modal-close-btn" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <p>${info.description}</p>
        <h4 style="margin:12px 0 6px;font-size:12px;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.5px">Pseudocode</h4>
        <pre>${info.pseudocode}</pre>
        <div style="display:flex;gap:12px;align-items:center;margin:12px 0">
          <span style="font-size:12px;color:var(--text-muted);">Time Complexity:</span>
          <span class="complexity">${info.complexity}</span>
          <span style="font-size:12px;color:var(--text-muted)">${info.complexityNote}</span>
        </div>
        <div class="best-when"><strong>Best used when:</strong> ${info.bestUsedWhen}</div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  currentModal = overlay;

  requestAnimationFrame(() => overlay.classList.add('active'));

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector('.modal-close-btn').addEventListener('click', close);

  const escHandler = (e) => {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);
}

/**
 * Show a keyboard shortcuts help modal.
 */
export function showShortcutsModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-labelledby="shortcuts-title" aria-modal="true">
      <div class="modal-header">
        <h3 id="shortcuts-title">Keyboard Shortcuts</h3>
        <button class="btn-icon modal-close-btn" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div style="display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;justify-content:space-between;align-items:center"><span>Run algorithm</span><span class="kbd">Enter</span></div>
          <div style="display:flex;justify-content:space-between;align-items:center"><span>Randomize processes</span><span class="kbd">R</span></div>
          <div style="display:flex;justify-content:space-between;align-items:center"><span>Close modal</span><span class="kbd">Esc</span></div>
          <div style="display:flex;justify-content:space-between;align-items:center"><span>New chat</span><span class="kbd">Ctrl + N</span></div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  currentModal = overlay;
  requestAnimationFrame(() => overlay.classList.add('active'));

  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('.modal-close-btn').addEventListener('click', close);
}

/**
 * Close the currently open modal.
 */
export function close() {
  if (currentModal) {
    currentModal.classList.remove('active');
    setTimeout(() => {
      currentModal?.remove();
      currentModal = null;
    }, 250);
  }
}
