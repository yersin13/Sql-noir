import React from 'react';

export type CaseNote = { id: string; text: string; ts: string };

interface Props {
  notes: CaseNote[];
  collapsed: boolean;
  onToggle: () => void;
  onClear: () => void;
}

export default function Caseboard({ notes, collapsed, onToggle, onClear }: Props) {
  return (
    <div className="panel right">
      <div className="caseboard-header">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: '#b9ffea' }}>Caseboard</span>
          <span className="small">pins & notes</span>
        </div>
        <div className="row" style={{ marginTop: 0 }}>
          <button onClick={onToggle}>{collapsed ? 'Open' : 'Collapse'}</button>
          <button className="danger" onClick={onClear}>Clear</button>
        </div>
      </div>
      {!collapsed && (
        <div className="caseboard-body">
          {notes.length === 0 && <div className="small">No notes yet. Complete steps to add leads.</div>}
          {notes.map((n) => (
            <div className="case-note" key={n.id}>
              <div style={{ fontSize: 12, color: '#9fb1c0', marginBottom: 4 }}>{n.ts}</div>
              <div>{n.text}</div>
            </div>
          ))}
        </div>
      )}
      <div className="footer">“The data never lies. People do.”</div>
    </div>
  );
}
