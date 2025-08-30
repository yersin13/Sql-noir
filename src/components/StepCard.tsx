import React, { useEffect, useMemo, useState } from 'react';
import type { Database } from 'sql.js';
import ResultTable, { QueryResult } from './ResultTable';
import SqlEditor from './SqlEditor';
import AcceptanceChecklist, { TestItem } from './AcceptanceChecklist';

export type TablePreview = {
  name: string;
  description?: string;
  columns: { name: string; description: string }[];
  sampleRowsSql: string;
};

export type PracticeItem = { prompt: string; solutionSql: string };

export type Step = {
  id: string;
  title: string;
  tools: string[];
  challenge: string; // compact objective
  dataPreview: TablePreview[];
  expectedShape: string[]; // bullets, may mention ordering
  modelSql: string;
  validator: (db: Database, user: QueryResult | null) => Promise<{ ok: boolean; hint?: string }>;
  reflection: string;
  practices: PracticeItem[];
  caseNote?: string;
  starterSql?: string;
  /** Palette of concept keywords (not clauses) */
  keywords?: string[];
  /** Hint ladder, increasing explicitness */
  hints?: string[];
};

function execQuery(db: Database, sql: string): QueryResult {
  const res = db.exec(sql);
  if (!res || res.length === 0) return { columns: [], rows: [] };
  const { columns, values } = res[0];
  return { columns, rows: values as any[][] };
}

function Disclosure({
  title,
  children,
  defaultOpen = false
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="block">
      <div className="disclosure" onClick={() => setOpen((o) => !o)}>
        {open ? '▼ ' : '▶ '} {title}
      </div>
      {open && <div className="disclosure-content">{children}</div>}
    </div>
  );
}

interface Props {
  db: Database;
  step: Step;
  completed: boolean;
  onComplete: (note: string) => void;
}

export default function StepCard({ db, step, completed, onComplete }: Props) {
  const [sql, setSql] = useState<string>(
    step.starterSql ??
      '-- Write your query below.\n-- Tip: Ctrl+Enter to Run, Alt+C to Check.\nSELECT * FROM shift_logs LIMIT 5;'
  );
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean>(completed);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [hintLevel, setHintLevel] = useState<number>(0);

  useEffect(() => {
    setSql(
      step.starterSql ??
        '-- Write your query below.\nSELECT * FROM shift_logs LIMIT 5;'
    );
    setResult(null);
    setError(null);
    setHint(null);
    setOk(completed);
    setTests([]);
    setHintLevel(0);
  }, [step.id, completed, step.starterSql]);

  const previews = useMemo(() => {
    return step.dataPreview.map((p) => {
      try {
        const r = execQuery(db, p.sampleRowsSql);
        return { ...p, sample: r };
      } catch {
        return { ...p, sample: null as any };
      }
    });
  }, [db, step.dataPreview]);

  function evaluateTests(userRes: QueryResult | null) {
    try {
      const model = execQuery(db, step.modelSql);
      const t: TestItem[] = [
        { id: 'cols', label: 'Columns & order match', ok: null },
        { id: 'rows', label: 'Row count matches spec', ok: null },
        { id: 'order', label: 'Sorted as specified (if applicable)', ok: null }
      ];
      if (!userRes) {
        setTests(t);
        return;
      }
      t[0].ok = JSON.stringify(userRes.columns) === JSON.stringify(model.columns);
      t[1].ok = userRes.rows.length === model.rows.length;

      // ordering check by comparing first few rows when lengths match
      if (userRes.rows.length === model.rows.length) {
        const k = Math.min(userRes.rows.length, 5);
        const a = userRes.rows.slice(0, k).map((r) => JSON.stringify(r)).join('|');
        const b = model.rows.slice(0, k).map((r) => JSON.stringify(r)).join('|');
        t[2].ok = a === b;
      } else {
        t[2].ok = false;
      }
      setTests(t);
    } catch {
      setTests([]);
    }
  }

  function onRun() {
    try {
      const r = execQuery(db, sql);
      setResult(r);
      setError(null);
      evaluateTests(r);
    } catch (e: any) {
      setError(e?.message ?? 'Execution error');
      setResult(null);
      setTests([]);
    }
  }

  async function onCheck() {
    const v = await step.validator(db, result);
    setHint(v.hint ?? null);
    setOk(v.ok);
    if (!v.ok && step.hints && hintLevel < step.hints.length) {
      setHint(step.hints[hintLevel]);
      setHintLevel(hintLevel + 1);
    }
    if (v.ok && step.caseNote) onComplete(step.caseNote);
  }

  return (
    <div className="step-card">
      {/* Title */}
      <div className="block">
        <div className="small">Chapter Step</div>
        <h2 style={{ margin: '4px 0 0 0' }}>{step.title}</h2>
      </div>

      {/* Compact Objective & Spec */}
      <div className="block">
        <h3>Objective & Spec</h3>
        <div className="spec-grid">
          <div className="challenge">{step.challenge}</div>
          <div>
            <div className="small" style={{ marginBottom: 4 }}>
              Allowed tools
            </div>
            <div className="chips">
              {step.tools.map((t) => (
                <span key={t} className="chip">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="small" style={{ marginBottom: 4 }}>
              Expected output
            </div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {step.expectedShape.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Collapsible Data Preview */}
      <Disclosure title="Data Preview" defaultOpen={false}>
        {previews.map((p) => (
          <div className="table-meta" key={p.name}>
            <div style={{ fontWeight: 600 }}>{p.name}</div>
            {p.description && <div className="small">{p.description}</div>}
            <div className="small" style={{ marginTop: 4 }}>
              Columns:
            </div>
            <ul className="small" style={{ marginTop: 2 }}>
              {p.columns.map((c) => (
                <li key={c.name}>
                  <b>{c.name}</b> — {c.description}
                </li>
              ))}
            </ul>
            {p.sample && (
              <Disclosure title="Show sample rows" defaultOpen={false}>
                <div style={{ overflow: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        {p.sample.columns.map((c: string) => (
                          <th key={c}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {p.sample.rows.slice(0, 10).map((r: any[], i: number) => (
                        <tr key={i}>
                          {r.map((v, j) => (
                            <td key={j}>{v as any}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Disclosure>
            )}
          </div>
        ))}
      </Disclosure>

      {/* Editor with keyword palette */}
      <SqlEditor
        value={sql}
        onChange={setSql}
        onRun={onRun}
        onCheck={onCheck}
        keywords={step.keywords ?? ['SELECT','FROM','WHERE','AND','OR','ORDER BY','ASC','DESC','IS NULL','COUNT','AVG','MIN','MAX','GROUP BY','HAVING','LIMIT']}
      />

      <ResultTable result={result} error={error} />

      {/* Acceptance tests */}
      <AcceptanceChecklist tests={tests} />

      {/* Solution (collapsible) */}
      <Disclosure title="Reveal Solution" defaultOpen={false}>
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            fontFamily: 'var(--mono)',
            fontSize: 13
          }}
        >
          {step.modelSql}
        </pre>
      </Disclosure>

      {/* Reflection + Hint ladder */}
      <div className="block">
        <h3>Analyst Reflection</h3>
        <div className="small">{step.reflection}</div>
        {ok ? (
          <div style={{ marginTop: 8, color: 'var(--ok)' }}>✔ Step complete</div>
        ) : (
          <>
            {hint && <div className="hint" style={{ marginTop: 8 }}>Hint: {hint}</div>}
            {step.hints && hintLevel < step.hints.length && (
              <div className="row" style={{ marginTop: 8 }}>
                <button onClick={() => { setHint(step.hints![hintLevel]); setHintLevel(hintLevel + 1); }}>
                  Need a nudge?
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Practice */}
      {step.practices.length > 0 && (
        <div className="block">
          <h3>Practice</h3>
          <div className="small">Optional mini-variations.</div>
          {step.practices.map((p, idx) => (
            <Disclosure key={idx} title={`▶ ${p.prompt}`} defaultOpen={false}>
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'var(--mono)',
                  fontSize: 13
                }}
              >
                {p.solutionSql}
              </pre>
            </Disclosure>
          ))}
        </div>
      )}
    </div>
  );
}
