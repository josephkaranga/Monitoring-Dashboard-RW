import React from 'react';

// ── Skeleton loading components ───────────────────────────────

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 6, style }: SkeletonProps) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background:
          'linear-gradient(90deg, var(--surface-3) 25%, var(--surface-2) 50%, var(--surface-3) 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.5s infinite',
        ...style,
      }}
    />
  );
}

export function MetricCardSkeleton() {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 'var(--radius)',
        background: 'var(--surface-3)',
        flex: 1,
        minWidth: 160,
      }}
    >
      <Skeleton width={80} height={12} style={{ marginBottom: 8 }} />
      <Skeleton width={60} height={32} style={{ marginBottom: 8 }} />
      <Skeleton width={100} height={10} />
    </div>
  );
}

export function TableRowSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '12px 14px' }}>
          <Skeleton height={14} width={i === 0 ? 40 : i === 1 ? '80%' : '60%'} />
        </td>
      ))}
    </tr>
  );
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        padding: 18,
      }}
    >
      <Skeleton width={140} height={16} style={{ marginBottom: 16 }} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={12}
          width={i === lines - 1 ? '60%' : '100%'}
          style={{ marginBottom: 10 }}
        />
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div>
      {/* Metric cards */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        {[1, 2, 3, 4].map(i => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        <CardSkeleton lines={6} />
        <CardSkeleton lines={4} />
      </div>
      {/* Live stats */}
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          padding: 18,
        }}
      >
        <Skeleton width={160} height={16} style={{ marginBottom: 16 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div
              key={i}
              style={{
                background: 'var(--surface-2)',
                borderRadius: 10,
                padding: '12px 10px',
                textAlign: 'center',
              }}
            >
              <Skeleton height={28} width={50} style={{ margin: '0 auto 8px' }} />
              <Skeleton height={10} width={60} style={{ margin: '0 auto' }} />
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
