// src/App.tsx
import React from 'react';
import type { Database } from 'sql.js';
import initDb from './db/initDb'; // ✅ default import
import StepCard, { Step } from './components/StepCard';
import Caseboard from './components/Caseboard';
import ProgressBar from './components/ProgressBar';
import MobileNav, { ChapterMeta } from './components/MobileNav'; // ✅ mobile navigator

import { chapter1 } from './chapters/chapter1';
import { chapter2 } from './chapters/chapter2';
import { chapter3 } from './chapters/chapter3';
import { chapter4 } from './chapters/chapter4';
import { chapter5 } from './chapters/chapter5';
import { chapter6 } from './chapters/chapter6';
import { finale } from './chapters/finale';

// Define locally (don’t import from Caseboard)
export type CaseNote = { id: string; text: string; ts: string };

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
const LAST_POS_KEY = 'sql-noir-lastpos';

type Progress = Record<string, Record<string, boolean>>; // {chapterId: {stepId: true}}

function loadProgress(): Progress {
  try { return JSON.parse(localStorage.getItem(LS_PROGRESS) || '{}') as Progress; }
  catch { return {}; }
}
function saveProgress(p: Progress) {
  localStorage.setItem(LS_PROGRESS, JSON.stringify(p));
}
function loadNotes(): CaseNote[] {
  try { return JSON.parse(localStorage.getItem(LS_CASEBOARD) || '[]') as CaseNote[]; }
  catch { return []; }
}
function saveNotes(n: CaseNote[]) {
  localStorage.setItem(LS_CASEBOARD, JSON.stringify(n));
}

export default function App() {
  const [db, setDb] = React.useState<Database | null>(null);
  const [progress, setProgress] = React.useState<Progress>(loadProgress());
  const [notes, setNotes] = React.useState<CaseNote[]>(loadNotes());
  const [collapsed, setCollapsed] = React.useState<boolean>(localStorage.getItem(LS_CASEBOARD_COLLAPSE) === '1');

  // Mobile overlay toggles (sidebar/caseboard)
  const [mobileNav, setMobileNav] = React.useState<null | 'left' | 'right'>(null);

  // Persist last position (chapter + step)
  const [pos, setPos] = React.useState(() => {
    try {
      const raw = localStorage.getItem(LAST_POS_KEY);
      if (raw) return JSON.parse(raw) as { chapterIndex: number; stepIndex: number };
    } catch {}
    return { chapterIndex: 0, stepIndex: 0 };
  });

  React.useEffect(() => {
    let mounted = true;
    initDb().then((d) => { if (mounted) setDb(d); });
    return () => { mounted = false; };
  }, []);

  React.useEffect(() => {
    localStorage.setItem(LAST_POS_KEY, JSON.stringify(pos));
  }, [pos]);

  const chapters: ChapterMeta[] = React.useMemo(() =>
    CHAPTERS.map(c => ({ id: c.id, title: c.title, steps: c.steps })), []);

  const currentChapter = CHAPTERS[pos.chapterIndex];
  const currentStep = currentChapter.steps[pos.stepIndex];
  const isStepDone = !!progress[currentChapter.id]?.[currentStep.id];

  function markComplete(note: string) {
    const p = { ...progress, [currentChapter.id]: { ...(progress[currentChapter.id] || {}), [currentStep.id]: true } };
    setProgress(p); saveProgress(p);
    const newNote: CaseNote = { id: `${currentChapter.id}-${currentStep.id}-${Date.now()}`, text: note, ts: new Date().toLocaleString() };
    const newNotes = [newNote, ...notes].slice(0, 200);
    setNotes(newNotes); saveNotes(newNotes);
  }

  function onJump(chapterIndex: number, stepIndex: number) {
    setPos({ chapterIndex, stepIndex });
    setMobileNav(null);
  }
  function onPrev() {
    let c = pos.chapterIndex;
    let s = pos.stepIndex - 1;
    if (s < 0) {
      if (c === 0) return;
      c -= 1; s = CHAPTERS[c].steps.length - 1;
    }
    setPos({ chapterIndex: c, stepIndex: s });
  }
  function onNext() {
    let c = pos.chapterIndex;
    let s = pos.stepIndex + 1;
    if (s >= CHAPTERS[c].steps.length) {
      if (c >= CHAPTERS.length - 1) return;
      c += 1; s = 0;
    }
    setPos({ chapterIndex: c, stepIndex: s });
  }

  const doneCount = React.useMemo(() =>
    CHAPTERS.reduce((acc, c) => acc + Object.values(progress[c.id] || {}).filter(Boolean).length, 0),
    [progress]
  );
  const totalCount = React.useMemo(() =>
    CHAPTERS.reduce((acc, c) => acc + c.steps.length, 0), []);

  function clearNotes() { setNotes([]); saveNotes([]); }
  function toggleCollapse() {
    const v = !collapsed; setCollapsed(v);
    localStorage.setItem(LS_CASEBOARD_COLLAPSE, v ? '1' : '0');
  }

  return (
    <div className={`app ${mobileNav === 'left' ? 'show-sidebar' : ''} ${mobileNav === 'right' ? 'show-caseboard' : ''}`}>
      {/* Mobile top bar */}
      <div className="topbar">
        <div className="row">
          <button onClick={() => setMobileNav(mobileNav === 'left' ? null : 'left')}>☰ Menu</button>
          <div className="brand">SQL Noir</div>
          <div style={{ marginLeft: 'auto' }}>
            <button onClick={() => setMobileNav(mobileNav === 'right' ? null : 'right')}>📌 Caseboard</button>
          </div>
        </div>
      </div>

      {/* Sidebar (chapters/steps) */}
      <aside className="sidebar" aria-label="Chapters and steps">
        <h2 style={{ marginTop: 0 }}>SQL Noir</h2>
        <div style={{ padding: '0 12px 12px' }}>
          <ProgressBar done={doneCount} total={totalCount} />
        </div>

        {CHAPTERS.map((ch, ci) => {
          const chDone = Object.values(progress[ch.id] || {}).filter(Boolean).length;
          const open = ci === pos.chapterIndex;
          return (
            <div className="chapter" key={ch.id}>
              <div className="chapter-header" onClick={() => onJump(ci, 0)}>
                <div className="chapter-title">{ch.title}</div>
                <div className="small">{chDone}/{ch.steps.length}</div>
              </div>
              {open && (
                <div className="steps">
                  {ch.steps.map((s, si) => {
                    const done = !!progress[ch.id]?.[s.id];
                    const active = open && si === pos.stepIndex;
                    return (
                      <div
                        key={s.id}
                        className="step-link"
                        onClick={() => onJump(ci, si)}
                        style={{ background: active ? '#121b27' : undefined }}
                      >
                        <div className={`dot ${done ? 'done' : ''}`} />
                        <div className="small" style={{ color: active ? '#b9ffea' : undefined }}>
                          {si + 1}. {s.title}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        <div className="footer">“You’re off-site. They’re in the dark.”</div>
      </aside>

      {/* Main */}
      <main className="main" onClick={() => setMobileNav(null)}>
        <div style={{ marginBottom: 10 }}>
          {/* If you have a chapter-level progress bar component, keep it here */}
        </div>

        {!db ? (
          <div className="step-card"><h3>Initializing database…</h3></div>
        ) : (
          <StepCard
            db={db}
            step={currentStep}
            completed={isStepDone}
            onComplete={markComplete}
          />
        )}

        {/* Mobile bottom navigator */}
        <MobileNav
          chapters={chapters}
          currentChapterIndex={pos.chapterIndex}
          currentStepIndex={pos.stepIndex}
          onJump={onJump}
          onPrev={onPrev}
          onNext={onNext}
        />
      </main>

      {/* Caseboard (right) */}
      <Caseboard notes={notes} collapsed={collapsed} onToggle={toggleCollapse} onClear={clearNotes} />
    </div>
  );
}
