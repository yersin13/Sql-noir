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

export const chapter5: Step[] = [
  {
    id: '5-1',
    title: 'Signal Bleed — Night window',
    tools: ['WHERE', 'OR', 'ORDER BY'],
    challenge: 'Signals smear at night; narrow the window.',
    plainRequest: 'Show shifts that either started at/after 10:00 PM or ended at/after 11:30 PM. Include name, date, start and end times. Sort by date then start time.',
    dataPreview: [shiftPreview],
    expectedShape: [
      'Columns: employee_name, date, clock_in, clock_out',
      "Filter: clock_in >= '22:00' OR (clock_out IS NOT NULL AND clock_out >= '23:30')",
      'Sorted by date ASC, clock_in ASC'
    ],
    modelSql: `
SELECT employee_name, date, clock_in, clock_out
FROM shift_logs
WHERE clock_in >= '22:00'
   OR (clock_out IS NOT NULL AND clock_out >= '23:30')
ORDER BY date ASC, clock_in ASC;
`.trim(),
    validator: makeStandardValidator(`
SELECT employee_name, date, clock_in, clock_out
FROM shift_logs
WHERE clock_in >= '22:00'
   OR (clock_out IS NOT NULL AND clock_out >= '23:30')
ORDER BY date ASC, clock_in ASC;`.trim(), { enforceOrder: true }),
    reflection: 'Time windows reduce noise when clocks disagree.',
    practices: [
      { prompt: 'Only end-late (>= 23:00).', solutionSql: `SELECT employee_name, date, clock_out FROM shift_logs WHERE clock_out IS NOT NULL AND clock_out >= '23:00' ORDER BY date, clock_out;` }
    ],
    caseNote: 'Isolated late-night window of interest.',
    starterSql: `-- Apply a night window filter.
SELECT employee_name, date, clock_in, clock_out
FROM shift_logs
-- WHERE ...
ORDER BY date, clock_in;`,
    keywords: ['SELECT','FROM','WHERE','OR','ORDER BY','IS NOT NULL','>='],
    hints: [
      'Use a two-part condition with OR.',
      'Remember to ignore NULL clock_out when comparing times.',
      'Sort by date then start time.'
    ]
  },
  {
    id: '5-2',
    title: 'Signal Bleed — “Possible overtime” flag',
    tools: ['CASE', 'SELECT', 'ORDER BY'],
    challenge: 'Sometimes the flag is all you need.',
    plainRequest: 'Add a column called possible_overtime that shows YES when a shift ended at 11:00 PM or later, otherwise NO. Show name, date, end time, and this flag. Sort by date then name.',
    dataPreview: [shiftPreview],
    expectedShape: [
      'Columns: employee_name, date, clock_out, possible_overtime',
      "possible_overtime: 'YES' if clock_out >= '23:00' else 'NO' (NULL stays NO)",
      'Sorted by date ASC, employee_name ASC'
    ],
    modelSql: `
SELECT employee_name, date, clock_out,
       CASE
         WHEN clock_out IS NOT NULL AND clock_out >= '23:00' THEN 'YES'
         ELSE 'NO'
       END AS possible_overtime
FROM shift_logs
ORDER BY date ASC, employee_name ASC;
`.trim(),
    validator: makeStandardValidator(`
SELECT employee_name, date, clock_out,
       CASE
         WHEN clock_out IS NOT NULL AND clock_out >= '23:00' THEN 'YES'
         ELSE 'NO'
       END AS possible_overtime
FROM shift_logs
ORDER BY date ASC, employee_name ASC;`.trim(), { enforceOrder: true }),
    reflection: 'Flags aren’t facts, but they triage attention.',
    practices: [
      { prompt: 'Flag late starters: YES if clock_in > 20:00.', solutionSql: `SELECT employee_name, date, clock_in, CASE WHEN clock_in > '20:00' THEN 'YES' ELSE 'NO' END AS late_start FROM shift_logs ORDER BY date, employee_name;` }
    ],
    caseNote: 'Derived a simple overtime flag for triage.',
    starterSql: `-- Derive a boolean-like flag via CASE.
SELECT employee_name, date, clock_out,
       CASE WHEN clock_out >= '23:00' THEN 'YES' ELSE 'NO' END AS possible_overtime
FROM shift_logs
ORDER BY date, employee_name;`,
    keywords: ['SELECT','CASE','WHEN','THEN','ELSE','END','ORDER BY'],
    hints: [
      'CASE WHEN condition THEN "YES" ELSE "NO" END.',
      'Compare times carefully; handle NULLs.',
      'Sort by date, then name.'
    ]
  }
];
