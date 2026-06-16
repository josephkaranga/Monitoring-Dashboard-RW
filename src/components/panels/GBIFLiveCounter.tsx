// GBIF Live Counter - Animated counter with trend indicator

import React, { useEffect, useState, useRef } from 'react';

interface GBIFLiveCounterProps {
  currentCount: number;
  previousCount?: number;
  lastUpdated: Date | null;
  loading?: boolean;
  onRefresh?: () => void;
  isMobile?: boolean;
}

/**
 * Animated counter displaying total GBIF occurrences for Rwanda
 * Shows trend indicator comparing current to previous count
 * Performance: Memoized to prevent unnecessary re-renders
 */
export const GBIFLiveCounter = React.memo(function GBIFLiveCounter({
  currentCount,
  previousCount,
  lastUpdated,
  loading = false,
  onRefresh,
  isMobile = false
}: GBIFLiveCounterProps) {
  const [displayCount, setDisplayCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number | null>(null);

  // Animate counter on count change
  useEffect(() => {
    if (currentCount === displayCount) return;

    setIsAnimating(true);
    const startCount = displayCount;
    const endCount = currentCount;
    const duration = 1500; // 1.5 seconds
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out cubic)
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const current = Math.floor(startCount + (endCount - startCount) * easeProgress);
      setDisplayCount(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [currentCount]);

  // Calculate trend
  const trend = previousCount && previousCount > 0
    ? {
        direction: currentCount > previousCount ? 'up' : currentCount < previousCount ? 'down' : 'stable',
        change: Math.abs(((currentCount - previousCount) / previousCount) * 100),
        absolute: Math.abs(currentCount - previousCount)
      }
    : null;

  const getTrendColor = () => {
    if (!trend || trend.direction === 'stable') return 'var(--text-3)';
    return trend.direction === 'up' ? '#10b981' : '#ef4444';
  };

  const getTrendIcon = () => {
    if (!trend || trend.direction === 'stable') return 'fa-minus';
    return trend.direction === 'up' ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f2744, #1e3a5f)',
      borderRadius: 'var(--radius)',
      border: '1px solid rgba(56, 189, 248, 0.2)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      padding: isMobile ? 14 : 20,
      color: '#fff',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute',
        top: -40,
        right: -40,
        width: 150,
        height: 150,
        borderRadius: '50%',
        background: 'rgba(56, 189, 248, 0.08)',
        pointerEvents: 'none'
      }} />

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fa-solid fa-database" style={{ color: '#38bdf8', fontSize: '1.1rem' }} />
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>
            GBIF Live Records
          </h3>
          <span style={{
            fontSize: '0.65rem',
            padding: '3px 8px',
            borderRadius: 12,
            fontWeight: 700,
            fontFamily: "'DM Mono', monospace",
            background: 'rgba(56, 189, 248, 0.2)',
            color: '#7dd3fc'
          }}>
            ● Live
          </span>
        </div>
        
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: '0.7rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            <i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>

      {/* Counter */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 12,
        marginBottom: 12,
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          fontSize: isMobile ? '2rem' : '2.5rem',
          fontWeight: 700,
          fontFamily: "'Playfair Display', serif",
          lineHeight: 1,
          color: '#38bdf8',
          letterSpacing: '-0.02em'
        }}>
          {formatNumber(displayCount)}
        </div>
        
        {trend && trend.direction !== 'stable' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: '0.8rem',
            fontWeight: 600,
            color: getTrendColor(),
            background: getTrendColor() + '20',
            padding: '4px 8px',
            borderRadius: 6
          }}>
            <i className={`fa-solid ${getTrendIcon()}`} />
            {trend.change < 1 ? '<1' : trend.change.toFixed(1)}%
          </div>
        )}
      </div>

      {/* Description */}
      <p style={{
        fontSize: '0.75rem',
        color: '#e0f2fe',
        margin: 0,
        marginBottom: 12,
        opacity: 0.9,
        position: 'relative',
        zIndex: 1
      }}>
        Total biodiversity occurrences recorded in Rwanda
      </p>

      {/* Trend details */}
      {trend && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          paddingTop: 12,
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '0.7rem',
          color: '#bae6fd',
          position: 'relative',
          zIndex: 1
        }}>
          <div>
            <span style={{ opacity: 0.7 }}>Previous: </span>
            <span style={{ fontWeight: 600 }}>{formatNumber(previousCount || 0)}</span>
          </div>
          <div>
            <span style={{ opacity: 0.7 }}>Change: </span>
            <span style={{ fontWeight: 600, color: getTrendColor() }}>
              {trend.direction === 'up' ? '+' : '-'}{formatNumber(trend.absolute)}
            </span>
          </div>
        </div>
      )}

      {/* Last updated */}
      {lastUpdated && (
        <div style={{
          marginTop: 12,
          fontSize: '0.65rem',
          color: 'rgba(186, 230, 253, 0.6)',
          fontFamily: "'DM Mono', monospace",
          position: 'relative',
          zIndex: 1
        }}>
          <i className="fa-solid fa-clock" style={{ marginRight: 4 }} />
          Updated {formatDate(lastUpdated)}
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 39, 68, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--radius)',
          zIndex: 2
        }}>
          <div style={{ textAlign: 'center' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginBottom: 8 }} />
            <p style={{ fontSize: '0.8rem', margin: 0 }}>Fetching latest data...</p>
          </div>
        </div>
      )}
    </div>
  );
});
