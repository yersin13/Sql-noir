import type { Database } from 'sql.js';
import type { Step, TablePreview } from '../components/StepCard';
import type { QueryResult } from '../components/ResultTable';
import { makeStandardValidator } from './chapter1';

function execQuery(db: Database, sql: string): QueryResult {
  const res = db.exec(sql);
  if (!res || res.length === 0) return { columns: [], rows: [] };
  return { columns: res[0].columns, rows: res[0].values as any[][] };
}

const shiftPreview: TablePreview = {
  name: 'shift_logs',
  description: 'We’ll stay on a single table while introducing aggregates.',
  columns: [
    { name: 'employee_id', description: 'Numeric employee id' },
    { name: 'employee_name', description: 'Name' },
    { name: 'role', description: 'Role on shift' },
    { name: 'date', description: 'Work date YYYY-MM-DD' },
    { name: 'clock_in', description: 'Start time HH:MM' },
    { name: 'clock_out', description: 'End time HH:MM or NULL' }
  ],
  sampleRowsSql: `SELECT * FROM shift_logs ORDER BY date DESC, employee_id LIMIT 5;`
};

export const chapter2: Step[] = [
  {
    id: '2-1',
    title: 'Late Nights — count per employee (last 30 days)',
    tools: ['COUNT(*)', 'GROUP BY', 'WHERE'],
    challenge: 'Who burns the midnight oil? Count shifts with clock_out ≥ 23:00 in the last 30 days.',
    dataPreview: [shiftPreview],
    expectedShape: [
      'Columns: employee_name, late_nights',
      'Sort by late_nights DESC, then employee_name ASC'
    ],
    modelSql: `
SELECT employee_name, COUNT(*) AS late_nights
FROM shift_logs
WHERE date BETWEEN '2025-07-29' AND '2025-08-27'
  AND clock_out >= '23:00'
GROUP BY employee_name
ORDER BY late_nights DESC, employee_name ASC;
`.trim(),
    validator: makeStandardValidator(`
SELECT employee_name, COUNT(*) AS late_nights
FROM shift_logs
WHERE date BETWEEN '2025-07-29' AND '2025-08-27'
  AND clock_out >= '23:00'
GROUP BY employee_name
ORDER BY late_nights DESC, employee_name ASC;`.trim(), { enforceOrder: true }),
    reflection: 'Volume reveals habit. Habit sets expectations; deviations break them.',
    practices: [
      { prompt: 'Count late_nights for August only.', solutionSql: `SELECT employee_name, COUNT(*) AS late_nights FROM shift_logs WHERE date LIKE '2025-08-%' AND clock_out >= '23:00' GROUP BY employee_name ORDER BY late_nights DESC, employee_name;` }
    ],
    caseNote: 'Profiled late-night propensity per employee.'
  },
  {
    id: '2-2',
    title: 'Average clock-out hour per employee',
    tools: ['AVG()', 'GROUP BY', 'printf() formatting'],
    challenge: 'What’s “normal” for each person? Compute average clock_out time.',
    dataPreview: [shiftPreview],
    expectedShape: [
      'Columns: employee_name, avg_clock_out',
      'avg_clock_out formatted HH:MM, exclude NULL clock_out'
    ],
    modelSql: `
SELECT employee_name,
       printf('%02d:%02d',
         CAST(avg_mins/60 AS INT),
         CAST(avg_mins%60 AS INT)
       ) AS avg_clock_out
FROM (
  SELECT employee_name,
         AVG(CAST(substr(clock_out,1,2) AS INT)*60 + CAST(substr(clock_out,4,2) AS INT)) AS avg_mins
  FROM shift_logs
  WHERE clock_out IS NOT NULL
  GROUP BY employee_name
)
ORDER BY employee_name;
`.trim(),
    validator: makeStandardValidator(`
SELECT employee_name,
       printf('%02d:%02d',
         CAST(avg_mins/60 AS INT),
         CAST(avg_mins%60 AS INT)
       ) AS avg_clock_out
FROM (
  SELECT employee_name,
         AVG(CAST(substr(clock_out,1,2) AS INT)*60 + CAST(substr(clock_out,4,2) AS INT)) AS avg_mins
  FROM shift_logs
  WHERE clock_out IS NOT NULL
  GROUP BY employee_name
)
ORDER BY employee_name;`.trim(), { enforceOrder: true }),
    reflection: 'Know the baseline to recognize the anomaly.',
    practices: [
      { prompt: 'Return average in minutes (number).', solutionSql: `SELECT employee_name, ROUND(AVG(CAST(substr(clock_out,1,2) AS INT)*60 + CAST(substr(clock_out,4,2) AS INT)),1) AS avg_minutes FROM shift_logs WHERE clock_out IS NOT NULL GROUP BY employee_name ORDER BY employee_name;` }
    ],
    caseNote: 'Computed baseline exit times per employee.'
  },
  {
    id: '2-3',
    title: 'Fire-night vs personal average (simple subquery)',
    tools: ['Subquery in SELECT', 'AVG()', 'comparisons'],
    challenge: 'On 2025-08-27, did anyone clock out later than their personal average (before that date)?',
    dataPreview: [shiftPreview],
    expectedShape: [
      'Columns: employee_name, fire_clock_out, avg_before_mins, delta_minutes',
      'Only employees with non-NULL fire_clock_out'
    ],
    modelSql: `
SELECT s.employee_name,
       s.clock_out AS fire_clock_out,
       ROUND((
         SELECT AVG(CAST(substr(clock_out,1,2) AS INT)*60 + CAST(substr(clock_out,4,2) AS INT))
         FROM shift_logs
         WHERE employee_name = s.employee_name
           AND date < '2025-08-27'
           AND clock_out IS NOT NULL
       ), 1) AS avg_before_mins,
       (CAST(substr(s.clock_out,1,2) AS INT)*60 + CAST(substr(s.clock_out,4,2) AS INT)) -
       (
         SELECT AVG(CAST(substr(clock_out,1,2) AS INT)*60 + CAST(substr(clock_out,4,2) AS INT))
         FROM shift_logs
         WHERE employee_name = s.employee_name
           AND date < '2025-08-27'
           AND clock_out IS NOT NULL
       ) AS delta_minutes
FROM shift_logs s
WHERE s.date = '2025-08-27' AND s.clock_out IS NOT NULL
ORDER BY s.employee_name;
`.trim(),
    validator: makeStandardValidator(`
SELECT s.employee_name,
       s.clock_out AS fire_clock_out,
       ROUND((
         SELECT AVG(CAST(substr(clock_out,1,2) AS INT)*60 + CAST(substr(clock_out,4,2) AS INT))
         FROM shift_logs
         WHERE employee_name = s.employee_name
           AND date < '2025-08-27'
           AND clock_out IS NOT NULL
       ), 1) AS avg_before_mins,
       (CAST(substr(s.clock_out,1,2) AS INT)*60 + CAST(substr(s.clock_out,4,2) AS INT)) -
       (
         SELECT AVG(CAST(substr(clock_out,1,2) AS INT)*60 + CAST(substr(clock_out,4,2) AS INT))
         FROM shift_logs
         WHERE employee_name = s.employee_name
           AND date < '2025-08-27'
           AND clock_out IS NOT NULL
       ) AS delta_minutes
FROM shift_logs s
WHERE s.date = '2025-08-27' AND s.clock_out IS NOT NULL
ORDER BY s.employee_name;`.trim(), { enforceOrder: true }),
    reflection: 'A spike against baseline is a whisper. Enough whispers become a voice.',
    practices: [
      { prompt: 'Return only those with delta_minutes ≥ 10.', solutionSql: `SELECT * FROM ( /* same as above */ SELECT s.employee_name AS employee_name, s.clock_out AS fire_clock_out, ROUND((SELECT AVG(CAST(substr(clock_out,1,2) AS INT)*60 + CAST(substr(clock_out,4,2) AS INT)) FROM shift_logs WHERE employee_name = s.employee_name AND date < '2025-08-27' AND clock_out IS NOT NULL),1) AS avg_before_mins, (CAST(substr(s.clock_out,1,2) AS INT)*60 + CAST(substr(s.clock_out,4,2) AS INT)) - (SELECT AVG(CAST(substr(clock_out,1,2) AS INT)*60 + CAST(substr(clock_out,4,2) AS INT)) FROM shift_logs WHERE employee_name = s.employee_name AND date < '2025-08-27' AND clock_out IS NOT NULL) AS delta_minutes FROM shift_logs s WHERE s.date='2025-08-27' AND s.clock_out IS NOT NULL) WHERE delta_minutes >= 10 ORDER BY employee_name;` }
    ],
    caseNote: 'Measured fire-night exits vs personal averages.'
  },
  {
    id: '2-4',
    title: 'Range feel — earliest/latest leave per employee',
    tools: ['MIN()', 'MAX()', 'GROUP BY'],
    challenge: 'Bookends of behavior. Get earliest and latest clock_out per person (ignoring NULLs).',
    dataPreview: [shiftPreview],
    expectedShape: [
      'Columns: employee_name, earliest_out, latest_out',
      'Sorted by employee_name'
    ],
    modelSql: `
SELECT employee_name,
       MIN(clock_out) AS earliest_out,
       MAX(clock_out) AS latest_out
FROM shift_logs
WHERE clock_out IS NOT NULL
GROUP BY employee_name
ORDER BY employee_name;
`.trim(),
    validator: makeStandardValidator(`
SELECT employee_name,
       MIN(clock_out) AS earliest_out,
       MAX(clock_out) AS latest_out
FROM shift_logs
WHERE clock_out IS NOT NULL
GROUP BY employee_name
ORDER BY employee_name;`.trim(), { enforceOrder: true }),
    reflection: 'Ranges put single points in context.',
    practices: [
      { prompt: 'Also include shift count.', solutionSql: `SELECT employee_name, COUNT(*) AS shifts, MIN(clock_out) AS earliest_out, MAX(clock_out) AS latest_out FROM shift_logs WHERE clock_out IS NOT NULL GROUP BY employee_name ORDER BY shifts DESC, employee_name;` }
    ],
    caseNote: 'Computed leave-time ranges per employee.'
  },
  {
    id: '2-5',
    title: 'Practice Pack — aggregates in the wild',
    tools: ['COUNT', 'MIN', 'MAX', 'GROUP BY', 'HAVING (light)'],
    challenge: 'Build a quick multi-metric glance at recent workload.',
    dataPreview: [shiftPreview],
    expectedShape: [
      'Columns: employee_name, shifts, earliest_in, latest_out',
      'Dates between 2025-08-01 and 2025-08-27 inclusive',
      'HAVING shifts ≥ 2'
    ],
    modelSql: `
SELECT employee_name,
       COUNT(*) AS shifts,
       MIN(clock_in) AS earliest_in,
       MAX(clock_out) AS latest_out
FROM shift_logs
WHERE date BETWEEN '2025-08-01' AND '2025-08-27'
GROUP BY employee_name
HAVING COUNT(*) >= 2
ORDER BY shifts DESC, employee_name;
`.trim(),
    validator: makeStandardValidator(`
SELECT employee_name,
       COUNT(*) AS shifts,
       MIN(clock_in) AS earliest_in,
       MAX(clock_out) AS latest_out
FROM shift_logs
WHERE date BETWEEN '2025-08-01' AND '2025-08-27'
GROUP BY employee_name
HAVING COUNT(*) >= 2
ORDER BY shifts DESC, employee_name;`.trim(), { enforceOrder: true }),
    reflection: 'A dashboard isn’t a smoking gun—just a compass that points true north.',
    practices: [
      { prompt: 'Same query but only show people with latest_out ≥ 23:30.', solutionSql: `SELECT employee_name, COUNT(*) AS shifts, MIN(clock_in) AS earliest_in, MAX(clock_out) AS latest_out FROM shift_logs WHERE date BETWEEN '2025-08-01' AND '2025-08-27' GROUP BY employee_name HAVING COUNT(*) >= 2 AND MAX(clock_out) >= '23:30' ORDER BY shifts DESC, employee_name;` },
      { prompt: 'Count of shifts per role.', solutionSql: `SELECT role, COUNT(*) AS shifts FROM shift_logs GROUP BY role ORDER BY shifts DESC, role;` }
    ],
    caseNote: 'Aggregated recent workload snapshot.'
  }
];
