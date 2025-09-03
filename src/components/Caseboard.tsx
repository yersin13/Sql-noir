import React from 'react';

export type CaseNote = { id: string; text: string; ts: string };

interface Props {
  notes: CaseNote[];
  collapsed: boolean;
  onToggle: () => void;
  onClear: () => void;
  currentChapterId?: string; // ➕ optional, used to filter live pins
}

/**
 * Note id formats:
 *  - Live step pin:   `${chapId}-${stepId}-${timestamp}` e.g., "1-3-1693491200000"
 *  - Summary pin:     `S-${chapId}-${timestamp}`         e.g., "S-1-1693491200000"
 */
function parseLabel(id: string): { label: string } | null {
  if (id.startsWith('S-')) {
    const parts = id.split('-'); // S, chap, ts
    const chap = parts[1] || '?';
    const chapterLabel = chap === 'F' ? 'Finale' : `Ch ${chap}`;
    return { label: `${chapterLabel} · Summary` };
  }

  const parts = id.split('-');
  if (parts.length < 2) return null;
  const tsPart = parts[parts.length - 1];
  const isTs = /^\d{10,}$/.test(tsPart);
  const endIdx = isTs ? parts.length - 1 : parts.length;

  const chap = parts[0] || '';
  const stepPart = parts.slice(1, endIdx).join('-');
  let stepNo = stepPart.includes('-') ? stepPart.split('-')[1] : stepPart;
  if (!/^\d+$/.test(stepNo)) stepNo = stepPart || '?';

  const chapterLabel = chap === 'F' ? 'Finale' : `Ch ${chap}`;
  const stepLabel = chap === 'F' ? '—' : `Step ${stepNo}`;
  return { label: `${chapterLabel} · ${stepLabel}` };
}

export default function Caseboard({ notes, collapsed, onToggle, onClear, currentChapterId }: Props) {
  // Filter: show all summaries + only current chapter live pins
  const displayNotes = notes.filter(n => {
    if (n.id.startsWith('S-')) return true; // summaries always visible
    if (!currentChapterId) return true;      // fallback
    return n.id.startsWith(`${currentChapterId}-`);
  });

  return (
    <div className="panel right" aria-label="Caseboard">
      <div className="caseboard-header">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: '#b9ffea', fontWeight: 600 }}>Caseboard</span>
          <span className="small">chapter summaries & live pins</span>
        </div>
        <div className="row" style={{ marginTop: 0 }}>
          <button onClick={onToggle} aria-label="Toggle Caseboard">
            {collapsed ? 'Open' : 'Collapse'}
          </button>
          <button className="danger" onClick={onClear} aria-label="Clear Caseboard">Clear</button>
        </div>
      </div>

      {!collapsed && (
        <div className="caseboard-body">
          {displayNotes.length === 0 ? (
            <div className="small">No notes yet. When you pass a step, it will pin here. Finished chapters collapse to a single summary.</div>
          ) : (
            <>
              <div className="small faint" style={{ marginBottom: 8 }}>
                Summaries stay. Live pins show only for the current chapter.
              </div>
              <ul className="case-list">
                {displayNotes.map((n) => {
                  const meta = parseLabel(n.id);
                  const isSummary = n.id.startsWith('S-');
                  return (
                    <li key={n.id} className="case-note" aria-label={isSummary ? 'Chapter summary note' : 'Completed step note'}>
                      <div className="case-note-top">
                        <span className="check" aria-hidden>{isSummary ? '🗂️' : '✅'}</span>
                        <span className="title">{isSummary ? 'Chapter summary' : 'Step complete'}</span>
                        {meta && <span className="meta">{meta.label}</span>}
                        <span className="ts">{n.ts}</span>
                      </div>
                      <div className="case-note-text">{n.text}</div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="footer small">“The data never lies. People do.”</div>
    </div>
  );
}
