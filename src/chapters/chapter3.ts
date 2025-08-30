import type { Step, TablePreview } from '../components/StepCard';
import { makeStandardValidator } from './chapter1';

const shiftPreview: TablePreview = {
  name: 'shift_logs',
  description: 'Shift records (for JOIN scaffolds).',
  columns: [
    { name: 'employee_id', description: 'Numeric employee id' },
    { name: 'employee_name', description: 'Name' },
    { name: 'role', description: 'Role' },
    { name: 'date', description: 'Work date' },
    { name: 'clock_in', description: 'Start time' },
    { name: 'clock_out', description: 'End time or NULL' }
  ],
  sampleRowsSql: `SELECT * FROM shift_logs ORDER BY date DESC, employee_id LIMIT 5;`
};

const accessPreview: TablePreview = {
  name: 'access_logs',
  description: 'Door events: ENTER/EXIT with timestamps.',
  columns: [
    { name: 'employee_id', description: 'Matches shift_logs.employee_id' },
    { name: 'event_time', description: 'ISO timestamp' },
    { name: 'action', description: 'ENTER/EXIT' },
    { name: 'door', description: 'Door code' }
  ],
  sampleRowsSql: `SELECT * FROM access_logs ORDER BY event_time DESC LIMIT 5;`
};

export const chapter3: Step[] = [
  {
    id: '3-1',
    title: 'The Cross-check — JOIN shifts with door logs (scaffold)',
    tools: ['JOIN', 'INNER JOIN', 'LEFT JOIN', 'aliases'],
    challenge: 'Corroborate on 2025-08-27: Who had both a shift and an EXIT around midnight?',
    dataPreview: [shiftPreview, accessPreview],
    expectedShape: [
      'Columns: employee_name, date, clock_out, event_time, action, door',
      'INNER JOIN between shift_logs and access_logs'
    ],
    modelSql: `
-- Example solution (scaffold):
SELECT s.employee_name, s.date, s.clock_out, a.event_time, a.action, a.door
FROM shift_logs s
JOIN access_logs a ON a.employee_id = s.employee_id
WHERE s.date = '2025-08-27' AND a.action = 'EXIT'
ORDER BY a.event_time DESC;
`.trim(),
    validator: makeStandardValidator(`
SELECT s.employee_name, s.date, s.clock_out, a.event_time, a.action, a.door
FROM shift_logs s
JOIN access_logs a ON a.employee_id = s.employee_id
WHERE s.date = '2025-08-27' AND a.action = 'EXIT'
ORDER BY a.event_time DESC;`.trim(), { enforceOrder: true }),
    reflection: 'Logs that agree build trust; logs that disagree demand questions.',
    practices: [],
    caseNote: 'JOIN scaffolds prepared for cross-checking.'
  }
];
