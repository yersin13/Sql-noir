import React from 'react';
import type { Step } from './StepCard';

export type ChapterMeta = {
  id: string;
  title: string;
  steps: Step[];
};

type Props = {
  chapters: ChapterMeta[];
  currentChapterIndex: number;
  currentStepIndex: number;
  onJump: (chapterIdx: number, stepIdx: number) => void;
  onPrev: () => void;
  onNext: () => void;
};

export default function MobileNav({
  chapters,
  currentChapterIndex,
  currentStepIndex,
  onJump,
  onPrev,
  onNext
}: Props) {
  const ch = chapters[currentChapterIndex];

  return (
    <div className="mobile-nav" role="navigation" aria-label="Mobile chapter and step navigation">
      <button className="nav-btn" onClick={onPrev} aria-label="Previous step">◀ Prev</button>

      <div className="nav-selects">
        <label className="visually-hidden" htmlFor="chapterSel">Chapter</label>
        <select
          id="chapterSel"
          className="nav-select"
          value={currentChapterIndex}
          onChange={(e) => onJump(Number(e.target.value), 0)}
        >
          {chapters.map((c, idx) => (
            <option key={c.id} value={idx}>
              {c.title}
            </option>
          ))}
        </select>

        <label className="visually-hidden" htmlFor="stepSel">Step</label>
        <select
          id="stepSel"
          className="nav-select"
          value={currentStepIndex}
          onChange={(e) => onJump(currentChapterIndex, Number(e.target.value))}
        >
          {ch.steps.map((s, idx) => (
            <option key={s.id} value={idx}>
              {idx + 1}. {shorten(s.title)}
            </option>
          ))}
        </select>
      </div>

      <button className="nav-btn" onClick={onNext} aria-label="Next step">Next ▶</button>
    </div>
  );
}

function shorten(t: string) {
  // keep it readable on small screens
  if (t.length <= 40) return t;
  return t.slice(0, 38).trimEnd() + '…';
}
