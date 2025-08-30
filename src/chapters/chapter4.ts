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

export const chapter4: Step[] = [
  {
    id: '4-1',
    title: 'Paper Crown — First door-in per shift',
    tools: ['JOIN', 'GROUP BY', 'MIN', 'HAVING', 'ORDER BY'],
    challenge: 'Crowns are paper when timing collapses.',
    plainRequest: 'For each person and day, show the earliest door event time that day. Only include days where the person had at least one door event. Return id, name, date, first_door_time.',
    dataPreview: [shiftPreview, accessPreview],
    expectedShape: [
      'Columns: employee_id, employee_name, date, first_door_time',
      'Join shifts to same-day access logs',
      'Group by employee and date; MIN(event_time) per group',
      'Sorted by date, employee_id'
    ],
    modelSql: `
SELECT s.employee_id, s.employee_name, s.date,
       MIN(a.event_time) AS first_door_time
FROM shift_logs s
JOIN access_logs a
  ON a.employee_id = s.employee_id
 AND substr(a.event_time,1,10) = s.date
GROUP BY s.employee_id, s.employee_name, s.date
HAVING COUNT(a.event_time) >= 1
ORDER BY s.date, s.employee_id;
`.trim(),
    validator: makeStandardValidator(`
SELECT s.employee_id, s.employee_name, s.date,
       MIN(a.event_time) AS first_door_time
FROM shift_logs s
JOIN access_logs a
  ON a.employee_id = s.employee_id
 AND substr(a.event_time,1,10) = s.date
GROUP BY s.employee_id, s.employee_name, s.date
HAVING COUNT(a.event_time) >= 1
ORDER BY s.date, s.employee_id;`.trim(), { enforceOrder: true }),
    reflection: 'First access versus schedule exposes who really opened the floor.',
    practices: [
      { prompt: 'Replace MIN with MAX for last door event per day.', solutionSql: `SELECT s.employee_id, s.employee_name, s.date, MAX(a.event_time) AS last_door_time FROM shift_logs s JOIN access_logs a ON a.employee_id=s.employee_id AND substr(a.event_time,1,10)=s.date GROUP BY s.employee_id, s.employee_name, s.date ORDER BY s.date, s.employee_id;` }
    ],
    caseNote: 'Computed first same-day door event per shift.',
    starterSql: `-- MIN() + GROUP BY over a join.
SELECT s.employee_id, s.employee_name, s.date, MIN(a.event_time) AS first_door_time
FROM shift_logs s
JOIN access_logs a ON a.employee_id = s.employee_id AND substr(a.event_time,1,10)=s.date
GROUP BY s.employee_id, s.employee_name, s.date
HAVING COUNT(a.event_time) >= 1
ORDER BY s.date, s.employee_id;`,
    keywords: ['SELECT','JOIN','GROUP BY','MIN','HAVING','ORDER BY'],
    hints: [
      'Join by employee and day (substr(event_time,1,10)=date).',
      'Use MIN(event_time) per group.',
      'HAVING ensures at least one event exists.'
    ]
  },
  {
    id: '4-2',
    title: 'Paper Crown — Door volume per person per day',
    tools: ['JOIN', 'GROUP BY', 'COUNT', 'ORDER BY', 'HAVING'],
    challenge: 'Volume can be routine—or noise.',
    plainRequest: 'Count door events per person per day. Only show days with at least one event. Return date, name, and the count. Sort by the count (high to low), then by date and name.',
    dataPreview: [shiftPreview, accessPreview],
    expectedShape: [
      'Columns: date, employee_name, door_events',
      'door_events = COUNT(a.*) per employee/day',
      'HAVING COUNT >= 1',
      'Sorted by door_events DESC, date ASC, employee_name ASC'
    ],
    modelSql: `
SELECT s.date, s.employee_name,
       COUNT(a.event_time) AS door_events
FROM shift_logs s
JOIN access_logs a
  ON a.employee_id = s.employee_id
 AND substr(a.event_time,1,10) = s.date
GROUP BY s.date, s.employee_name
HAVING COUNT(a.event_time) >= 1
ORDER BY door_events DESC, s.date ASC, s.employee_name ASC;
`.trim(),
    validator: makeStandardValidator(`
SELECT s.date, s.employee_name,
       COUNT(a.event_time) AS door_events
FROM shift_logs s
JOIN access_logs a
  ON a.employee_id = s.employee_id
 AND substr(a.event_time,1,10) = s.date
GROUP BY s.date, s.employee_name
HAVING COUNT(a.event_time) >= 1
ORDER BY door_events DESC, s.date ASC, s.employee_name ASC;`.trim(), { enforceOrder: true }),
    reflection: 'High access activity may be workload—or wandering.',
    practices: [
      { prompt: 'Same, but only the fire date.', solutionSql: `SELECT s.date, s.employee_name, COUNT(a.event_time) AS door_events FROM shift_logs s JOIN access_logs a ON a.employee_id=s.employee_id AND substr(a.event_time,1,10)=s.date WHERE s.date='2025-08-27' GROUP BY s.date, s.employee_name ORDER BY door_events DESC, s.employee_name;` }
    ],
    caseNote: 'Tallied door event counts by person/day.',
    starterSql: `-- COUNT over JOIN with HAVING.
SELECT s.date, s.employee_name, COUNT(a.event_time) AS door_events
FROM shift_logs s
JOIN access_logs a ON a.employee_id=s.employee_id AND substr(a.event_time,1,10)=s.date
GROUP BY s.date, s.employee_name
HAVING COUNT(a.event_time) >= 1
ORDER BY door_events DESC, s.date, s.employee_name;`,
    keywords: ['SELECT','JOIN','COUNT','GROUP BY','HAVING','ORDER BY'],
    hints: [
      'Count access events per employee/day.',
      'HAVING filters grouped results.',
      'Sort by count DESC.'
    ]
  }
];
