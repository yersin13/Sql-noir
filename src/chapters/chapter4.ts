import type { Step, TablePreview } from '../components/StepCard';
import { makeStandardValidator } from './chapter1';

const posPreview: TablePreview = {
  name: 'pos_sessions',
  description: 'Logins/logouts by employee on terminals.',
  columns: [
    { name: 'employee_id', description: 'Matches shift_logs.employee_id' },
    { name: 'login_time', description: 'ISO time' },
    { name: 'logout_time', description: 'ISO time' }
  ],
  sampleRowsSql: `SELECT * FROM pos_sessions ORDER BY login_time DESC LIMIT 5;`
};

export const chapter4: Step[] = [
  {
    id: '4-1',
    title: 'The Paper Crown — Joins + Aggregates (scaffold)',
    tools: ['JOIN', 'GROUP BY', 'HAVING'],
    challenge: 'Count POS sessions per employee on 2025-08-27.',
    dataPreview: [posPreview],
    expectedShape: [
      'Columns: employee_id, sessions',
      'GROUP BY employee_id'
    ],
    modelSql: `
SELECT employee_id, COUNT(*) AS sessions
FROM pos_sessions
WHERE login_time LIKE '2025-08-27%'
GROUP BY employee_id
ORDER BY sessions DESC, employee_id;
`.trim(),
    validator: makeStandardValidator(`
SELECT employee_id, COUNT(*) AS sessions
FROM pos_sessions
WHERE login_time LIKE '2025-08-27%'
GROUP BY employee_id
ORDER BY sessions DESC, employee_id;`.trim(), { enforceOrder: true }),
    reflection: 'Money trails wear paper crowns.',
    practices: [],
    caseNote: 'POS aggregates scaffolded.'
  }
];
