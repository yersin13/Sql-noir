import type { Database } from 'sql.js';
import type { Step, TablePreview } from '../components/StepCard';
import type { QueryResult } from '../components/ResultTable';

/** Helper: run SQL and return standardized result */
function execQuery(db: Database, sql: string): QueryResult {
  const res = db.exec(sql);
  if (!res || res.length === 0) return { columns: [], rows: [] };
  return { columns: res[0].columns, rows: res[0].values as any[][] };
}

/** Standard validator: compare user result against model result */
export function makeStandardValidator(modelSql: string, opts?: { enforceOrder?: boolean }) {
  const enforceOrder = opts?.enforceOrder ?? true;
  return async (db: Database, user: QueryResult | null) => {
    if (!user) return { ok: false, hint: 'Run your SQL first.' };
    let model: QueryResult;
    try {
      model = execQuery(db, modelSql);
    } catch {
      return { ok: false, hint: 'Internal model failed.' };
    }
    const colsMatch = JSON.stringify(user.columns) === JSON.stringify(model.columns);
    if (!colsMatch) return { ok: false, hint: 'Columns mismatch. Check names/order.' };
    if (user.rows.length !== model.rows.length) {
      return { ok: false, hint: `Row count should be ${model.rows.length}.` };
    }
    const norm = (v: any) => (typeof v === 'string' ? v.trim() : v);
    const A = enforceOrder ? user.rows : [...user.rows].sort();
    const B = enforceOrder ? model.rows : [...model.rows].sort();
    for (let i = 0; i < A.length; i++) {
      const ra = A[i], rb = B[i];
      if (ra.length !== rb.length) return { ok: false, hint: 'Row shape mismatch.' };
      for (let j = 0; j < ra.length; j++) {
        if (norm(ra[j]) !== norm(rb[j])) {
          return { ok: false, hint: enforceOrder ? 'Ordering or values differ.' : 'Values differ.' };
        }
      }
    }
    return { ok: true };
  };
}

const shiftPreview: TablePreview = {
  name: 'shift_logs',
  description: 'Scheduled and recorded shift activity (seeded for August 2025).',
  columns: [
    { name: 'employee_id', description: 'Numeric employee id' },
    { name: 'employee_name', description: 'Name' },
    { name: 'role', description: 'Role on shift' },
    { name: 'date', description: 'Work date YYYY-MM-DD' },
    { name: 'clock_in', description: 'Start time HH:MM' },
    { name: 'clock_out', description: 'End time HH:MM or NULL' }
  ],
  sampleRowsSql: `SELECT * FROM shift_logs ORDER BY date, employee_id LIMIT 5;`
};

export const chapter1: Step[] = [
  {
    id: '1-1',
    title: 'The Night Ledger — Who was scheduled on fire date?',
    tools: ['SELECT', 'WHERE', 'ORDER BY'],
    challenge: 'The fire night doesn’t erase timecards.',
    plainRequest: 'Show everyone who worked on August 27, 2025. Include each person’s name, role, start time, and end time. Sort the list alphabetically by name.',
    dataPreview: [shiftPreview],
    expectedShape: [
      'Columns: employee_name, role, clock_in, clock_out',
      'Sorted by employee_name ASC'
    ],
    modelSql: `
SELECT employee_name, role, clock_in, clock_out
FROM shift_logs
WHERE date = '2025-08-27'
ORDER BY employee_name;
`.trim(),
    validator: makeStandardValidator(`
SELECT employee_name, role, clock_in, clock_out
FROM shift_logs
WHERE date = '2025-08-27'
ORDER BY employee_name;`.trim(), { enforceOrder: true }),
    reflection: 'A full roster turns chaos into a list. Lists become leads.',
    practices: [
      { prompt: 'Only show names and roles for 2025-08-27.', solutionSql: `SELECT employee_name, role FROM shift_logs WHERE date='2025-08-27' ORDER BY employee_name;` },
      { prompt: 'Show all rows on 2025-08-27, earliest clock_in first.', solutionSql: `SELECT * FROM shift_logs WHERE date='2025-08-27' ORDER BY clock_in ASC;` }
    ],
    caseNote: 'Rostered personnel for 2025-08-27 captured.',
    starterSql: `-- Translate the plain request into SQL.
SELECT * FROM shift_logs LIMIT 5;`,
    keywords: ['SELECT','FROM','WHERE','ORDER BY','ASC','DESC','AND','OR'],
    hints: [
      'Filter to the fire date only.',
      'Return columns: employee_name, role, clock_in, clock_out (in that order).',
      'Sort alphabetically by employee_name.'
    ]
  },
  {
    id: '1-2',
    title: 'Ghost Shift — Who left last?',
    tools: ['ORDER BY', 'DESC', 'LIMIT', 'WHERE'],
    challenge: 'The last light out tells a story.',
    plainRequest: 'On August 27, 2025, who left the latest? Show their name, role, and their clock-out time. Ignore people with no clock-out recorded.',
    dataPreview: [shiftPreview],
    expectedShape: [
      'Columns: employee_name, role, clock_out',
      'Single row: latest non-NULL clock_out on 2025-08-27'
    ],
    modelSql: `
SELECT employee_name, role, clock_out
FROM shift_logs
WHERE date = '2025-08-27' AND clock_out IS NOT NULL
ORDER BY clock_out DESC
LIMIT 1;
`.trim(),
    validator: makeStandardValidator(`
SELECT employee_name, role, clock_out
FROM shift_logs
WHERE date = '2025-08-27' AND clock_out IS NOT NULL
ORDER BY clock_out DESC
LIMIT 1;`.trim(), { enforceOrder: true }),
    reflection: 'Late departures shrink the haystack. Not proof—but direction.',
    practices: [
      { prompt: 'Show the top 3 latest departures across all dates.', solutionSql: `SELECT employee_name, date, clock_out FROM shift_logs WHERE clock_out IS NOT NULL ORDER BY clock_out DESC LIMIT 3;` },
      { prompt: 'For 2025-08-27, list everyone ordered by clock_out DESC.', solutionSql: `SELECT employee_name, role, clock_out FROM shift_logs WHERE date='2025-08-27' ORDER BY clock_out DESC;` }
    ],
    caseNote: 'Latest departure on 2025-08-27 identified.',
    starterSql: `-- Translate the plain request into SQL.
SELECT * FROM shift_logs WHERE date='2025-08-27' LIMIT 5;`,
    keywords: ['SELECT','FROM','WHERE','ORDER BY','DESC','LIMIT','IS NOT NULL'],
    hints: [
      'Filter by date and exclude NULL clock_out.',
      'Order by clock_out descending.',
      'Limit to a single row.'
    ]
  },
  {
    id: '1-3',
    title: 'Holes in the Tape — Who has no clock_out?',
    tools: ['IS NULL', 'WHERE', 'ORDER BY'],
    challenge: 'Missing timestamps are footprints.',
    plainRequest: 'List all shifts that never recorded an end time. Show the person’s name, role, start time, and the empty end time. Sort by date first, then by name.',
    dataPreview: [shiftPreview],
    expectedShape: [
      'Columns: employee_name, role, clock_in, clock_out',
      'Order by date, then employee_name'
    ],
    modelSql: `
SELECT employee_name, role, clock_in, clock_out
FROM shift_logs
WHERE clock_out IS NULL
ORDER BY date, employee_name;
`.trim(),
    validator: makeStandardValidator(`
SELECT employee_name, role, clock_in, clock_out
FROM shift_logs
WHERE clock_out IS NULL
ORDER BY date, employee_name;`.trim(), { enforceOrder: true }),
    reflection: 'Gaps in data aren’t empty—they’re loud.',
    practices: [
      { prompt: 'Only show missing clock_out on 2025-08-27.', solutionSql: `SELECT employee_name, role FROM shift_logs WHERE date='2025-08-27' AND clock_out IS NULL ORDER BY employee_name;` },
      { prompt: 'Count missing clock_out across the month.', solutionSql: `SELECT date, COUNT(*) AS missing FROM shift_logs WHERE clock_out IS NULL GROUP BY date ORDER BY date;` }
    ],
    caseNote: 'Flagged missing clock_out entries for follow-up.',
    starterSql: `-- Translate the plain request into SQL.
SELECT * FROM shift_logs WHERE clock_out IS NULL LIMIT 5;`,
    keywords: ['SELECT','FROM','WHERE','IS NULL','ORDER BY'],
    hints: [
      'Use IS NULL to find missing clock_out.',
      'Return columns: employee_name, role, clock_in, clock_out.',
      'Sort by date then by employee_name.'
    ]
  },
  {
    id: '1-4',
    title: 'After Hours — Who started after 20:00?',
    tools: ['>', 'WHERE', 'ORDER BY'],
    challenge: 'Night work narrows suspicion.',
    plainRequest: 'Show everyone who started after 8:00 PM, any day. Include name, role, and start time. Sort by start time from earliest to latest.',
    dataPreview: [shiftPreview],
    expectedShape: [
      'Columns: employee_name, role, clock_in',
      'Sort by clock_in ASC'
    ],
    modelSql: `
SELECT employee_name, role, clock_in
FROM shift_logs
WHERE clock_in > '20:00'
ORDER BY clock_in ASC;
`.trim(),
    validator: makeStandardValidator(`
SELECT employee_name, role, clock_in
FROM shift_logs
WHERE clock_in > '20:00'
ORDER BY clock_in ASC;`.trim(), { enforceOrder: true }),
    reflection: 'When the city sleeps, patterns wake.',
    practices: [
      { prompt: 'Who started at or after 21:00?', solutionSql: `SELECT employee_name, clock_in FROM shift_logs WHERE clock_in >= '21:00' ORDER BY clock_in;` }
    ],
    caseNote: 'Isolated after-hours starters.',
    starterSql: `-- Translate the plain request into SQL.
SELECT employee_name, role, clock_in
FROM shift_logs
WHERE clock_in > '20:00'
ORDER BY clock_in ASC;`,
    keywords: ['SELECT','FROM','WHERE','>','ORDER BY','ASC'],
    hints: [
      'Compare clock_in to a time threshold.',
      'Return employee_name, role, clock_in.',
      'Sort by clock_in ascending.'
    ]
  },
  {
    id: '1-5',
    title: 'First Shortlist — Combine simple filters',
    tools: ['SELECT', 'WHERE', 'ORDER BY', 'AND', 'OR', 'IS NOT NULL'],
    challenge: 'A shortlist isn’t proof—just a direction.',
    plainRequest: 'From the fire night only, list people who either started after 8:00 PM OR left at/after 11:00 PM (and have an end time). Show name, role, start and end times. Sort by start time from earliest to latest.',
    dataPreview: [shiftPreview],
    expectedShape: [
      'Columns: employee_name, role, clock_in, clock_out',
      "Filter: date='2025-08-27' AND (clock_in > '20:00' OR (clock_out IS NOT NULL AND clock_out >= '23:00'))",
      'Sorted by clock_in ASC'
    ],
    modelSql: `
SELECT employee_name, role, clock_in, clock_out
FROM shift_logs
WHERE date='2025-08-27'
  AND (clock_in > '20:00' OR (clock_out IS NOT NULL AND clock_out >= '23:00'))
ORDER BY clock_in ASC;
`.trim(),
    validator: makeStandardValidator(`
SELECT employee_name, role, clock_in, clock_out
FROM shift_logs
WHERE date='2025-08-27'
  AND (clock_in > '20:00' OR (clock_out IS NOT NULL AND clock_out >= '23:00'))
ORDER BY clock_in ASC;`.trim(), { enforceOrder: true }),
    reflection: 'Shortlists don’t solve cases. They tell you where to look next.',
    practices: [
      { prompt: 'Fire night: only late leavers (>= 23:00).', solutionSql: `SELECT employee_name, clock_out FROM shift_logs WHERE date='2025-08-27' AND clock_out >= '23:00' ORDER BY clock_out DESC;` },
      { prompt: 'Fire night: exclude missing clock_out.', solutionSql: `SELECT employee_name, role FROM shift_logs WHERE date='2025-08-27' AND clock_out IS NOT NULL ORDER BY employee_name;` }
    ],
    caseNote: 'Built first shortlist from fire-night outliers.',
    starterSql: `-- Translate the plain request into SQL.
SELECT * FROM shift_logs WHERE date='2025-08-27' LIMIT 5;`,
    keywords: ['SELECT','FROM','WHERE','AND','OR','IS NOT NULL','ORDER BY','ASC','>='],
    hints: [
      'Filter to the fire date.',
      'Include late starters or late leavers (two-part condition).',
      'Sort by clock_in ascending.'
    ]
  }
];
