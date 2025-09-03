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
    const norm = (v: any) => (typeof v === 'string' ? v.trim() : v);
    const A = enforceOrder ? user.rows : [...user.rows].sort();
    const B = enforceOrder ? model.rows : [...model.rows].sort();
    for (let i = 0; i < A.length; i++) {
      const ra = A[i], rb = B[i];
      for (let j = 0; j < ra.length; j++) if (norm(ra[j]) !== norm(rb[j])) return { ok: false, hint: enforceOrder ? 'Ordering or values differ.' : 'Values differ.' };
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
    challenge: "The fire night doesn’t erase timecards.",
    plainRequest: 'Show everyone who worked on August 27, 2025. Include each person’s name, role, start time, and end time. Sort the list alphabetically by name.',
    dataPreview: [shiftPreview],
    expectedShape: [
      'Columns: employee_name, role, clock_in, clock_out',
      "Sorted by employee_name ASC"
    ],
    modelSql: `
SELECT employee_name, role, clock_in, clock_out
FROM shift_logs
WHERE date = '2025-08-27'
ORDER BY employee_name ASC;
`.trim(),
    validator: makeStandardValidator(`
SELECT employee_name, role, clock_in, clock_out
FROM shift_logs
WHERE date = '2025-08-27'
ORDER BY employee_name ASC;`.trim(), { enforceOrder: true }),
    reflection: 'Start with the roster; late departures shrink the haystack — not proof, but direction.',
    practices: [
      { prompt: 'Only names and roles for that date, sorted by role then name.', solutionSql: `SELECT employee_name, role FROM shift_logs WHERE date='2025-08-27' ORDER BY role, employee_name;` },
      { prompt: 'Only cooks working that date.', solutionSql: `SELECT employee_name, role, clock_in, clock_out FROM shift_logs WHERE date='2025-08-27' AND role='Cook' ORDER BY employee_name;` }
    ],
    caseNote: 'Pulled roster for the fire night.',
    starterSql: `-- Build the roster for 2025-08-27.
SELECT employee_name, role, clock_in, clock_out
FROM shift_logs
WHERE date = '2025-08-27'
ORDER BY employee_name;`,
    keywords: ['SELECT','FROM','WHERE','ORDER BY','ASC'],
    hints: [
      "Filter on date = '2025-08-27'.",
      'Pick only the four columns in the expected order.',
      'Remember ORDER BY employee_name.'
    ],
    // Story intro for Step 1
    introScreens: [
      {
        image: '/story/ch1-intro.svg',
        alt: 'Neon alley, ledger glow',
        title: 'Case File: The Night Ledger',
        text: 'The power died at 22:41. Cash drawers froze, doors didn’t. You’re off-site. Start by pulling who was scheduled that night.'
      },
      { text: 'Answer in data, not gut: list every person who worked that date, with role and times.' }
    ],
    successLine: 'Roster locked. Names before alibis.'
  },
  {
    id: '1-2',
    title: 'Who left last?',
    tools: ['ORDER BY', 'DESC', 'IS NOT NULL'],
    challenge: 'The final light out is never random.',
    plainRequest: 'Who clocked out the latest on Aug 27, 2025? Show name, role, end time. Sort by end time from latest to earliest.',
    dataPreview: [shiftPreview],
    expectedShape: [
      'Columns: employee_name, role, clock_out',
      "Filter out NULL clock_out",
      'Sorted by clock_out DESC, then name'
    ],
    modelSql: `
SELECT employee_name, role, clock_out
FROM shift_logs
WHERE date='2025-08-27' AND clock_out IS NOT NULL
ORDER BY clock_out DESC, employee_name ASC;
`.trim(),
    validator: makeStandardValidator(`
SELECT employee_name, role, clock_out
FROM shift_logs
WHERE date='2025-08-27' AND clock_out IS NOT NULL
ORDER BY clock_out DESC, employee_name ASC;`.trim(), { enforceOrder: true }),
    reflection: 'Late exits point to keys and responsibility — or cover.',
    practices: [
      { prompt: 'Top 3 latest clock-outs on any date.', solutionSql: `SELECT employee_name, role, date, clock_out FROM shift_logs WHERE clock_out IS NOT NULL ORDER BY clock_out DESC, date DESC LIMIT 3;` }
    ],
    caseNote: 'Identified the last departures on the fire night.',
    starterSql: `SELECT employee_name, role, clock_out
FROM shift_logs
WHERE date='2025-08-27' AND clock_out IS NOT NULL
ORDER BY clock_out DESC, employee_name;`,
    keywords: ['SELECT','FROM','WHERE','ORDER BY','DESC','IS NOT NULL'],
    hints: [
      'Filter the date, exclude NULLs.',
      'Sort by clock_out DESC.',
      'Return exactly the three columns.'
    ],
    successLine: 'Final light: 23:55. Note who held the keys.'
  },
  {
    id: '1-3',
    title: 'Who has no clock_out?',
    tools: ['IS NULL', 'ORDER BY'],
    challenge: 'Missing times are loose threads.',
    plainRequest: 'List the people from Aug 27, 2025 whose end time is missing. Include name, role, start and end time. Sort by name.',
    dataPreview: [shiftPreview],
    expectedShape: [
      'Columns: employee_name, role, clock_in, clock_out',
      'Filter: clock_out IS NULL',
      'Sorted by employee_name ASC'
    ],
    modelSql: `
SELECT employee_name, role, clock_in, clock_out
FROM shift_logs
WHERE date='2025-08-27' AND clock_out IS NULL
ORDER BY employee_name ASC;
`.trim(),
    validator: makeStandardValidator(`
SELECT employee_name, role, clock_in, clock_out
FROM shift_logs
WHERE date='2025-08-27' AND clock_out IS NULL
ORDER BY employee_name ASC;`.trim(), { enforceOrder: true }),
    reflection: 'Gaps suggest scrambles. We flag, then verify.',
    practices: [
      { prompt: 'Across any date: rows with clock_out NULL.', solutionSql: `SELECT employee_name, role, date, clock_in FROM shift_logs WHERE clock_out IS NULL ORDER BY date, employee_name;` }
    ],
    caseNote: 'Flagged missing clock-out entries for follow-up.',
    starterSql: `SELECT employee_name, role, clock_in, clock_out
FROM shift_logs
WHERE date='2025-08-27' AND clock_out IS NULL
ORDER BY employee_name;`,
    keywords: ['SELECT','FROM','WHERE','IS NULL','ORDER BY'],
    hints: [
      'Use IS NULL on clock_out.',
      'Keep the four requested columns.',
      'Sort by name.'
    ],
    successLine: 'Two blanks on the tape. Escalate for confirmation.'
  },
  {
    id: '1-4',
    title: 'Who started after 8 PM?',
    tools: ['WHERE', '>', 'ORDER BY'],
    challenge: 'Late starts bend a timeline.',
    plainRequest: 'From Aug 27, 2025, show people who started after 8:00 PM. Return name, role, and start time. Sort by name.',
    dataPreview: [shiftPreview],
    expectedShape: [
      'Columns: employee_name, role, clock_in',
      "Filter: date='2025-08-27' AND clock_in > '20:00'",
      'Sorted by employee_name ASC'
    ],
    modelSql: `
SELECT employee_name, role, clock_in
FROM shift_logs
WHERE date='2025-08-27' AND clock_in > '20:00'
ORDER BY employee_name ASC;
`.trim(),
    validator: makeStandardValidator(`
SELECT employee_name, role, clock_in
FROM shift_logs
WHERE date='2025-08-27' AND clock_in > '20:00'
ORDER BY employee_name ASC;`.trim(), { enforceOrder: true }),
    reflection: 'Late arrivals don’t prove intent, but they reframe windows.',
    practices: [
      { prompt: 'Same, but show just the names.', solutionSql: `SELECT employee_name FROM shift_logs WHERE date='2025-08-27' AND clock_in > '20:00' ORDER BY employee_name;` }
    ],
    caseNote: 'Marked unusually late starters.',
    starterSql: `SELECT employee_name, role, clock_in
FROM shift_logs
WHERE date='2025-08-27' AND clock_in > '20:00'
ORDER BY employee_name;`,
    keywords: ['SELECT','FROM','WHERE','>','ORDER BY'],
    hints: [
      "Use a string compare on '20:00'.",
      'Return exactly three columns.',
      'Sort by name.'
    ],
    successLine: 'Late starters isolated. Timeline tightens.'
  },
  {
    id: '1-5',
    title: 'First shortlist',
    tools: ['WHERE', 'ORDER BY', 'OR'],
    challenge: 'Thin the crowd; keep the truth.',
    plainRequest: 'Build a quick shortlist: from Aug 27, 2025, return names and roles for people who either left at/after 11 PM or have no end time. Sort by name.',
    dataPreview: [shiftPreview],
    expectedShape: [
      'Columns: employee_name, role',
      "Filter: (clock_out >= '23:00' OR clock_out IS NULL) AND date='2025-08-27'",
      'Sorted by employee_name ASC'
    ],
    modelSql: `
SELECT employee_name, role
FROM shift_logs
WHERE date='2025-08-27'
  AND (clock_out >= '23:00' OR clock_out IS NULL)
ORDER BY employee_name ASC;
`.trim(),
    validator: makeStandardValidator(`
SELECT employee_name, role
FROM shift_logs
WHERE date='2025-08-27'
  AND (clock_out >= '23:00' OR clock_out IS NULL)
ORDER BY employee_name ASC;`.trim(), { enforceOrder: true }),
    reflection: 'Shortlists move the work forward; proof comes later.',
    practices: [
      { prompt: 'Shortlist variant: start after 20:00 *or* left after 23:00.', solutionSql: `SELECT employee_name, role FROM shift_logs WHERE date='2025-08-27' AND (clock_in > '20:00' OR clock_out >= '23:00') ORDER BY employee_name;` },
      { prompt: 'Only roles on the shortlist (unique).', solutionSql: `SELECT DISTINCT role FROM shift_logs WHERE date='2025-08-27' AND (clock_out >= '23:00' OR clock_out IS NULL) ORDER BY role;` }
    ],
    caseNote: 'Drafted an initial shortlist from extremes and gaps.',
    starterSql: `SELECT employee_name, role
FROM shift_logs
WHERE date='2025-08-27' AND (clock_out >= '23:00' OR clock_out IS NULL)
ORDER BY employee_name;`,
    keywords: ['SELECT','FROM','WHERE','ORDER BY','OR','ASC'],
    hints: [
      'Combine conditions with OR.',
      'Keep just name and role.',
      'Alphabetize by name.'
    ],
    successLine: 'Shortlist drafted. Follow the edges next.'
  }
];
