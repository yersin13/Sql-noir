import type { Step, TablePreview } from '../components/StepCard';
import { makeStandardValidator } from './chapter1';

const claimsPreview: TablePreview = {
  name: 'insurance_claims',
  description: 'Final submissions with amounts.',
  columns: [
    { name: 'business', description: 'Business/venue' },
    { name: 'claim_id', description: 'Claim id' },
    { name: 'created_at', description: 'Created ISO date' },
    { name: 'submitted_at', description: 'Submitted date (nullable)' },
    { name: 'amount', description: 'Amount' },
    { name: 'prepared_by', description: 'Who prepared the claim' }
  ],
  sampleRowsSql: `SELECT * FROM insurance_claims ORDER BY created_at DESC;`
};

const draftsPreview: TablePreview = {
  name: 'insurance_drafts',
  description: 'Draft versions (pre-submission).',
  columns: [
    { name: 'business', description: 'Business/venue' },
    { name: 'claim_id', description: 'Claim id' },
    { name: 'version', description: 'Draft version' },
    { name: 'created_at', description: 'ISO time' },
    { name: 'prepared_by', description: 'Preparer' }
  ],
  sampleRowsSql: `SELECT * FROM insurance_drafts ORDER BY created_at DESC;`
};

export const chapter6: Step[] = [
  {
    id: '6-1',
    title: 'False Mirror — integrity checks with NOT EXISTS (scaffold)',
    tools: ['EXISTS', 'NOT EXISTS', 'CTEs'],
    challenge: 'Find drafts that have no matching final submission.',
    dataPreview: [claimsPreview, draftsPreview],
    expectedShape: ['Columns: claim_id, latest_draft_version'],
    modelSql: `
WITH latest AS (
  SELECT claim_id, MAX(version) AS latest_draft_version
  FROM insurance_drafts
  GROUP BY claim_id
)
SELECT l.claim_id, l.latest_draft_version
FROM latest l
WHERE NOT EXISTS (
  SELECT 1 FROM insurance_claims c WHERE c.claim_id = l.claim_id
)
ORDER BY l.claim_id;
`.trim(),
    validator: makeStandardValidator(`
WITH latest AS (
  SELECT claim_id, MAX(version) AS latest_draft_version
  FROM insurance_drafts
  GROUP BY claim_id
)
SELECT l.claim_id, l.latest_draft_version
FROM latest l
WHERE NOT EXISTS (
  SELECT 1 FROM insurance_claims c WHERE c.claim_id = l.claim_id
)
ORDER BY l.claim_id;`.trim(), { enforceOrder: true }),
    reflection: 'If it never made it to paper, it never happened—on paper.',
    practices: [],
    caseNote: 'NOT EXISTS integrity scaffolds ready.'
  }
];
