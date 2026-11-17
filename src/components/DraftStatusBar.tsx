// ============================================================
// M03 — Draft status shown on the report form ("Show draft status in
// the toolkit"). Saved / saving / not saved (retrying) / conflict with
// another device, plus "Discard draft".
// ============================================================

import React from 'react';
import type { DraftStatus } from '../hooks/useDraftAutosave';

export default function DraftStatusBar({
  status,
  savedAt,
  error,
  hasDraft,
  onKeepMine,
  onTakeTheirs,
  onDiscard,
}: {
  status: DraftStatus;
  savedAt: Date | null;
  error: string | null;
  hasDraft: boolean;
  onKeepMine: () => void;
  onTakeTheirs: () => void;
  onDiscard: () => void;
}) {
  const time = savedAt
    ? savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  if (status === 'conflict') {
    return (
      <div
        role="alert"
        style={{
          background: '#fef3c7',
          border: '1px solid #fcd34d',
          borderRadius: 8,
          padding: '10px 12px',
          fontSize: '0.8rem',
          marginBottom: 14,
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ flex: 1, minWidth: 220 }}>
          This draft was changed on another device or tab. Auto-save is paused so nothing is
          overwritten.
        </span>
        <button type="button" onClick={onTakeTheirs} style={btn(false)}>
          Load the other version
        </button>
        <button type="button" onClick={onKeepMine} style={btn(true)}>
          Keep mine
        </button>
      </div>
    );
  }

  const text =
    status === 'saving'
      ? 'Saving draft…'
      : status === 'saved'
        ? `Draft saved ${time}`
        : status === 'error'
          ? `Not saved yet — retrying${error ? ` (${error})` : ''}`
          : 'Your work is saved as a draft as you type';
  const color = status === 'error' ? '#b45309' : status === 'saved' ? '#15803d' : '#64748b';

  return (
    <div
      aria-live="polite"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.74rem',
        color,
        marginBottom: 14,
        gap: 10,
      }}
    >
      <span>
        <i
          className={`fa-solid ${status === 'error' ? 'fa-triangle-exclamation' : 'fa-cloud-arrow-up'}`}
          style={{ marginRight: 6 }}
        />
        {text}
      </span>
      {hasDraft && (
        <button
          type="button"
          onClick={onDiscard}
          style={{ ...btn(false), fontSize: '0.72rem', padding: '3px 9px' }}
        >
          Discard draft
        </button>
      )}
    </div>
  );
}

function btn(primary: boolean): React.CSSProperties {
  return {
    padding: '5px 11px',
    borderRadius: 7,
    border: primary ? 'none' : '1px solid #e2e8f0',
    background: primary ? '#1e3a5f' : '#fff',
    color: primary ? '#fff' : '#334155',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.76rem',
  };
}
