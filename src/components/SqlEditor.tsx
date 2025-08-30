import React from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  onCheck?: () => void;
  disabled?: boolean;
  /** Concept chips that insert only the keyword (encourages composing real SQL) */
  keywords?: string[];
}

export default function SqlEditor({
  value,
  onChange,
  onRun,
  onCheck,
  disabled,
  keywords = []
}: Props) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      onRun();
    }
    if (e.altKey && e.key.toLowerCase() === 'c' && onCheck) {
      e.preventDefault();
      onCheck();
    }
  }

  function insert(text: string) {
    const ta = document.querySelector(
      'textarea.sql-textarea'
    ) as HTMLTextAreaElement | null;
    if (!ta) {
      onChange(value + (value.endsWith('\n') ? '' : '\n') + text);
      return;
    }
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    const newVal = value.slice(0, start) + text + value.slice(end);
    onChange(newVal);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + text.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className="sql-editor block">
      <h3>Try it</h3>

      {keywords.length > 0 && (
        <div className="chips" style={{ marginBottom: 8 }}>
          {keywords.map((k, i) => (
            <button
              key={i}
              className="chip"
              type="button"
              onClick={() => insert(k + ' ')}
              title={`Insert "${k}"`}
            >
              {k}
            </button>
          ))}
        </div>
      )}

      <textarea
        className="sql-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        spellCheck={false}
      />

      <div className="row">
        <button className="primary" onClick={onRun} disabled={disabled} title="Ctrl+Enter">
          Run SQL
        </button>
        {onCheck && (
          <button onClick={onCheck} disabled={disabled} title="Alt+C">
            Check Answer
          </button>
        )}
        <span className="small" style={{ marginLeft: 8 }}>
          Shortcuts: <code>Ctrl+Enter</code> run, <code>Alt+C</code> check
        </span>
      </div>
    </div>
  );
}
