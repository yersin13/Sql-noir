import React from 'react';
import type { Database } from 'sql.js';

export type TablePreviewMeta = {
  name: string;
  description: string;
  columns: { name: string; description: string }[];
  sampleRowsSql: string; // e.g. "SELECT * FROM shift_logs ORDER BY date LIMIT 8;"
};

type Props = {
  db: Database;
  tables: TablePreviewMeta[];
  maxRows?: number; // optional clamp for display only
};

export default function DataPreview({ db, tables, maxRows = 100 }: Props) {
  return (
    <div className="dp-wrap">
      {tables.map((t) => (
        <PreviewCard key={t.name} db={db} meta={t} maxRows={maxRows} />
      ))}
    </div>
  );
}

function PreviewCard({ db, meta, maxRows }: { db: Database; meta: TablePreviewMeta; maxRows: number }) {
  const [cols, setCols] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<any[][]>([]);
  const [err, setErr] = React.useState<string | null>(null);
  const [sqlOpen, setSqlOpen] = React.useState(false);

  React.useEffect(() => {
    try {
      const res = db.exec(meta.sampleRowsSql);
      if (!res || res.length === 0) {
        setCols([]); setRows([]);
      } else {
        setCols(res[0].columns || []);
        const vals = (res[0].values as any[][]) || [];
        setRows(vals.slice(0, maxRows));
      }
      setErr(null);
    } catch (e: any) {
      setErr(String(e?.message || e));
      setCols([]); setRows([]);
    }
  }, [db, meta.sampleRowsSql, maxRows]);

  return (
    <div className="dp-card">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div className="row" style={{ gap: 8 }}>
          <strong>{meta.name}</strong>
          <span className="small faint">{meta.description}</span>
        </div>
        <button className="tiny" onClick={() => setSqlOpen(v => !v)}>{sqlOpen ? 'Hide SQL' : 'Show SQL'}</button>
      </div>

      {sqlOpen && (
        <pre className="dp-sql">{meta.sampleRowsSql}</pre>
      )}

      {err ? (
        <div className="dp-error">⚠ {err}</div>
      ) : (
        <div className="dp-table">
          <table>
            <thead>
              <tr>
                {cols.map(c => <th key={c}>{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={Math.max(1, cols.length)} className="dp-empty">No rows</td>
                </tr>
              ) : rows.map((r, i) => (
                <tr key={i}>
                  {r.map((v, j) => <td key={j}>{fmt(v)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="small faint" style={{ marginTop: 6 }}>
        Columns:
        <ul className="dp-cols">
          {meta.columns.map((c) => (
            <li key={c.name}><code>{c.name}</code> — {c.description}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function fmt(v: any) {
  if (v === null || v === undefined) return <span className="faint">NULL</span>;
  if (typeof v === 'number') return v;
  return String(v);
}
