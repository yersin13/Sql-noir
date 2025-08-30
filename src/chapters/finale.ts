import type { Step, TablePreview } from '../components/StepCard';
import { makeStandardValidator } from './chapter1';

const shiftPreview: TablePreview = {
  name: 'shift_logs',
  description: 'All roads lead here.',
  columns: [
    { name: 'employee_id', description: 'Employee' },
    { name: 'employee_name', description: 'Name' },
    { name: 'role', description: 'Role' },
    { name: 'date', description: 'Date' },
    { name: 'clock_in', description: 'In' },
    { name: 'clock_out', description: 'Out' }
  ],
  sampleRowsSql: `SELECT * FROM shift_logs ORDER BY date, employee_id LIMIT 5;`
};

export const finale: Step[] = [
  {
    id: 'F-1',
    title: 'The Reckoning — capstone (scaffold)',
    tools: ['Multi-CTE', 'JOINs', 'Aggregates'],
    challenge: 'Draft the skeleton: a CTE chain that builds toward proving the mastermind.',
    dataPreview: [shiftPreview],
    expectedShape: ['Any columns for now — this is a scaffolded sandbox.'],
    modelSql: `
WITH fire_night AS (
  SELECT * FROM shift_logs WHERE date = '2025-08-27'
)
SELECT employee_name, role, clock_in, clock_out
FROM fire_night
ORDER BY employee_name;
`.trim(),
    validator: makeStandardValidator(`
WITH fire_night AS (
  SELECT * FROM shift_logs WHERE date = '2025-08-27'
)
SELECT employee_name, role, clock_in, clock_out
FROM fire_night
ORDER BY employee_name;`.trim(), { enforceOrder: true }),
    reflection: 'The truth isn’t a line, it’s a weave. You’re learning the loom.',
    practices: [],
    caseNote: 'Finale scaffold ready.'
  }
];
