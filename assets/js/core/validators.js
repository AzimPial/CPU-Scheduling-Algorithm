/**
 * @fileoverview SchedViz — Input validators for process data and algorithm options.
 * @module core/validators
 */

import { VALIDATION } from './types.js';

const INTEGER_FIELDS = {
  arrivalTime: { min: 'MIN_ARRIVAL', max: 'MAX_ARRIVAL' },
  burstTime: { min: 'MIN_BURST', max: 'MAX_BURST' },
  priority: { min: 'MIN_PRIORITY', max: 'MAX_PRIORITY' },
  deadline: { min: 'MIN_DEADLINE', max: 'MAX_DEADLINE' },
  period: { min: 'MIN_PERIOD', max: 'MAX_PERIOD' },
  wcet: { min: 'MIN_WCET', max: 'MAX_WCET' },
  tickets: { min: 'MIN_TICKETS', max: 'MAX_TICKETS' },
  weight: { min: 'MIN_WEIGHT', max: 'MAX_WEIGHT' },
  nice: { min: 'MIN_NICE', max: 'MAX_NICE' },
  share: { min: 'MIN_SHARE', max: 'MAX_SHARE' },
  queue: { min: 'MIN_QUEUE', max: 'MAX_QUEUE' }
};

const FIELD_LABEL = {
  arrivalTime: 'Arrival', burstTime: 'Burst', priority: 'Priority', deadline: 'Deadline',
  period: 'Period', wcet: 'WCET', tickets: 'Tickets', weight: 'Weight', nice: 'Nice',
  share: 'Share', queue: 'Queue'
};

/**
 * Validates a single process row against the active field list.
 * @param {Object} fields - Raw input fields {arrivalTime, burstTime, ...}
 * @param {string[]} activeFields - Field keys that are required for the selected algorithm
 * @returns {{valid: boolean, errors: Object<string, string>}} Map of field -> error message
 */
export function validateProcess(fields, activeFields = []) {
  const errors = {};

  for (const key of activeFields) {
    const meta = INTEGER_FIELDS[key];
    if (!meta) continue;
    const val = fields[key];
    if (val === '' || val === undefined || val === null) {
      errors[key] = 'Required';
      continue;
    }
    const n = Number(val);
    const min = VALIDATION[meta.min];
    const max = VALIDATION[meta.max];
    if (!Number.isInteger(n) || n < min || n > max) {
      errors[key] = `${FIELD_LABEL[key]}: ${min}–${max}`;
    }
  }

  if (activeFields.includes('wcet') && Number.isInteger(Number(fields.wcet))) {
    if (!check(greater('burstTime', 'wcet', fields))) {
      errors.wcet = 'WCET ≤ Burst';
    }
  }
  if (activeFields.includes('deadline') && activeFields.includes('period') &&
      Number.isInteger(Number(fields.deadline)) && Number.isInteger(Number(fields.period))) {
    if (Number(fields.deadline) > Number(fields.period)) {
      errors.deadline = 'Deadline ≤ Period';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

function greater(big, small, fields) {
  return (fields[big] === '' || fields[big] == null) ? true : Number(fields[big]) >= Number(fields[small]);
}

function check(cond) { return cond; }

/**
 * Validates the quantum for Round Robin / MLFQ / DRR.
 * @param {string|number} quantum
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateQuantum(quantum) {
  if (quantum === '' || quantum === undefined || quantum === null) {
    return { valid: false, error: 'Quantum is required' };
  }
  const n = Number(quantum);
  if (!Number.isInteger(n) || n < VALIDATION.MIN_QUANTUM || n > VALIDATION.MAX_QUANTUM) {
    return { valid: false, error: `Must be ${VALIDATION.MIN_QUANTUM}–${VALIDATION.MAX_QUANTUM}` };
  }
  return { valid: true, error: null };
}

/**
 * Validates the aging interval for Aging SRTF.
 * @param {string|number} val
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateAging(val) {
  if (val === '' || val === undefined || val === null) return { valid: false, error: 'Aging interval is required' };
  const n = Number(val);
  if (!Number.isInteger(n) || n < VALIDATION.MIN_AGING || n > VALIDATION.MAX_AGING) {
    return { valid: false, error: `Must be ${VALIDATION.MIN_AGING}–${VALIDATION.MAX_AGING}` };
  }
  return { valid: true, error: null };
}

/**
 * Validates the priority boost interval for MLFQ.
 * @param {string|number} val
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateBoost(val) {
  if (val === '' || val === undefined || val === null) return { valid: false, error: 'Boost interval is required' };
  const n = Number(val);
  if (!Number.isInteger(n) || n < VALIDATION.MIN_BOOST || n > VALIDATION.MAX_BOOST) {
    return { valid: false, error: `Must be ${VALIDATION.MIN_BOOST}–${VALIDATION.MAX_BOOST}` };
  }
  return { valid: true, error: null };
}

/**
 * Validates a full set of processes and returns per-process errors.
 * @param {Array<Object>} processRows - Array of process field maps
 * @param {string[]} activeFields - Field keys required for the selected algorithm
 * @returns {{valid: boolean, processErrors: Array<Object>}} processErrors[i] = {field: errorMsg} or null
 */
export function validateAllProcesses(processRows, activeFields = []) {
  const processErrors = [];
  let allValid = true;

  for (const row of processRows) {
    const { valid, errors } = validateProcess(row, activeFields);
    processErrors.push(valid ? null : errors);
    if (!valid) allValid = false;
  }

  return { valid: allValid, processErrors };
}
