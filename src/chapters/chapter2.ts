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

export const chapter2: Step[] = [
  {
    id: '2-1',
    title: 'Late Nights — Count per employee',
    tools: ['COUNT', 'GROUP BY', 'WHERE', 'ORDER BY', 'DESC'],
    challenge: 'Patterns over time whisper the truth.',
    plainRequest: 'In the last 30 days, count how many shifts each person ended at or after 11:00 PM. List name and the count. Sort by the biggest counts first, then by name.',
    dataPreview: [shiftPreview],
    expectedShape: [
      'Columns: employee_name, late_nights',
      "Filter: clock_out >= '23:00' (ignore NULLs), date >= '2025-07-28'",
      'Sorted by late_nights DESC, employee_name ASC'
    ],
    modelSql: `
SELECT employee_name,
       COUNT(*) AS late_nights
FROM shift_logs
WHERE clock_out IS NOT NULL
  AND clock_out >= '23:00'
  AND date >= '2025-07-28'
GROUP BY employee_name
ORDER BY late_nights DESC, employee_name ASC;
`.trim(),
    validator: makeStandardValidator(`
SELECT employee_name,
       COUNT(*) AS late_nights
FROM shift_logs
WHERE clock_out IS NOT NULL
  AND clock_out >= '23:00'
  AND date >= '2025-07-28'
GROUP BY employee_name
ORDER BY late_nights DESC, employee_name ASC;`.trim(), { enforceOrder: true }),
    reflection: 'Roll-ups turn anecdotes into signals.',
    practices: [
      { prompt: 'Count late nights per role.', solutionSql: `SELECT role, COUNT(*) AS late_nights FROM shift_logs WHERE clock_out >= '23:00' AND clock_out IS NOT NULL GROUP BY role ORDER BY late_nights DESC, role;` },
      { prompt: 'Top 3 names by late_nights.', solutionSql: `SELECT employee_name, COUNT(*) AS late_nights FROM shift_logs WHERE clock_out IS NOT NULL AND clock_out >= '23:00' GROUP BY employee_name ORDER BY late_nights DESC, employee_name LIMIT 3;` }
    ],
    caseNote: 'Tallied late-night frequency per employee.',
    starterSql: `-- Count late nights (>= 23:00) in the last 30 days.
SELECT employee_name, COUNT(*) AS late_nights
FROM shift_logs
-- WHERE ...
GROUP BY employee_name
ORDER BY late_nights DESC, employee_name;`,
    keywords: ['SELECT','FROM','WHERE','GROUP BY','COUNT','ORDER BY','DESC'],
    hints: [
      'Exclude NULL clock_out and compare times using the same HH:MM format.',
      "Add a date window: date >= '2025-07-28'.",
      'Sort by count DESC, then name ASC.'
    ],
    // NEW — story intro
    introScreens: [
      { image: '/story/ghost-shift.svg', text: 'Ghost Shift. Count who pushes past 11 PM — routine or ritual?' }
    ]
  },
  {
    id: '2-2',
    title: 'Average Exit — Clock-out hour per person',
    tools: ['AVG', 'GROUP BY', 'WHERE', 'ORDER BY', 'ROUND'],
    challenge: 'Averages mute the noise.',
    plainRequest: 'For each person, what time do they usually leave? Return name and the average clock-out hour as a number (e.g., 22.75 for 10:45 PM). Sort by name.',
    dataPreview: [shiftPreview],
    expectedShape: [
      'Columns: employee_name, avg_out_hour',
      'avg_out_hour rounded to 2 decimals',
      'Ignore rows where clock_out is NULL',
      'Sorted by employee_name ASC'
    ],
    modelSql: `
SELECT employee_name,
       ROUND(AVG(
         CAST(substr(clock_out,1,2) AS INTEGER) +
         CAST(substr(clock_out,4,2) AS INTEGER)/60.0
       ), 2) AS avg_out_hour
FROM shift_logs
WHERE clock_out IS NOT NULL
GROUP BY employee_name
ORDER BY employee_name ASC;
`.trim(),
    validator: makeStandardValidator(`
SELECT employee_name,
       ROUND(AVG(
         CAST(substr(clock_out,1,2) AS INTEGER) +
         CAST(substr(clock_out,4,2) AS INTEGER)/60.0
       ), 2) AS avg_out_hour
FROM shift_logs
WHERE clock_out IS NOT NULL
GROUP BY employee_name
ORDER BY employee_name ASC;`.trim(), { enforceOrder: true }),
    reflection: 'Averages give each name a “center of gravity.”',
    practices: [
      { prompt: 'Average clock-in hour per employee.', solutionSql: `SELECT employee_name, ROUND(AVG(CAST(substr(clock_in,1,2) AS INTEGER) + CAST(substr(clock_in,4,2) AS INTEGER)/60.0),2) AS avg_in_hour FROM shift_logs GROUP BY employee_name ORDER BY employee_name;` },
      { prompt: 'Average clock-out hour per role.', solutionSql: `SELECT role, ROUND(AVG(CAST(substr(clock_out,1,2) AS INTEGER) + CAST(substr(clock_out,4,2) AS INTEGER)/60.0),2) AS avg_out_hour FROM shift_logs WHERE clock_out IS NOT NULL GROUP BY role ORDER BY role;` }
    ],
    caseNote: 'Computed average exit time per employee.',
    starterSql: `-- Convert HH:MM to hours as number; average per name.
SELECT employee_name, /* AVG(...) */ 0 AS avg_out_hour
FROM shift_logs
GROUP BY employee_name
ORDER BY employee_name;`,
    keywords: ['SELECT','FROM','WHERE','GROUP BY','AVG','ROUND','ORDER BY'],
    hints: [
      'Turn HH:MM into hours using substr() and arithmetic.',
      'Ignore NULL clock_out rows.',
      'Round to 2 decimals and sort by name.'
    ]
  },
  {
    id: '2-3',
    title: 'Baseline vs. Fire Night — Personal comparison',
    tools: ['GROUP BY', 'AVG', 'subquery', 'WHERE', 'ORDER BY', 'MAX'],
    challenge: 'Compare the night in question to each person’s normal.',
    plainRequest: 'For everyone who worked on August 27, 2025, show: (1) their latest clock-out time that night and (2) their own average clock-out hour from before that date. Return name, those two values; sort by name.',
    dataPreview: [shiftPreview],
    expectedShape: [
      'Columns: employee_name, fire_night_out, avg_out_hour_before',
      "fire_night_out may be NULL if none recorded that night",
      'avg_out_hour_before rounded to 2 decimals',
      'Sorted by employee_name ASC'
    ],
    modelSql: `
SELECT s.employee_name,
       MAX(s.clock_out) AS fire_night_out,
       ROUND((
         SELECT AVG(CAST(substr(x.clock_out,1,2) AS INTEGER) + CAST(substr(x.clock_out,4,2) AS INTEGER)/60.0)
         FROM shift_logs x
         WHERE x.employee_name = s.employee_name
           AND x.clock_out IS NOT NULL
           AND x.date < '2025-08-27'
       ), 2) AS avg_out_hour_before
FROM shift_logs s
WHERE s.date = '2025-08-27'
GROUP BY s.employee_name
ORDER BY s.employee_name ASC;
`.trim(),
    validator: makeStandardValidator(`
SELECT s.employee_name,
       MAX(s.clock_out) AS fire_night_out,
       ROUND((
         SELECT AVG(CAST(substr(x.clock_out,1,2) AS INTEGER) + CAST(substr(x.clock_out,4,2) AS INTEGER)/60.0)
         FROM shift_logs x
         WHERE x.employee_name = s.employee_name
           AND x.clock_out IS NOT NULL
           AND x.date < '2025-08-27'
       ), 2) AS avg_out_hour_before
FROM shift_logs s
WHERE s.date = '2025-08-27'
GROUP BY s.employee_name
ORDER BY s.employee_name ASC;`.trim(), { enforceOrder: true }),
    reflection: 'Context matters. One late night is noise—late against their baseline is a lead.',
    practices: [
      { prompt: 'Fire-night *earliest* vs. average before.', solutionSql: `SELECT s.employee_name, MIN(s.clock_out) AS fire_first_out, ROUND((SELECT AVG(CAST(substr(x.clock_out,1,2) AS INTEGER) + CAST(substr(x.clock_out,4,2) AS INTEGER)/60.0) FROM shift_logs x WHERE x.employee_name=s.employee_name AND x.clock_out IS NOT NULL AND x.date<'2025-08-27'),2) AS avg_before FROM shift_logs s WHERE s.date='2025-08-27' GROUP BY s.employee_name ORDER BY s.employee_name;` }
    ],
    caseNote: 'Compared fire-night exits to personal baselines.',
    starterSql: `-- Use a subquery in SELECT to get per-person average before 2025-08-27.
SELECT employee_name, /* fire_night_out */, /* avg_out_hour_before */
FROM shift_logs
WHERE date='2025-08-27'
GROUP BY employee_name
ORDER BY employee_name;`,
    keywords: ['SELECT','FROM','WHERE','GROUP BY','AVG','ORDER BY','subquery','MAX'],
    hints: [
      'Group by employee_name for the fire night.',
      'Use a scalar subquery to compute the per-person average before the date.',
      'Round to 2 decimals; order by name.'
    ]
  },
  {
    id: '2-4',
    title: 'Range Sense — Earliest & latest leave',
    tools: ['MIN', 'MAX', 'GROUP BY', 'WHERE', 'ORDER BY'],
    challenge: 'Know the boundaries before you hunt the outliers.',
    plainRequest: 'For each person, show the earliest and latest clock-out time in the last 30 days. Ignore empty end times. Sort by name.',
    dataPreview: [shiftPreview],
    expectedShape: [
      'Columns: employee_name, earliest_out, latest_out',
      "Window: date >= '2025-07-28'",
      'Sorted by employee_name ASC'
    ],
    modelSql: `
SELECT employee_name,
       MIN(clock_out) AS earliest_out,
       MAX(clock_out) AS latest_out
FROM shift_logs
WHERE clock_out IS NOT NULL
  AND date >= '2025-07-28'
GROUP BY employee_name
ORDER BY employee_name ASC;
`.trim(),
    validator: makeStandardValidator(`
SELECT employee_name,
       MIN(clock_out) AS earliest_out,
       MAX(clock_out) AS latest_out
FROM shift_logs
WHERE clock_out IS NOT NULL
  AND date >= '2025-07-28'
GROUP BY employee_name
ORDER BY employee_name ASC;`.trim(), { enforceOrder: true }),
    reflection: 'Ranges set the stage for what counts as unusual.',
    practices: [
      { prompt: 'Earliest & latest *clock-in* per person.', solutionSql: `SELECT employee_name, MIN(clock_in) AS earliest_in, MAX(clock_in) AS latest_in FROM shift_logs GROUP BY employee_name ORDER BY employee_name;` }
    ],
    caseNote: 'Mapped earliest/latest exits by person.',
    starterSql: `-- Get MIN/MAX over the last 30 days.
SELECT employee_name,
       MIN(clock_out) AS earliest_out,
       MAX(clock_out) AS latest_out
FROM shift_logs
-- WHERE ...
GROUP BY employee_name
ORDER BY employee_name;`,
    keywords: ['SELECT','FROM','WHERE','GROUP BY','MIN','MAX','ORDER BY'],
    hints: [
      'Filter out NULL clock_out.',
      "Add date >= '2025-07-28'.",
      'Group by name and sort by name.'
    ]
  },
  {
    id: '2-5',
    title: 'Practice Pack — Aggregates warmup',
    tools: ['COUNT', 'AVG', 'GROUP BY', 'ORDER BY', 'LIMIT'],
    challenge: 'Lock in the basics so they don’t lock you out later.',
    plainRequest: 'Make a quick leaderboard: in the last 30 days, who worked the most shifts? Return the top five with name and number of shifts.',
    dataPreview: [shiftPreview],
    expectedShape: [
      'Columns: employee_name, shifts',
      "Window: date >= '2025-07-28'",
      'Top 5 by shifts DESC, then employee_name ASC'
    ],
    modelSql: `
SELECT employee_name,
       COUNT(*) AS shifts
FROM shift_logs
WHERE date >= '2025-07-28'
GROUP BY employee_name
ORDER BY shifts DESC, employee_name ASC
LIMIT 5;
`.trim(),
    validator: makeStandardValidator(`
SELECT employee_name,
       COUNT(*) AS shifts
FROM shift_logs
WHERE date >= '2025-07-28'
GROUP BY employee_name
ORDER BY shifts DESC, employee_name ASC
LIMIT 5;`.trim(), { enforceOrder: true }),
    reflection: 'Leaderboards aren’t guilty verdicts, but they point your feet.',
    practices: [
      { prompt: 'Average clock-out hour per person (top 5 latest averages).', solutionSql: `SELECT employee_name, ROUND(AVG(CAST(substr(clock_out,1,2) AS INTEGER)+CAST(substr(clock_out,4,2) AS INTEGER)/60.0),2) AS avg_out_hour FROM shift_logs WHERE clock_out IS NOT NULL GROUP BY employee_name ORDER BY avg_out_hour DESC, employee_name LIMIT 5;` },
      { prompt: 'Shifts per role last 30 days.', solutionSql: `SELECT role, COUNT(*) AS shifts FROM shift_logs WHERE date >= '2025-07-28' GROUP BY role ORDER BY shifts DESC, role;` }
    ],
    caseNote: 'Built a simple 30-day shifts leaderboard.',
    starterSql: `-- Who worked the most (last 30 days)?
SELECT employee_name, COUNT(*) AS shifts
FROM shift_logs
-- WHERE date >= ...
GROUP BY employee_name
ORDER BY shifts DESC, employee_name
LIMIT 5;`,
    keywords: ['SELECT','FROM','WHERE','GROUP BY','COUNT','ORDER BY','DESC','LIMIT'],
    hints: [
      "Window the data to the last 30 days with date >= '2025-07-28'.",
      'Group by employee_name.',
      'Order by shifts DESC, then name ASC; limit to 5.'
    ]
  }
];
