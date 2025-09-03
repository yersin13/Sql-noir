import React, { useEffect, useMemo, useState } from 'react';
import type { Database } from 'sql.js';
import initDb from './db/initDb';

import StepCard, { Step } from './components/StepCard';
import Caseboard, { CaseNote } from './components/Caseboard';
import ProgressBar from './components/ProgressBar';

import NarrativeOverlay from './components/NarrativeOverlay';
import { PROLOGUE, CH1_EPILOGUE, CH2_HOOK } from './story/narratives';

import { chapter1 } from './chapters/chapter1';
import { chapter2 } from './chapters/chapter2';
import { chapter3 } from './chapters/chapter3';
import { chapter4 } from './chapters/chapter4';
import { chapter5 } from './chapters/chapter5';
import { chapter6 } from './chapters/chapter6';
import { finale } from './chapters/finale';

// ➕ MOBILE NAV import (new)
import MobileNav, { ChapterMeta } from './components/MobileNav';

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

const SEEN_PROLOGUE = 'sql-noir:seen:prologue';
const SEEN_CH1_EPILOGUE = 'sql-noir:seen:ch1-epilogue';
const SEEN_CH2_HOOK = 'sql-noir:seen:ch2-hook';

type Progress = Record<string, Record<string, boolean>>; // {chapterId: {stepId: true}}

function loadProgress(): Progress {
  try { return JSON.parse(localStorage.getItem(LS_PROGRESS) || '{}') as Progress; }
  catch { return {}; }
}
function saveProgress(p: Progress) { localStorage.setItem(LS_PROGRESS, JSON.stringify(p)); }

function loadNotes(): CaseNote[] {
  try { return JSON.parse(localStorage.getItem(LS_CASEBOARD) || '[]') as CaseNote[]; }
  catch { return []; }
}
function saveNotes(n: CaseNote[]) { localStorage.setItem(LS_CASEBOARD, JSON.stringify(n)); }

// ➕ Chapter summary text and helper
const CHAPTER_SUMMARY: Record<string, string> = {
  '1': 'Roster confirmed. Outliers flagged (late exits, missing clock_outs, late starts). Shortlist created.',
  '2': 'Thirty-day baselines computed. Anomalies vs personal norms identified.',
  '3': 'Shifts cross-checked with door and POS. Inconsistencies flagged.',
  '4': 'Insurance drafts/claims analyzed. Paperwork anomalies surfaced.',
  '5': 'Critical time windows isolated. Opportunity overlaps mapped.',
  '6': 'Integrity checks complete. Data failures aligned with anomalies.',
  'F': 'Final synthesis prepared. Ranked list with reasons and timestamps.'
};
function isChapterComplete(chId: string, prog: Progress): boolean {
  const chapter = CHAPTERS.find(c => c.id === chId);
  if (!chapter) return false;
  const done = Object.values(prog[chId] || {}).filter(Boolean).length;
  return done >= chapter.steps.length;
}

export default function App() {
  const [db, setDb] = useState<Database | null>(null);
  const [chapId, setChapId] = useState<string>('1');
  const [stepId, setStepId] = useState<string>(CHAPTERS[0].steps[0].id);

  const [progress, setProgress] = useState<Progress>(loadProgress());
  const [notes, setNotes] = useState<CaseNote[]>(loadNotes());
  const [collapsed, setCollapsed] = useState<boolean>(localStorage.getItem(LS_CASEBOARD_COLLAPSE) === '1');

  // Narrative overlays
  const [showPrologue, setShowPrologue] = useState<boolean>(() => localStorage.getItem(SEEN_PROLOGUE) !== '1');
  const [showCh1Epilogue, setShowCh1Epilogue] = useState<boolean>(false);
  const [showCh2Hook, setShowCh2Hook] = useState<boolean>(false);

  useEffect(() => { (async () => setDb(await initDb()))(); }, []);

  const currentChapter = useMemo(() => CHAPTERS.find(c => c.id === chapId)!, [chapId]);
  const currentStep = useMemo(() => currentChapter.steps.find(s => s.id === stepId) ?? currentChapter.steps[0], [currentChapter, stepId]);
  const isStepDone = useMemo(() => !!progress[chapId]?.[currentStep.id], [progress, chapId, currentStep.id]);

  const chapter1DoneCount = useMemo(() => Object.values(progress['1'] || {}).filter(Boolean).length, [progress]);
  const isChapter1Complete = chapter1DoneCount >= CHAPTERS[0].steps.length;

  // If Chapter 1 is complete and epilogue not shown yet, pop it
  useEffect(() => {
    if (isChapter1Complete && localStorage.getItem(SEEN_CH1_EPILOGUE) !== '1') {
      setShowCh1Epilogue(true);
    }
  }, [isChapter1Complete]);

  // When user enters Chapter 2 first time, show hook if not seen
  useEffect(() => {
    if (chapId === '2' && localStorage.getItem(SEEN_CH2_HOOK) !== '1') {
      setShowCh2Hook(true);
    }
  }, [chapId]);

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

  const doneCount = useMemo(() => CHAPTERS.reduce((acc, c) => acc + Object.values(progress[c.id] || {}).filter(Boolean).length, 0), [progress]);
  const totalCount = useMemo(() => CHAPTERS.reduce((acc, c) => acc + c.steps.length, 0), []);

  function clearNotes() { setNotes([]); saveNotes([]); }
  function toggleCollapse() {
    const v = !collapsed; setCollapsed(v);
    localStorage.setItem(LS_CASEBOARD_COLLAPSE, v ? '1' : '0');
  }

  async function resetGame() {
    const yes = window.confirm('Reset all progress and re-seed the database? This cannot be undone.');
    if (!yes) return;

    try { (db as any)?.close?.(); } catch {}

    // Wipe app keys
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)!;
      if (k && k.startsWith('sql-noir')) localStorage.removeItem(k);
    }

    setProgress({}); setNotes([]); setCollapsed(false);
    setChapId('1'); setStepId(CHAPTERS[0].steps[0].id);

    // Re-show prologue after reset
    setShowPrologue(true);
    setShowCh1Epilogue(false);
    setShowCh2Hook(false);

    setDb(null);
    const fresh = await initDb();
    setDb(fresh);
  }

  // ➕ MOBILE NAV helpers (new)
  const chapterIndex = useMemo(
    () => CHAPTERS.findIndex(c => c.id === chapId),
    [chapId]
  );
  const stepIndex = useMemo(
    () => Math.max(0, currentChapter.steps.findIndex(s => s.id === stepId)),
    [currentChapter, stepId]
  );

  function onJump(chIdx: number, stIdx: number) {
    const ch = CHAPTERS[chIdx];
    if (!ch) return;
    setChapId(ch.id);
    const targetStep = ch.steps[stIdx]?.id ?? ch.steps[0].id;
    setStepId(targetStep);
  }

  function onPrev() {
    let c = chapterIndex;
    let s = stepIndex - 1;
    if (s < 0) {
      if (c === 0) return;
      c -= 1; s = CHAPTERS[c].steps.length - 1;
    }
    onJump(c, s);
  }

  function onNext() {
    let c = chapterIndex;
    let s = stepIndex + 1;
    if (s >= CHAPTERS[c].steps.length) {
      if (c >= CHAPTERS.length - 1) return;
      c += 1; s = 0;
    }
    onJump(c, s);
  }

  // ➕ Roll up completed chapters into a single summary pin
  function rollupChapter(chId: string) {
    // already summarized?
    if (notes.some(n => n.id.startsWith(`S-${chId}-`))) return;
    // has live pins for this chapter?
    const hasLivePins = notes.some(n => n.id.startsWith(`${chId}-`));
    if (!hasLivePins) return;

    const summaryText = CHAPTER_SUMMARY[chId] || `Chapter ${chId} complete. Pins archived.`;
    const summary: CaseNote = {
      id: `S-${chId}-${Date.now()}`,
      text: summaryText,
      ts: new Date().toLocaleString()
    };

    const pruned = notes.filter(n => !n.id.startsWith(`${chId}-`));
    const updated = [summary, ...pruned];
    setNotes(updated);
    saveNotes(updated);
  }

  useEffect(() => {
    // Check all chapters; roll up any newly completed one
    CHAPTERS.forEach(c => {
      if (isChapterComplete(c.id, progress)) {
        rollupChapter(c.id);
      }
    });
  }, [progress]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="app">
      {/* Sidebar */}
      <div className="panel sidebar">
        <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <h2>SQL Noir</h2>
          <button className="danger tiny" onClick={resetGame} title="Reset progress and database">Reset</button>
        </div>
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
        <div className="footer">Plain requests → clear queries → small wins.</div>
      </div>

      {/* Main */}
      <div className="panel main">
        {!db ? (
          <div className="block"><h3>Initializing database…</h3></div>
        ) : (
          <>
            <StepCard
              db={db}
              step={currentStep}
              completed={isStepDone}
              onComplete={markComplete}
            />
            {/* ➕ Mobile-only bottom navigator */}
            <MobileNav
              chapters={CHAPTERS as unknown as ChapterMeta[]}
              currentChapterIndex={chapterIndex}
              currentStepIndex={stepIndex}
              onJump={onJump}
              onPrev={onPrev}
              onNext={onNext}
            />
          </>
        )}
      </div>

      {/* Caseboard */}
      <Caseboard
        notes={notes}
        collapsed={collapsed}
        onToggle={toggleCollapse}
        onClear={clearNotes}
        currentChapterId={chapId}  // ➕ filter to current chapter’s live pins
      />

      {/* PROLOGUE (shows once on first load or after Reset) */}
      {showPrologue && (
        <NarrativeOverlay
          open={showPrologue}
          title={PROLOGUE.title}
          paragraphs={PROLOGUE.paragraphs}
          onClose={() => { localStorage.setItem(SEEN_PROLOGUE, '1'); setShowPrologue(false); }}
          ctaLabel={PROLOGUE.ctaLabel}
          onCta={() => {
            localStorage.setItem(SEEN_PROLOGUE, '1');
            setShowPrologue(false);
            setChapId('1');
            setStepId(CHAPTERS[0].steps[0].id);
          }}
        />
      )}

      {/* CH1 EPILOGUE (auto after all Ch1 steps complete) */}
      {showCh1Epilogue && (
        <NarrativeOverlay
          open={showCh1Epilogue}
          title={CH1_EPILOGUE.title}
          paragraphs={CH1_EPILOGUE.paragraphs}
          onClose={() => { localStorage.setItem(SEEN_CH1_EPILOGUE, '1'); setShowCh1Epilogue(false); }}
          ctaLabel={CH1_EPILOGUE.ctaLabel}
          onCta={() => {
            localStorage.setItem(SEEN_CH1_EPILOGUE, '1');
            setShowCh1Epilogue(false);
            setChapId('2');
            setStepId(CHAPTERS[1].steps[0].id);
          }}
        />
      )}

      {/* CH2 HOOK (first time Chapter 2 opens) */}
      {showCh2Hook && (
        <NarrativeOverlay
          open={showCh2Hook}
          title={CH2_HOOK.title}
          paragraphs={CH2_HOOK.paragraphs}
          onClose={() => { localStorage.setItem(SEEN_CH2_HOOK, '1'); setShowCh2Hook(false); }}
          ctaLabel={CH2_HOOK.ctaLabel}
          onCta={() => {
            localStorage.setItem(SEEN_CH2_HOOK, '1');
            setShowCh2Hook(false);
          }}
        />
      )}
    </div>
  );
}
