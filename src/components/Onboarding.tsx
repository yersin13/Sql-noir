import React, { useEffect, useRef, useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onStart: () => void; // jump to Chapter 1, Step 1
};

type TabId = 'role' | 'case' | 'data' | 'cast' | 'roadmap';

const TABS: { id: TabId; label: string }[] = [
  { id: 'role', label: 'Your Role' },
  { id: 'case', label: 'The Case' },
  { id: 'data', label: 'Data' },
  { id: 'cast', label: 'Cast' },
  { id: 'roadmap', label: 'Roadmap' }
];

export default function Onboarding({ open, onClose, onStart }: Props) {
  const [tab, setTab] = useState<TabId>('role');
  const firstBtn = useRef<HTMLButtonElement>(null);

  // Simple focus hint when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => firstBtn.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="guideTitle" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="guideTitle">SQL Noir — Case Dossier</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="tablist" role="tablist" aria-label="Guide tabs">
          {TABS.map((t, i) => (
            <button
              key={t.id}
              role="tab"
              ref={i === 0 ? firstBtn : undefined}
              aria-selected={tab === t.id}
              className={`tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="modal-body" role="tabpanel">
          {tab === 'role' && <RoleTab />}
          {tab === 'case' && <CaseTab />}
          {tab === 'data' && <DataTab />}
          {tab === 'cast' && <CastTab />}
          {tab === 'roadmap' && <RoadmapTab />}

          <div className="modal-actions">
            <button onClick={onClose}>Close</button>
            <button className="primary" onClick={onStart}>Start Chapter 1</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoleTab() {
  return (
    <div className="guide-section">
      <h3>Who you are</h3>
      <ul>
        <li><strong>Role:</strong> Off-site analyst (“the oracle”).</li>
        <li><strong>Primary tool:</strong> SQL. You question data, not people.</li>
        <li><strong>Loop:</strong> Read a <em>Plain Request</em> → write/run SQL → check → log a finding.</li>
      </ul>

      <h3>What you do</h3>
      <ul>
        <li>Turn everyday questions into precise queries.</li>
        <li>Produce small, verifiable findings that move the case forward.</li>
        <li>Keep notes tight: verb + evidence (auto-pinned to the Caseboard).</li>
      </ul>
    </div>
  );
}

function CaseTab() {
  return (
    <div className="guide-section">
      <h3>Case: “The Night Ledger”</h3>
      <ul>
        <li><strong>Incident:</strong> Power failure on <code>2025-08-27</code> late evening.</li>
        <li><strong>Concern:</strong> Timing inconsistencies across shift, door, and POS records.</li>
      </ul>

      <h4>Your immediate objective (Chapter 1)</h4>
      <ol>
        <li>Identify <em>who</em> worked that night.</li>
        <li>Isolate late departures and missing end times.</li>
        <li>Draft a small shortlist (edges &amp; gaps only).</li>
      </ol>

      <h4>Definition of “done” today</h4>
      <ul>
        <li>All Chapter 1 steps marked complete.</li>
        <li>Caseboard shows: roster, last-out, missing clock-outs, late starters, shortlist.</li>
      </ul>

      <h4>Why this matters</h4>
      <p>Clear roster + outliers provide a clean first pass before cross-checking other systems.</p>
    </div>
  );
}

function DataTab() {
  return (
    <div className="guide-section">
      <h3>Data you can query</h3>
      <ul>
        <li><code>shift_logs</code> — who worked, on what date, start/end times.</li>
        <li><code>access_logs</code> — door events (timestamp, door, action).</li>
        <li><code>pos_sessions</code> — POS login/logout windows by employee.</li>
        <li><code>insurance_claims</code> / <code>insurance_drafts</code> — paperwork timeline.</li>
        <li><code>police_reports</code> — external reports/times.</li>
      </ul>
      <p><strong>This chapter uses:</strong> <code>shift_logs</code> only. Keep it simple and correct.</p>
    </div>
  );
}

function CastTab() {
  return (
    <div className="guide-section">
      <h3>Cast (people you’ll see in the data)</h3>
      <ul>
        <li><strong>Jonah Ruiz</strong> — Manager (often last to leave)</li>
        <li><strong>Omar Haddad</strong> — Security (late exits, alley door)</li>
        <li><strong>Alex Vega</strong> — Bartender (appears on claims paperwork)</li>
        <li><strong>Riley Chen</strong> — Server (also prepares a later claim)</li>
        <li><strong>Kim Doyle</strong> — External insurance adjuster (not staff)</li>
      </ul>
      <p>Names help orient, but you only move on <em>data</em>.</p>
    </div>
  );
}

function RoadmapTab() {
  return (
    <div className="guide-section">
      <h3>How this becomes bigger</h3>
      <ol>
        <li><strong>Ch.1 — Night Ledger:</strong> single-table filters/sorts to find outliers.</li>
        <li><strong>Ch.2 — Ghost Shift:</strong> aggregates (COUNT/AVG/MIN/MAX) to see patterns.</li>
        <li><strong>Ch.3 — Cross-check:</strong> JOIN <code>shift_logs</code> ↔ <code>access_logs</code>/<code>pos_sessions</code>.</li>
        <li><strong>Ch.4–6:</strong> joins+GROUP BY, HAVING, time ranges, CTEs, EXISTS integrity checks.</li>
        <li><strong>Finale:</strong> multi-step CTE to prove the mastermind.</li>
      </ol>
      <p>Each step: one SQL skill, one investigative action, one clear output.</p>
    </div>
  );
}
