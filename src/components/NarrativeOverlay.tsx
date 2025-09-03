import React from 'react';

type Props = {
  open: boolean;
  title: string;
  paragraphs: string[];
  onClose: () => void;
  ctaLabel?: string;
  onCta?: () => void;
};

export default function NarrativeOverlay({ open, title, paragraphs, onClose, ctaLabel = 'Close', onCta }: Props) {
  if (!open) return null;
  return (
    <div className="modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          <div className="story-block">
            {paragraphs.map((p, i) => <p key={i} className="story-line">{p}</p>)}
          </div>
          <div className="modal-actions">
            <button onClick={onClose}>Dismiss</button>
            {onCta && <button className="primary" onClick={onCta}>{ctaLabel}</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
