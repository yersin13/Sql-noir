import React from 'react';

type Props = {
  open: boolean;
  onFinish: () => void;
  cta?: string;            // final prompt text (plain request)
  allowName?: boolean;     // optional name capture
};

export default function ColdOpen({ open, onFinish, cta, allowName = false }: Props) {
  const [i, setI] = React.useState(0);
  const [name, setName] = React.useState<string>(() => localStorage.getItem('sql-noir:analyst-name') || '');
  const slides: { img: string; lines: string[]; meta?: string; askName?: boolean }[] = [
    { img: '/intro/01-call.svg', lines: ['The night is short. The call isn’t.'], meta: 'Aug 27, 22:41 — Emergency Call' },
    { img: '/intro/02-scene.svg', lines: ['Scene: pawnshop. Evidence says: not an accident.'] },
    { img: '/intro/03-ask.svg', lines: ['Police escalate. They need timelines they can trust.'] },
    { img: '/intro/04-console.svg', lines: ['I’m the analyst. I work in facts.'], askName: allowName }
  ];

  if (!open) return null;
  const s = slides[Math.min(i, slides.length - 1)];
  const last = i >= slides.length - 1;

  function next() {
    if (s.askName) {
      localStorage.setItem('sql-noir:analyst-name', name || 'Analyst');
    }
    if (last) onFinish();
    else setI(i + 1);
  }

  return (
    <div className="co-backdrop" onClick={next}>
      <div className="co-card" onClick={(e) => e.stopPropagation()}>
        <div className="co-frame">
          <img src={s.img} alt="" />
        </div>

        {s.meta && <div className="co-meta">{s.meta}</div>}

        <div className="co-lines">
          {s.lines.map((line, idx) => (
            <p key={idx}>{line.replace('I’m the analyst', `I’m ${name || 'the analyst'}`)}</p>
          ))}
          {s.askName && (
            <div className="co-name">
              <label className="small">Your name (optional)</label>
              <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Type a name or leave blank" />
            </div>
          )}
        </div>

        <div className="co-controls">
          <button onClick={() => onFinish()} aria-label="Skip">Skip</button>
          {!last ? (
            <button className="primary" onClick={next} aria-label="Next">Next ▶</button>
          ) : (
            <button className="primary" onClick={onFinish} aria-label="Start">Start Analysis</button>
          )}
        </div>

        {last && cta && (
          <div className="co-cta">
            <div className="co-cta-title">Plain Request</div>
            <div className="co-cta-text">{cta}</div>
          </div>
        )}

        <div className="co-dots">
          {slides.map((_, idx) => <span key={idx} className={`dot ${idx === i ? 'on' : ''}`} />)}
        </div>
      </div>
    </div>
  );
}
