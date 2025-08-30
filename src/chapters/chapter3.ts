import type { Database } from 'sql.js';
import type { Step, TablePreview } from '../components/StepCard';
import type { QueryResult } from '../components/ResultTable';

function execQuery(db: Database, sql: string): QueryResult {
  const res = db.exec(sql);
  if (!res || res.length === 0) return { columns: [], rows: [] };
  return { columns: res[0].columns, rows: res[0].values as any[][] };
}
export function makeStandardValidator(modelSql: string, opts?: { enforceOrder?: boolean }) {
  const enforceOrder = opts?.enforceOrder ?? true;
  return async (db: Database, user: QueryResult | null) => {
    if (!user) return { ok: false, hint: 'Run your SQL first.' };
    let model: QueryResult;
    try { model = execQuery(db, modelSql); } catch { return { ok: false, hint: 'Internal model failed.' }; }
    const colsMatch = JSON.stringify(user.columns) === JSON.stringify(model.columns);
    if (!colsMatch) return { ok: false, hint: 'Columns mismatch. Check names/order.' };
    if (user.rows.length !== model.rows.length) return { ok: false, hint: `Row count should be ${model.rows.length}.` };
    const A = enforceOrder ? user.rows : [...user.rows].sort();
    const B = enforceOrder ? model.rows : [...model.rows].sort();
    for (let i = 0; i < A.length; i++) {
      if (A[i].length !== B[i].length) return { ok: false, hint: 'Row shape mismatch.' };
      for (let j = 0; j < A[i].length; j++) if (A[i][j] !== B[i][j]) return { ok: false, hint: 'Ordering or values differ.' };
    }
    return { ok: true };
  };
}

const shiftPreview: TablePreview = {
  name: 'shift_logs',
  description: 'Shifts (roster + times).',
  columns: [
    { name: 'employee_id', description: 'ID' },
    { name: 'employee_name', description: 'Name' },
    { name: 'role', description: 'Role' },
    { name: 'date', description: 'YYYY-MM-DD' },
    { name: 'clock_in', description: 'HH:MM' },
    { name: 'clock_out', description: 'HH:MM or NULL' }
  ],
  sampleRowsSql: `SELECT * FROM shift_logs ORDER BY date, employee_id LIMIT 5;`
};

const accessPreview: TablePreview = {
  name: 'access_logs',
  description: 'Door events for secure doors.',
  columns: [
    { name: 'employee_id', description: 'ID' },
    { name: 'event_time', description: 'YYYY-MM-DD HH:MM' },
    { name: 'action', description: 'e.g., OPEN, DENY' },
    { name: 'door', description: 'Door name' }
  ],
  sampleRowsSql: `SELECT * FROM access_logs ORDER BY event_time LIMIT 5;`
};

export const chapter3: Step[] = [
  {
    id: '3-1',
    title: 'Cross-check — Shifts vs Door entries (INNER JOIN)',
    tools: ['JOIN', 'aliases', 'ORDER BY', 'LIMIT'],
    challenge: 'Paper logs say one thing; doors keep their own truth.',
    plainRequest: 'For each shift, find matching door events that happened the same day for the same person. Show id, name, date, clock_in, event_time, door. Limit to 5 rows.',
    dataPreview: [shiftPreview, accessPreview],
    expectedShape: [
      'Columns: employee_id, employee_name, date, clock_in, event_time, door',
      "Join on employee_id and same day (event_time starting with date)",
      'Order by employee_id then event_time, limit 5'
    ],
    modelSql: `
SELECT s.employee_id, s.employee_name, s.date, s.clock_in, a.event_time, a.door
FROM shift_logs s
JOIN access_logs a
  ON a.employee_id = s.employee_id
 AND substr(a.event_time,1,10) = s.date
ORDER BY s.employee_id, a.event_time
LIMIT 5;
`.trim(),
    validator: makeStandardValidator(`
SELECT s.employee_id, s.employee_name, s.date, s.clock_in, a.event_time, a.door
FROM shift_logs s
JOIN access_logs a
  ON a.employee_id = s.employee_id
 AND substr(a.event_time,1,10) = s.date
ORDER BY s.employee_id, a.event_time
LIMIT 5;`.trim(), { enforceOrder: true }),
    reflection: 'Corroboration is currency. Shifts that exist in both systems are harder to dispute.',
    practices: [
      { prompt: 'Same join, but only the fire date.', solutionSql: `SELECT s.employee_id, s.employee_name, s.date, s.clock_in, a.event_time, a.door FROM shift_logs s JOIN access_logs a ON a.employee_id=s.employee_id AND substr(a.event_time,1,10)=s.date WHERE s.date='2025-08-27' ORDER BY a.event_time LIMIT 5;` }
    ],
    caseNote: 'Set up cross-checks between shifts and door logs.',
    starterSql: `-- INNER JOIN shifts to door events by employee and day.
SELECT s.employee_id, s.employee_name, s.date, s.clock_in, a.event_time, a.door
FROM shift_logs s
JOIN access_logs a ON a.employee_id = s.employee_id AND substr(a.event_time,1,10) = s.date
ORDER BY s.employee_id, a.event_time
LIMIT 5;`,
    keywords: ['SELECT','FROM','JOIN','ON','ORDER BY','LIMIT','aliases'],
    hints: [
      'Alias the tables (s for shifts, a for access).',
      'Join on employee_id and matching date (substr(event_time,1,10)=date).',
      'Order and limit as requested.'
    ]
  },
  {
    id: '3-2',
    title: 'Cross-check — Shifts with no door entry (LEFT JOIN)',
    tools: ['LEFT JOIN', 'IS NULL', 'WHERE', 'ORDER BY'],
    challenge: 'What’s missing matters.',
    plainRequest: 'List shifts on Aug 27, 2025 that have no matching door event that day for the same person. Show id, name, date, clock_in. Sort by name.',
    dataPreview: [shiftPreview, accessPreview],
    expectedShape: [
      'Columns: employee_id, employee_name, date, clock_in',
      'LEFT JOIN access_logs; filter rows where no match (a.employee_id IS NULL)',
      'Order by employee_name ASC'
    ],
    modelSql: `
SELECT s.employee_id, s.employee_name, s.date, s.clock_in
FROM shift_logs s
LEFT JOIN access_logs a
  ON a.employee_id = s.employee_id
 AND substr(a.event_time,1,10) = s.date
WHERE s.date = '2025-08-27' AND a.employee_id IS NULL
ORDER BY s.employee_name ASC;
`.trim(),
    validator: makeStandardValidator(`
SELECT s.employee_id, s.employee_name, s.date, s.clock_in
FROM shift_logs s
LEFT JOIN access_logs a
  ON a.employee_id = s.employee_id
 AND substr(a.event_time,1,10) = s.date
WHERE s.date = '2025-08-27' AND a.employee_id IS NULL
ORDER BY s.employee_name ASC;`.trim(), { enforceOrder: true }),
    reflection: 'Absence of evidence is a lead when evidence should exist.',
    practices: [
      { prompt: 'Across all dates: shifts without *any* same-day door entry (limit 10).', solutionSql: `SELECT s.employee_id, s.employee_name, s.date, s.clock_in FROM shift_logs s LEFT JOIN access_logs a ON a.employee_id=s.employee_id AND substr(a.event_time,1,10)=s.date WHERE a.employee_id IS NULL ORDER BY s.date, s.employee_name LIMIT 10;` }
    ],
    caseNote: 'Identified shifts missing corroborating door events.',
    starterSql: `-- LEFT JOIN to access_logs, keep rows where a match is missing.
SELECT s.employee_id, s.employee_name, s.date, s.clock_in
FROM shift_logs s
LEFT JOIN access_logs a ON a.employee_id = s.employee_id AND substr(a.event_time,1,10) = s.date
WHERE s.date='2025-08-27' AND a.employee_id IS NULL
ORDER BY s.employee_name;`,
    keywords: ['SELECT','FROM','LEFT JOIN','ON','IS NULL','WHERE','ORDER BY'],
    hints: [
      'LEFT JOIN and then filter where the right side is NULL.',
      'Match on employee_id and same day.',
      'Sort by name.'
    ]
  }
];
