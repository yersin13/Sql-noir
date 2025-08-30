import type { Step, TablePreview } from '../components/StepCard';
import { makeStandardValidator } from './chapter1';

const accessPreview: TablePreview = {
  name: 'access_logs',
  description: 'Door events for time window analysis.',
  columns: [
    { name: 'employee_id', description: 'Employee id' },
    { name: 'event_time', description: 'ISO time' },
    { name: 'action', description: 'ENTER/EXIT' },
    { name: 'door', description: 'Door code' }
  ],
  sampleRowsSql: `SELECT * FROM access_logs ORDER BY event_time DESC LIMIT 5;`
};

export const chapter5: Step[] = [
  {
    id: '5-1',
    title: 'Signal Bleed — date/time ranges (scaffold)',
    tools: ['BETWEEN', 'datetime()', 'ranges'],
    challenge: 'Pull access events between 23:45 and 00:50 around the fire night.',
    dataPreview: [accessPreview],
    expectedShape: [
      'Columns: employee_id, event_time, action, door',
      'Sorted by event_time ASC'
    ],
    modelSql: `
SELECT employee_id, event_time, action, door
FROM access_logs
WHERE event_time BETWEEN '2025-08-27T23:45:00' AND '2025-08-28T00:50:00'
ORDER BY event_time ASC;
`.trim(),
    validator: makeStandardValidator(`
SELECT employee_id, event_time, action, door
FROM access_logs
WHERE event_time BETWEEN '2025-08-27T23:45:00' AND '2025-08-28T00:50:00'
ORDER BY event_time ASC;`.trim(), { enforceOrder: true }),
    reflection: 'Time windows turn noise into signal.',
    practices: [],
    caseNote: 'Time range scaffolds ready.'
  }
];
