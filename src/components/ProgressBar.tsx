import React from 'react';

interface Props {
  done: number;
  total: number;
}

export default function ProgressBar({ done, total }: Props) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div>
      <div className="progress"><div style={{ width: `${pct}%` }} /></div>
      <div className="small" style={{ marginTop: 6 }}>{done}/{total} complete</div>
    </div>
  );
}
