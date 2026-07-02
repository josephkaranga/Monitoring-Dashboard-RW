import React, { useMemo } from 'react';

interface Props {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showDot?: boolean;
}

export function TrendSparkline({
  data,
  width = 60,
  height = 24,
  color = '#0284c7',
  showDot = true,
}: Props) {
  const path = useMemo(() => {
    if (data.length < 2) return '';
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = 3;
    const w = width - padding * 2;
    const h = height - padding * 2;

    const points = data.map((v, i) => ({
      x: padding + (i / (data.length - 1)) * w,
      y: padding + h - ((v - min) / range) * h,
    }));

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  }, [data, width, height]);

  if (data.length < 2) return null;

  const lastVal = data[data.length - 1];
  const prevVal = data[data.length - 2];
  const trend = lastVal >= prevVal ? 'up' : 'down';
  const trendColor = trend === 'up' ? '#16a34a' : '#dc2626';

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 3;
  const h = height - padding * 2;
  const lastY = padding + h - ((lastVal - min) / range) * h;
  const lastX = width - padding;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: 0.7 }}
        />
        {showDot && (
          <circle cx={lastX} cy={lastY} r={2.5} fill={trendColor} stroke="#fff" strokeWidth={1} />
        )}
      </svg>
      <i
        className={`fa-solid fa-caret-${trend}`}
        style={{ fontSize: '0.65rem', color: trendColor }}
      />
    </div>
  );
}

export function generateTrendData(currentValue: number, periods: number = 6): number[] {
  const data: number[] = [];
  const variation = Math.max(currentValue * 0.15, 5);
  for (let i = 0; i < periods - 1; i++) {
    const progress = (i + 1) / periods;
    const base = currentValue * progress * 0.7;
    const noise = (Math.sin(i * 2.7 + currentValue) * 0.5 + 0.5) * variation;
    data.push(Math.max(0, Math.round(base + noise)));
  }
  data.push(currentValue);
  return data;
}
