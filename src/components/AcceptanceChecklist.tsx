import React from 'react';

export type TestItem = { id: string; label: string; ok: boolean | null };

export default function AcceptanceChecklist({ tests }: { tests: TestItem[] }) {
  return (
    <div className="block">
      <h3>Acceptance Tests</h3>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {tests.map(t => (
          <li key={t.id} style={{ color: t.ok == null ? '#9fb1c0' : t.ok ? '#77ffb3' : '#ffb4b4' }}>
            {t.ok == null ? '•' : t.ok ? '✔' : '✖'} {t.label}
          </li>
        ))}
      </ul>
      <div className="small" style={{ marginTop: 6 }}>Run your query to evaluate.</div>
    </div>
  );
}
