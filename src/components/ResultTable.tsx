import React, { useMemo, useState } from 'react';

export type QueryResult = { columns: string[]; rows: any[][] };

interface Props {
  result: QueryResult | null;
  error?: string | null;
  title?: string;
  defaultLimit?: number; // initial visible row count
}

export default function ResultTable({ result, error, title, defaultLimit = 25 }: Props) {
  const [limit, setLimit] = useState<number>(defaultLimit);
  const [showAll, setShowAll] = useState<boolean>(false);

  const visibleRows = useMemo(() => {
    if (!result) return [];
    return showAll ? result.rows : result.rows.slice(0, limit);
  }, [result, limit, showAll]);

  if (error) {
    return (
      <div className="block" style={{ borderColor: '#5e1e1e' }}>
        <h3>{title ?? 'Result'}</h3>
        <div style={{ color: '#ffb4b4' }}>{error}</div>
      </div>
    );
  }
  if (!result) return null;
  const { columns, rows } = result;

  return (
    <div className="block result">
      <h3>{title ?? 'Result'}</h3>

      <div className="result-controls">
        <div className="small">{rows.length} row(s)</div>
        {!showAll && (
          <>
            <span className="small">• showing</span>
            <select value={String(limit)} onChange={(e) => setLimit(Number(e.target.value))}>
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="small">rows</span>
          </>
        )}
        <button onClick={() => setShowAll(!showAll)}>{showAll ? 'Show less' : 'Show all'}</button>
      </div>

      <div style={{ overflow: 'auto' }}>
        <table>
          <thead>
            <tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {visibleRows.map((r, idx) => (
              <tr key={idx}>
                {r.map((v, i) => <td key={i}>{v as any}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
