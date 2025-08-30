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
  sampleRowsSql: `SELECT * FROM shift_logs WHERE date='2025-08-27' ORDER BY employee_id LIMIT 5;`
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
  sampleRowsSql: `SELECT * FROM access_logs WHERE event_time LIKE '2025-08-27%' ORDER BY event_time LIMIT 5;`
};

const posPreview: TablePreview = {
  name: 'pos_sessions',
  description: 'Point-of-sale login sessions.',
  columns: [
    { name: 'employee_id', description: 'ID' },
    { name: 'login_time', description: 'YYYY-MM-DD HH:MM' },
    { name: 'logout_time', description: 'YYYY-MM-DD HH:MM' }
  ],
  sampleRowsSql: `SELECT * FROM pos_sessions ORDER BY login_time LIMIT 5;`
};

export const finale: Step[] = [
  {
    id: 'F-1',
    title: 'The Reckoning — Cross-system presence',
    tools: ['CTE', 'JOIN', 'DISTINCT', 'ORDER BY'],
    challenge: 'Three systems, one night. Who shows up in all of them?',
    plainRequest: 'For August 27, 2025, list the people who appear in all three systems: they had a shift, they opened a door, and they logged into POS. Return id and name, sorted by id.',
    dataPreview: [shiftPreview, accessPreview, posPreview],
    expectedShape: [
      'Columns: employee_id, employee_name',
      'Appear in: shift_logs (date=2025-08-27), access_logs (same day), pos_sessions (same day)',
      'Sorted by employee_id ASC'
    ],
    modelSql: `
WITH fire_shifts AS (
  SELECT DISTINCT employee_id, employee_name
  FROM shift_logs
  WHERE date = '2025-08-27'
),
door AS (
  SELECT DISTINCT employee_id
  FROM access_logs
  WHERE substr(event_time,1,10) = '2025-08-27'
),
pos AS (
  SELECT DISTINCT employee_id
  FROM pos_sessions
  WHERE substr(login_time,1,10) = '2025-08-27'
)
SELECT s.employee_id, s.employee_name
FROM fire_shifts s
JOIN door d ON d.employee_id = s.employee_id
JOIN pos p  ON p.employee_id = s.employee_id
ORDER BY s.employee_id;
`.trim(),
    validator: makeStandardValidator(`
WITH fire_shifts AS (
  SELECT DISTINCT employee_id, employee_name
  FROM shift_logs
  WHERE date = '2025-08-27'
),
door AS (
  SELECT DISTINCT employee_id
  FROM access_logs
  WHERE substr(event_time,1,10) = '2025-08-27'
),
pos AS (
  SELECT DISTINCT employee_id
  FROM pos_sessions
  WHERE substr(login_time,1,10) = '2025-08-27'
)
SELECT s.employee_id, s.employee_name
FROM fire_shifts s
JOIN door d ON d.employee_id = s.employee_id
JOIN pos p  ON p.employee_id = s.employee_id
ORDER BY s.employee_id;`.trim(), { enforceOrder: true }),
    reflection: 'Independent trails converging is how hunch hardens into proof.',
    practices: [
      { prompt: 'Show employees on fire night who had *shifts + door* but no POS.', solutionSql: `WITH fire_shifts AS (SELECT DISTINCT employee_id, employee_name FROM shift_logs WHERE date='2025-08-27'), door AS (SELECT DISTINCT employee_id FROM access_logs WHERE substr(event_time,1,10)='2025-08-27') SELECT s.employee_id, s.employee_name FROM fire_shifts s JOIN door d ON d.employee_id=s.employee_id WHERE NOT EXISTS (SELECT 1 FROM pos_sessions p WHERE substr(p.login_time,1,10)='2025-08-27' AND p.employee_id=s.employee_id) ORDER BY s.employee_id;` }
    ],
    caseNote: 'Intersected shifts, doors, and POS to isolate cross-system presence.',
    starterSql: `-- Build CTEs for each system, then intersect.
WITH fire_shifts AS (SELECT DISTINCT employee_id, employee_name FROM shift_logs WHERE date='2025-08-27'),
door AS (SELECT DISTINCT employee_id FROM access_logs WHERE substr(event_time,1,10)='2025-08-27'),
pos  AS (SELECT DISTINCT employee_id FROM pos_sessions WHERE substr(login_time,1,10)='2025-08-27')
SELECT s.employee_id, s.employee_name
FROM fire_shifts s
JOIN door d ON d.employee_id=s.employee_id
JOIN pos p  ON p.employee_id=s.employee_id
ORDER BY s.employee_id;`,
    keywords: ['WITH','SELECT','JOIN','DISTINCT','ORDER BY','substr'],
    hints: [
      'Create three CTEs for each system’s presence on the fire date.',
      'Join on employee_id across the CTEs.',
      'Sort by id.'
    ]
  }
];
