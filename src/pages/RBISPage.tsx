// ══════════════════════════════════════════════════════════════════════════════
// RBIS Comprehensive Dashboard Page
// ══════════════════════════════════════════════════════════════════════════════
// Main container for the RBIS (Rwanda Biodiversity Information System) dashboard
// Integrates connection management, real-time metrics, indicators matrix, and
// live signal feed with scroll-to-target functionality
// ══════════════════════════════════════════════════════════════════════════════

import React, { useCallback } from 'react';
import { ConnectionBar } from '../components/rbis/ConnectionBar';
import { MetricsPanel } from '../components/rbis/MetricsPanel';
import { IndicatorsMatrix } from '../components/rbis/IndicatorsMatrix';
import { SignalFeed } from '../components/rbis/SignalFeed';
import {
  useRBISConnection,
  useRBISMetrics,
  useIndicatorsMatrix,
  useRBISDataStreams,
} from '../hooks/useRBIS';

/**
 * RBISPage - Comprehensive RBIS monitoring dashboard
 * 
 * Features:
 * - Live RBIS connection management
 * - Real-time biodiversity metrics from GBIF
 * - Complete indicators-targets-RBIS matrix with search/filter
 * - Live signal feed with data streams mapped to targets
 * - Scroll-to-target functionality from signal feed to matrix
 * - Auto-refresh for metrics (30s) and data streams (60s)
 * - Responsive layout (vertical on mobile, side-by-side on desktop)
 */
export default function RBISPage() {
  // Hooks for data fetching
  const { connection, loading: connectionLoading, connect, disconnect } = useRBISConnection();
  const { metrics, recentOccurrences, loading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useRBISMetrics();
  const { goals, loading: goalsLoading, error: goalsError, refetch: refetchGoals } = useIndicatorsMatrix();
  const { dataStreams, loading: streamsLoading, error: streamsError, refetch: refetchStreams } = useRBISDataStreams();

  /**
   * Scroll to a specific target in the indicators matrix
   * Uses data-target-id attribute to find the target element
   * Auto-expands the goal and target sections and highlights the target
   * 
   * @param targetId - ID of the target to scroll to
   */
  const scrollToTarget = useCallback((targetId: number) => {
    // Find target element by data attribute
    const targetElement = document.querySelector(`[data-target-id="${targetId}"]`) as HTMLElement;
    
    if (targetElement) {
      // Smooth scroll to target
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });

      // Add temporary highlight effect
      const originalBackground = targetElement.style.backgroundColor;
      targetElement.style.transition = 'background-color 0.3s ease';
      targetElement.style.backgroundColor = '#fef3c7'; // Yellow highlight
      
      // Remove highlight after 2 seconds
      setTimeout(() => {
        targetElement.style.backgroundColor = originalBackground;
      }, 2000);
    } else {
      console.warn(`Target element with ID ${targetId} not found`);
    }
  }, []);

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 8px 0' }}>
          RBIS Comprehensive Dashboard
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>
          Real-time monitoring of Rwanda's biodiversity indicators, targets, and data streams through the Rwanda Biodiversity Information System (RBIS) and GBIF integration.
        </p>
      </div>

      {/* Connection Bar */}
      <div style={{ marginBottom: 24 }}>
        <ConnectionBar
          connection={connection}
          loading={connectionLoading}
          onConnect={connect}
          onDisconnect={disconnect}
        />
      </div>

      {/* Metrics Panel */}
      <div style={{ marginBottom: 24 }}>
        <MetricsPanel
          metrics={metrics}
          recentOccurrences={recentOccurrences}
          loading={metricsLoading}
          error={metricsError}
          lastUpdate={metrics?.lastDataUpdate}
          onRefetch={refetchMetrics}
        />
      </div>

      {/* Main Content: Indicators Matrix + Signal Feed */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* Indicators Matrix */}
        <div style={{ minWidth: 0 }}>
          <IndicatorsMatrix
            goals={goals}
            loading={goalsLoading}
            error={goalsError}
            onRefetch={refetchGoals}
            onTargetClick={scrollToTarget}
          />
        </div>

        {/* Signal Feed */}
        <div style={{ minWidth: 0 }}>
          <SignalFeed
            dataStreams={dataStreams}
            loading={streamsLoading}
            error={streamsError}
            onTargetClick={scrollToTarget}
            onRefetch={refetchStreams}
          />
        </div>
      </div>

      {/* Responsive Layout Styles */}
      <style>{`
        @media (max-width: 768px) {
          /* Stack vertically on mobile */
          div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
