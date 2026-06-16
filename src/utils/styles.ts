// ── Shared style constants ────────────────────────────────────
// Import these instead of copy-pasting inline style objects

export const card: React.CSSProperties = {
  background: 'var(--surface)',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-sm)',
};

export const cardHover: React.CSSProperties = {
  ...card,
  transition: 'transform 0.2s, box-shadow 0.2s',
  cursor: 'pointer',
};

export const metricCard = (gradient: string): React.CSSProperties => ({
  padding: 20,
  borderRadius: 'var(--radius)',
  color: '#fff',
  background: gradient,
  position: 'relative',
  overflow: 'hidden',
  flex: 1,
  minWidth: 160,
});

export const sectionTitle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: '0.9rem',
  fontWeight: 700,
  color: 'var(--text-1)',
  marginBottom: 16,
};

export const tableHeader: React.CSSProperties = {
  padding: '10px 14px',
  textAlign: 'left',
  fontSize: '0.68rem',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--text-3)',
  background: 'var(--surface-2)',
};

export const tableCell: React.CSSProperties = {
  padding: '11px 14px',
  borderBottom: '1px solid var(--surface-3)',
  verticalAlign: 'middle',
};

export const badge = (bg: string, color: string): React.CSSProperties => ({
  background: bg,
  color,
  fontSize: '0.65rem',
  padding: '2px 8px',
  borderRadius: 8,
  fontWeight: 700,
  fontFamily: "'DM Mono', monospace",
  display: 'inline-block',
});

export const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: '1.5px solid var(--border)',
  borderRadius: 8,
  fontSize: '0.83rem',
  fontFamily: "'DM Sans', sans-serif",
  outline: 'none',
  background: 'var(--surface)',
  color: 'var(--text-1)',
};

export const btnPrimary: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 18px',
  background: 'linear-gradient(135deg,#0f2744,#1e3a5f)',
  color: '#fff',
  border: 'none',
  borderRadius: 9,
  fontSize: '0.83rem',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: "'DM Sans', sans-serif",
};

export const btnDanger: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 14px',
  background: '#fff1f2',
  color: '#dc2626',
  border: '1px solid #fecaca',
  borderRadius: 8,
  fontSize: '0.78rem',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: "'DM Sans', sans-serif",
};

export const btnSuccess: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  padding: '7px 14px',
  background: '#dcfce7',
  color: '#166534',
  border: 'none',
  borderRadius: 8,
  fontSize: '0.78rem',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: "'DM Sans', sans-serif",
};

// Need React for CSSProperties type
import type React from 'react';
