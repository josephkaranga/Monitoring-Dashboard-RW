import React, { useState, useCallback, useMemo } from 'react';

interface TimeSliderProps {
  minDate: Date;
  maxDate: Date;
  value: [Date, Date];
  onChange: (range: [Date, Date]) => void;
  totalCount: number;
  filteredCount: number;
}

function formatShort(d: Date): string {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

export const TimeSlider = React.memo(function TimeSlider({
  minDate,
  maxDate,
  value,
  onChange,
  totalCount,
  filteredCount,
}: TimeSliderProps) {
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);

  const minMs = minDate.getTime();
  const maxMs = maxDate.getTime();
  const rangeMs = maxMs - minMs || 1;

  const startPct = ((value[0].getTime() - minMs) / rangeMs) * 100;
  const endPct = ((value[1].getTime() - minMs) / rangeMs) * 100;

  const msToDate = useCallback(
    (ms: number) => {
      return new Date(Math.max(minMs, Math.min(maxMs, ms)));
    },
    [minMs, maxMs]
  );

  const handleStartChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const pct = Number(e.target.value);
      const ms = minMs + (pct / 100) * rangeMs;
      const d = msToDate(ms);
      if (d.getTime() <= value[1].getTime()) {
        onChange([d, value[1]]);
      }
    },
    [minMs, rangeMs, msToDate, value, onChange]
  );

  const handleEndChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const pct = Number(e.target.value);
      const ms = minMs + (pct / 100) * rangeMs;
      const d = msToDate(ms);
      if (d.getTime() >= value[0].getTime()) {
        onChange([value[0], d]);
      }
    },
    [minMs, rangeMs, msToDate, value, onChange]
  );

  const presets = useMemo(() => {
    const now = new Date();
    const thisYear = new Date(now.getFullYear(), 0, 1);
    const lastYear = new Date(now.getFullYear() - 1, 0, 1);
    const last6m = new Date(now.getTime() - 180 * 86400000);
    return [
      { label: 'All', range: [minDate, maxDate] as [Date, Date] },
      { label: 'This year', range: [thisYear, maxDate] as [Date, Date] },
      { label: 'Last year', range: [lastYear, thisYear] as [Date, Date] },
      { label: 'Last 6 months', range: [last6m, maxDate] as [Date, Date] },
    ];
  }, [minDate, maxDate]);

  const isAllTime = value[0].getTime() <= minMs && value[1].getTime() >= maxMs;

  return (
    <div
      style={{
        padding: '10px 14px',
        background: 'var(--surface-2)',
        borderRadius: 8,
        border: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.72rem',
            fontWeight: 700,
            color: 'var(--text-1)',
            fontFamily: "'DM Mono', monospace",
          }}
        >
          <i
            className="fa-solid fa-clock-rotate-left"
            style={{ color: 'var(--sky-dim)', fontSize: '0.68rem' }}
          />
          TIME RANGE
        </div>
        <div
          style={{
            fontSize: '0.68rem',
            color: 'var(--text-3)',
            fontFamily: "'DM Mono', monospace",
          }}
        >
          {filteredCount}/{totalCount} reports
        </div>
      </div>

      {/* Preset buttons */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {presets.map(p => {
          const active =
            p.label === 'All'
              ? isAllTime
              : value[0].getTime() === p.range[0].getTime() &&
                value[1].getTime() === p.range[1].getTime();
          return (
            <button
              key={p.label}
              onClick={() => onChange(p.range)}
              style={{
                padding: '3px 8px',
                borderRadius: 5,
                fontSize: '0.65rem',
                fontWeight: 600,
                border: active ? '1px solid var(--sky-dim)' : '1px solid var(--border)',
                background: active ? 'rgba(14,165,233,0.1)' : 'var(--surface)',
                color: active ? 'var(--sky-dim)' : 'var(--text-2)',
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Dual range display */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-1)' }}>
          {formatShort(value[0])}
        </span>
        <span style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>—</span>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-1)' }}>
          {formatShort(value[1])}
        </span>
      </div>

      {/* Slider track */}
      <div style={{ position: 'relative', height: 20, marginBottom: 4 }}>
        {/* Track background */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 0,
            right: 0,
            height: 4,
            borderRadius: 2,
            background: 'var(--border)',
          }}
        />
        {/* Active range */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: `${startPct}%`,
            width: `${endPct - startPct}%`,
            height: 4,
            borderRadius: 2,
            background: 'var(--sky-dim)',
          }}
        />

        {/* Start handle */}
        <input
          type="range"
          min={0}
          max={100}
          step={0.5}
          value={startPct}
          onChange={handleStartChange}
          onMouseDown={() => setDragging('start')}
          onMouseUp={() => setDragging(null)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: 20,
            opacity: 0,
            cursor: 'pointer',
            zIndex: 2,
          }}
          aria-label="Start date"
        />
        {/* End handle */}
        <input
          type="range"
          min={0}
          max={100}
          step={0.5}
          value={endPct}
          onChange={handleEndChange}
          onMouseDown={() => setDragging('end')}
          onMouseUp={() => setDragging(null)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: 20,
            opacity: 0,
            cursor: 'pointer',
            zIndex: 3,
          }}
          aria-label="End date"
        />

        {/* Visual handles */}
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: `calc(${startPct}% - 6px)`,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: dragging === 'start' ? 'var(--sky-dim)' : '#fff',
            border: '2px solid var(--sky-dim)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            pointerEvents: 'none',
            zIndex: 4,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: `calc(${endPct}% - 6px)`,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: dragging === 'end' ? 'var(--sky-dim)' : '#fff',
            border: '2px solid var(--sky-dim)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            pointerEvents: 'none',
            zIndex: 4,
          }}
        />
      </div>
    </div>
  );
});

export default TimeSlider;
