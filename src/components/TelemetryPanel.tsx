import React from 'react';

export type Telemetry = {
  ran: boolean;
  columnsOk: boolean | null;
  rowCountOk: boolean | null;
  orderOk: boolean | null;
  hint?: string | null;
  expected?: { columns: string[]; rows: number } | null;
};

function Dot({ state }: { state: boolean | null }) {
  const cls = state === null ? '' : state ? 'ok' : 'bad';
  const label = state === null ? 'pending' : state ? 'ok' : 'not ok';
  return <span className={`dot ${cls}`} aria-label={label} />;
}

export default function TelemetryPanel({ t }: { t: Telemetry }) {
  const score =
    (t.columnsOk ? 1 : 0) +
    (t.rowCountOk ? 1 : 0) +
    (t.orderOk ? 1 : 0);
  const percent = Math.round((score / 3) * 100);

  return (
    <div className="telemetry">
      <div className="telemetry-row">
        <div className="telemetry-item">
          <Dot state={t.columnsOk} /> Columns
          {t.expected?.columns?.length ? (
            <span className="small faint" style={{ marginLeft: 6 }}>
              expected: {t.expected.columns.join(', ')}
            </span>
          ) : null}
        </div>
        <div className="telemetry-item">
          <Dot state={t.rowCountOk} /> Row count
          {typeof t.expected?.rows === 'number' ? (
            <span className="small faint" style={{ marginLeft: 6 }}>
              expected: {t.expected.rows}
            </span>
          ) : null}
        </div>
        <div className="telemetry-item">
          <Dot state={t.orderOk} /> Order
        </div>
      </div>

      <div className="meter" aria-label="query integrity">
        <div className="bar" style={{ width: `${percent}%` }} />
      </div>

      {t.hint ? <div className="hint">💡 {t.hint}</div> : null}
      {!t.ran && <div className="small faint">Run your SQL to evaluate.</div>}
    </div>
  );
}
