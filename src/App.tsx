import React, { useEffect, useMemo, useState } from 'react';
import type { Database } from 'sql.js';
import { initDb } from './db/initDb';
import StepCard, { Step } from './components/StepCard';
import Caseboard, { CaseNote } from './components/Caseboard';
import ProgressBar from './components/ProgressBar';

import { chapter1 } from './chapters/chapter1';
import { chapter2 } from './chapters/chapter2';
import { chapter3 } from './chapters/chapter3';
import { chapter4 } from './chapters/chapter4';
import { chapter5 } from './chapters/chapter5';
import { chapter6 } from './chapters/chapter6';
import { finale } from './chapters/finale';

type Chapter = { id: string; title: string; steps: Step[] };

const CHAPTERS: Chapter[] = [
  { id: '1', title: 'Chapter 1 — The Night Ledger', steps: chapter1 },
  { id: '2', title: 'Chapter 2 — Ghost Shift', steps: chapter2 },
  { id: '3', title: 'Chapter 3 — The Cross-check (Scaffold)', steps: chapter3 },
  { id: '4', title: 'Chapter 4 — The Paper Crown (Scaffold)', steps: chapter4 },
  { id: '5', title: 'Chapter 5 — Signal Bleed (Scaffold)', steps: chapter5 },
  { id: '6', title: 'Chapter 6 — False Mirror (Scaffold)', steps: chapter6 },
  { id: 'F', title: 'Finale — The Reckoning (Scaffold)', steps: finale }
];

const LS_PROGRESS = 'sql-noir-progress';
const LS_CASEBOARD = 'sql-noir-caseboard';
const LS_CASEBOARD_COLLAPSE = 'sql-noir-caseboard-collapsed';

type Progress = Record<string, Record<string, boolean>>; // {chapterId: {stepId: true}}

function loadProgress(): Progress {
  try {
    return JSON.parse(localStorage.getItem(LS_PROGRESS) || '{}') as Progress;
  } catch { return {}; }
}
function saveProgress(p: Progress) {
  localStorage.setItem(LS_PROGRESS, JSON.stringify(p));
}

function loadNotes(): CaseNote[] {
  try {
    return JSON.parse(localStorage.getItem(LS_CASEBOARD) || '[]') as CaseNote[];
  } catch { return []; }
}
function saveNotes(n: CaseNote[]) {
  localStorage.setItem(LS_CASEBOARD, JSON.stringify(n));
}

export default function App() {
  const [db, setDb] = useState<Database | null>(null);
  const [chapId, setChapId] = useState<string>('1');
  const [stepId, setStepId] = useState<string>(CHAPTERS[0].steps[0].id);
  const [progress, setProgress] = useState<Progress>(loadProgress());
  const [notes, setNotes] = useState<CaseNote[]>(loadNotes());
  const [collapsed, setCollapsed] = useState<boolean>(localStorage.getItem(LS_CASEBOARD_COLLAPSE) === '1');

  useEffect(() => {
    (async () => setDb(await initDb()))();
  }, []);

  const currentChapter = useMemo(
    () => CHAPTERS.find(c => c.id === chapId)!,
    [chapId]
  );
  const currentStep = useMemo(
    () => currentChapter.steps.find(s => s.id === stepId) ?? currentChapter.steps[0],
    [currentChapter, stepId]
  );
  const isStepDone = useMemo(
    () => !!progress[chapId]?.[currentStep.id],
    [progress, chapId, currentStep.id]
  );

  function markComplete(note: string) {
    const p = { ...progress, [chapId]: { ...(progress[chapId] || {}), [currentStep.id]: true } };
    setProgress(p); saveProgress(p);
    const newNote: CaseNote = { id: `${chapId}-${currentStep.id}-${Date.now()}`, text: note, ts: new Date().toLocaleString() };
    const newNotes = [newNote, ...notes].slice(0, 200);
    setNotes(newNotes); saveNotes(newNotes);
  }

  function toggleChapter(id: string) {
    setChapId(id);
    const firstId = CHAPTERS.find(c => c.id === id)!.steps[0].id;
    setStepId(firstId);
  }

  const doneCount = useMemo(() => {
    return CHAPTERS.reduce((acc, c) => acc + Object.values(progress[c.id] || {}).filter(Boolean).length, 0);
  }, [progress]);

  const totalCount = useMemo(() => CHAPTERS.reduce((acc, c) => acc + c.steps.length, 0), []);

  function clearNotes() {
    setNotes([]); saveNotes([]);
  }
  function toggleCollapse() {
    const v = !collapsed; setCollapsed(v);
    localStorage.setItem(LS_CASEBOARD_COLLAPSE, v ? '1' : '0');
  }

  return (
    <div className="app">
      {/* Sidebar */}
      <div className="panel sidebar">
        <h2>SQL Noir</h2>
        <div style={{ padding: '0 12px 12px' }}>
          <ProgressBar done={doneCount} total={totalCount} />
        </div>
        {CHAPTERS.map(ch => {
          const chDone = Object.values(progress[ch.id] || {}).filter(Boolean).length;
          return (
            <div className="chapter" key={ch.id}>
              <div className="chapter-header" onClick={() => toggleChapter(ch.id)}>
                <div className="chapter-title">{ch.title}</div>
                <div className="small">{chDone}/{ch.steps.length}</div>
              </div>
              {chapId === ch.id && (
                <div className="steps">
                  {ch.steps.map(s => {
                    const done = !!progress[ch.id]?.[s.id];
                    return (
                      <div
                        key={s.id}
                        className="step-link"
                        onClick={() => setStepId(s.id)}
                        style={{ background: stepId === s.id ? '#121b27' : undefined }}
                      >
                        <div className={`dot ${done ? 'done' : ''}`} />
                        <div className="small" style={{ color: stepId === s.id ? '#b9ffea' : undefined }}>{s.title}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        <div className="footer">“You’re off-site. They’re in the dark.”</div>
      </div>

      {/* Main */}
      <div className="panel main">
        {!db ? (
          <div className="block"><h3>Initializing database…</h3></div>
        ) : (
          <StepCard
            db={db}
            step={currentStep}
            completed={isStepDone}
            onComplete={markComplete}
          />
        )}
      </div>

      {/* Right: Caseboard */}
      <Caseboard notes={notes} collapsed={collapsed} onToggle={toggleCollapse} onClear={clearNotes} />
    </div>
  );
}
