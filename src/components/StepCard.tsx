import React from 'react';
import type { Database } from 'sql.js';
import SqlEditor from './SqlEditor';
import ResultTable, { QueryResult } from './ResultTable';
import TelemetryPanel, { Telemetry } from './TelemetryPanel';
import DataPreview from './DataPreview';

export type TablePreview = {
  name: string;
  description: string;
  columns: { name: string; description: string }[];
  sampleRowsSql: string;
};

export type PracticeItem = { prompt: string; solutionSql: string };

export type Step = {
  id: string;
  title: string;
  tools: string[];
  challenge: string;
  plainRequest: string;
  dataPreview: TablePreview[];
  expectedShape: string[];
  modelSql: string;
  validator: (db: Database, user: QueryResult | null) => Promise<{ ok: boolean; hint?: string }>;
  reflection: string;
  practices: PracticeItem[];
  caseNote?: string;
  starterSql?: string;
  keywords?: string[];
  hints?: string[];
};

type Props = {
  db: Database;
  step: Step;
  completed: boolean;
  onComplete: (note: string) => void;
};

export default function StepCard({ db, step, completed, onComplete }: Props) {
  const [sql, setSql] = React.useState(step.starterSql || '-- Translate the plain request to SQL.\nSELECT * FROM shift_logs LIMIT 5;');
  const [result, setResult] = React.useState<QueryResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [checkMsg, setCheckMsg] = React.useState<string | null>(null);
  const [won, setWon] = React.useState<boolean>(completed);
  const [telemetry, setTelemetry] = React.useState<Telemetry>({
    ran: false, columnsOk: null, rowCountOk: null, orderOk: null, hint: null, expected: null
  });

  React.useEffect(() => {
    setSql(step.starterSql || '-- Translate the plain request to SQL.\nSELECT * FROM shift_logs LIMIT 5;');
    setResult(null); setError(null); setCheckMsg(null);
    setWon(completed);
    setTelemetry({ ran: false, columnsOk: null, rowCountOk: null, orderOk: null, hint: null, expected: null });
  }, [step, completed]);

  function runSql() {
    try {
      const res = db.exec(sql);
      const qr: QueryResult = (!res || res.length === 0)
        ? { columns: [], rows: [] }
        : { columns: res[0].columns, rows: res[0].values as any[][] };
      setResult(qr);
      setError(null);
      evaluate(qr);
      setCheckMsg(null);
    } catch (e: any) {
      setError(String(e?.message || e));
      setResult(null);
      setTelemetry({ ran: false, columnsOk: null, rowCountOk: null, orderOk: null, hint: null, expected: null });
      setCheckMsg(null);
    }
  }

  async function check() {
    try {
      const ok = await step.validator(db, result);
      if (ok.ok) {
        setCheckMsg('✅ Correct.');
        if (!won && step.caseNote) onComplete(step.caseNote);
        setWon(true);
      } else {
        setCheckMsg(`⚠ ${ok.hint || 'Not quite.'}`);
      }
    } catch {
      setCheckMsg('⚠ Could not validate. Run your SQL first.');
    }
  }

  function evaluate(user: QueryResult) {
    try {
      const res = db.exec(step.modelSql);
      const model: QueryResult = (!res || res.length === 0)
        ? { columns: [], rows: [] }
        : { columns: res[0].columns, rows: res[0].values as any[][] };

      const colsOk = JSON.stringify(user.columns) === JSON.stringify(model.columns);
      const rowsOk = user.rows.length === model.rows.length;

      let orderOk: boolean | null = null;
      if (colsOk && rowsOk) {
        const norm = (v: any) => (typeof v === 'string' ? v.trim() : v);
        let match = true;
        for (let i = 0; i < user.rows.length; i++) {
          for (let j = 0; j < user.rows[i].length; j++) {
            if (norm(user.rows[i][j]) !== norm(model.rows[i][j])) { match = false; break; }
          }
          if (!match) break;
        }
        orderOk = match;
      }

      let hint: string | null = null;
      if (!colsOk) hint = 'Columns mismatch. Check names/order.';
      else if (!rowsOk) hint = `Row count should be ${model.rows.length}.`;
      else if (orderOk === false) hint = 'Ordering differs. Check ORDER BY.';

      setTelemetry({
        ran: true,
        columnsOk: colsOk,
        rowCountOk: rowsOk,
        orderOk,
        hint,
        expected: { columns: model.columns, rows: model.rows.length }
      });
    } catch (e) {
      setTelemetry({ ran: true, columnsOk: null, rowCountOk: null, orderOk: null, hint: 'Internal model error.', expected: null });
    }
  }

  const toolbar = Array.from(new Set([
    ...step.tools,
    'AND', 'OR', 'ASC', 'DESC', 'IS NULL', 'IS NOT NULL', 'DISTINCT', 'LIMIT'
  ]));

  return (
    <div className={`step-card ${won ? 'won' : ''}`} style={{ minWidth: 0 }}>
      <div className="block">
        <div className="small">Objective</div>
        <h2 style={{ margin: '4px 0 0 0', lineHeight: 1.25 }}>{step.title}</h2>
        <div className="plainline" style={{ marginTop: 6 }}>{step.plainRequest}</div>
      </div>

      <div className="block">
        <div className="small">Tools allowed</div>
        <div className="chips" style={{ margin: '6px 0 0' }}>
          {step.tools.map(t => <span key={t} className="chip">{t}</span>)}
        </div>
      </div>

      <div className="block">
        <TelemetryPanel t={telemetry} />
      </div>

      {/* Data Preview now shows a live table */}
      {step.dataPreview?.length > 0 && (
        <details className="disclosure block" open={false}>
          <summary>Data Preview</summary>
          <div className="disclosure-content">
            <DataPreview db={db} tables={step.dataPreview as any} />
          </div>
        </details>
      )}

      <div className="block">
        <h3 style={{ margin: '0 0 8px' }}>Try it</h3>
        <SqlEditor
          value={sql}
          onChange={setSql}
          onRun={runSql}
          onCheck={check}
          keywords={step.keywords || ['SELECT','FROM','WHERE','ORDER BY','ASC','DESC','AND','OR']}
          toolbarTokens={toolbar}
        />
        <ResultTable result={result} error={error} />
      </div>

      <div className="block">
        <div className="small">Expected output</div>
        <ul className="small" style={{ marginTop: 6 }}>
          {step.expectedShape.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      </div>

      <details className="disclosure block">
        <summary>Reveal Solution</summary>
        <div className="disclosure-content">
          <pre style={{ whiteSpace: 'pre-wrap' }}>{step.modelSql}</pre>
        </div>
      </details>

      <div className="block">
        <div className="small">Why this matters</div>
        <div style={{ marginTop: 6 }}>{step.reflection}</div>
      </div>

      {step.practices?.length > 0 && (
        <details className="disclosure block">
          <summary>Practice variations</summary>
          <div className="disclosure-content">
            {step.practices.map((p, i) => (
              <details key={i} className="table-meta" open={false}>
                <summary>{p.prompt}</summary>
                <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{p.solutionSql}</pre>
              </details>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
