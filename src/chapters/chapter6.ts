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
  description: 'Shifts (roster + times)',
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
  description: 'Door events',
  columns: [
    { name: 'employee_id', description: 'ID' },
    { name: 'event_time', description: 'YYYY-MM-DD HH:MM' },
    { name: 'action', description: 'OPEN/DENY' },
    { name: 'door', description: 'Door name' }
  ],
  sampleRowsSql: `SELECT * FROM access_logs ORDER BY event_time LIMIT 5;`
};

const claimsPreview: TablePreview = {
  name: 'insurance_claims',
  description: 'Insurance claims (filed/submitted).',
  columns: [
    { name: 'business', description: 'Business name' },
    { name: 'claim_id', description: 'Claim id' },
    { name: 'created_at', description: 'YYYY-MM-DD' },
    { name: 'submitted_at', description: 'YYYY-MM-DD' },
    { name: 'amount', description: 'Numeric' },
    { name: 'prepared_by', description: 'Preparer name' }
  ],
  sampleRowsSql: `SELECT * FROM insurance_claims ORDER BY created_at LIMIT 5;`
};

export const chapter6: Step[] = [
  {
    id: '6-1',
    title: 'False Mirror — Shifts without door proof (NOT EXISTS)',
    tools: ['NOT EXISTS', 'ORDER BY'],
    challenge: 'Mirrors lie; cross-systems don’t.',
    plainRequest: 'On August 27, 2025, show shifts that have no door events that day for the same person. Return id, name, date. Sort by id.',
    dataPreview: [shiftPreview, accessPreview],
    expectedShape: [
      'Columns: employee_id, employee_name, date',
      'NOT EXISTS same-day door event for that employee',
      'Order by employee_id'
    ],
    modelSql: `
SELECT s.employee_id, s.employee_name, s.date
FROM shift_logs s
WHERE s.date = '2025-08-27'
  AND NOT EXISTS (
    SELECT 1
    FROM access_logs a
    WHERE a.employee_id = s.employee_id
      AND substr(a.event_time,1,10) = s.date
  )
ORDER BY s.employee_id;
`.trim(),
    validator: makeStandardValidator(`
SELECT s.employee_id, s.employee_name, s.date
FROM shift_logs s
WHERE s.date = '2025-08-27'
  AND NOT EXISTS (
    SELECT 1
    FROM access_logs a
    WHERE a.employee_id = s.employee_id
      AND substr(a.event_time,1,10) = s.date
  )
ORDER BY s.employee_id;`.trim(), { enforceOrder: true }),
    reflection: 'Absence in a system that should see you is a tell.',
    practices: [
      { prompt: 'Across all dates: shifts with no same-day door record (limit 10).', solutionSql: `SELECT s.employee_id, s.employee_name, s.date FROM shift_logs s WHERE NOT EXISTS (SELECT 1 FROM access_logs a WHERE a.employee_id=s.employee_id AND substr(a.event_time,1,10)=s.date) ORDER BY s.date, s.employee_id LIMIT 10;` }
    ],
    caseNote: 'Found shifts unbacked by door events.',
    starterSql: `-- Use NOT EXISTS to negate a same-day match.
SELECT s.employee_id, s.employee_name, s.date
FROM shift_logs s
WHERE s.date = '2025-08-27'
  AND NOT EXISTS (SELECT 1 FROM access_logs a WHERE a.employee_id=s.employee_id AND substr(a.event_time,1,10)=s.date)
ORDER BY s.employee_id;`,
    keywords: ['SELECT','NOT EXISTS','ORDER BY','substr'],
    hints: [
      'Target the fire date in the outer query.',
      'Match on employee_id and day inside NOT EXISTS.',
      'Sort by employee_id.'
    ]
  },
  {
    id: '6-2',
    title: 'False Mirror — Preparer not on staff (NOT EXISTS)',
    tools: ['NOT EXISTS', 'EXISTS', 'ORDER BY'],
    challenge: 'Paperwork signed by ghosts.',
    plainRequest: 'List claim_id and prepared_by for claims where the preparer’s name does not appear in the staff list (shift_logs). Sort by claim_id.',
    dataPreview: [claimsPreview, shiftPreview],
    expectedShape: [
      'Columns: claim_id, prepared_by',
      'Exclude any prepared_by that appears as employee_name in shift_logs',
      'Order by claim_id'
    ],
    modelSql: `
SELECT c.claim_id, c.prepared_by
FROM insurance_claims c
WHERE NOT EXISTS (
  SELECT 1 FROM shift_logs s
  WHERE s.employee_name = c.prepared_by
)
ORDER BY c.claim_id;
`.trim(),
    validator: makeStandardValidator(`
SELECT c.claim_id, c.prepared_by
FROM insurance_claims c
WHERE NOT EXISTS (
  SELECT 1 FROM shift_logs s
  WHERE s.employee_name = c.prepared_by
)
ORDER BY c.claim_id;`.trim(), { enforceOrder: true }),
    reflection: 'Names that don’t connect are either contractors—or cover.',
    practices: [
      { prompt: 'Claims prepared by staff only.', solutionSql: `SELECT c.claim_id, c.prepared_by FROM insurance_claims c WHERE EXISTS (SELECT 1 FROM shift_logs s WHERE s.employee_name=c.prepared_by) ORDER BY c.claim_id;` }
    ],
    caseNote: 'Flagged claims with non-staff preparers.',
    starterSql: `-- Compare names across tables using (NOT) EXISTS.
SELECT claim_id, prepared_by
FROM insurance_claims
-- WHERE ...
ORDER BY claim_id;`,
    keywords: ['SELECT','NOT EXISTS','EXISTS','ORDER BY'],
    hints: [
      'Use a subquery that looks up the name in shift_logs.',
      'Invert it with NOT EXISTS.',
      'Sort by claim_id.'
    ]
  }
];
