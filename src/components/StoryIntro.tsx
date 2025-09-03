import React from 'react';

export type IntroScreen = {
  image?: string;
  alt?: string;
  title?: string;
  text: string;
};

type Props = {
  screens: IntroScreen[];
  onFinish: () => void;
};

export default function StoryIntro({ screens, onFinish }: Props) {
  const [i, setI] = React.useState(0);
  const last = i === screens.length - 1;
  const s = screens[i];

  return (
    <div className="intro">
      <div className="intro-card">
        {s.image && (
          <div className="intro-img">
            <img src={s.image} alt={s.alt || 'story image'} />
          </div>
        )}
        {s.title && <h3 className="intro-title">{s.title}</h3>}
        <p className="intro-text">{s.text}</p>
        <div className="intro-actions">
          {i > 0 && (
            <button type="button" onClick={() => setI((x) => Math.max(0, x - 1))}>
              ◀ Back
            </button>
          )}
          {!last ? (
            <button type="button" className="primary" onClick={() => setI((x) => Math.min(screens.length - 1, x + 1))}>
              Next ▶
            </button>
          ) : (
            <button type="button" className="primary" onClick={onFinish}>
              Start the step
            </button>
          )}
        </div>
        <div className="intro-dots" aria-label="progress">
          {screens.map((_, idx) => (
            <span key={idx} className={`dot ${idx === i ? 'on' : ''}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
