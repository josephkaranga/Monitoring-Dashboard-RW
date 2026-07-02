// ══════════════════════════════════════════════════════════════════════════════
// ConnectionBar Component
// ══════════════════════════════════════════════════════════════════════════════
// RBIS connection management UI with status indicator and connect/disconnect controls
// ══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import type { RBISConnection } from '../../types/rbis';

interface ConnectionBarProps {
  /** Current connection state */
  connection: RBISConnection;
  /** Loading state during connection attempts */
  loading: boolean;
  /** Connect callback */
  onConnect: () => void;
  /** Disconnect callback */
  onDisconnect: () => void;
}

/**
 * ConnectionBar displays RBIS connection status and controls
 *
 * @example
 * ```tsx
 * <ConnectionBar
 *   connection={connection}
 *   loading={loading}
 *   onConnect={connect}
 *   onDisconnect={disconnect}
 * />
 * ```
 */
export function ConnectionBar({
  connection,
  loading,
  onConnect,
  onDisconnect,
}: ConnectionBarProps) {
  const { status, serverUrl, lastSync, error } = connection;

  // Status configuration
  const statusConfig = {
    connected: {
      color: '#10b981',
      bgColor: '#d1fae5',
      textColor: '#065f46',
      icon: 'fa-circle-check',
      label: 'Connected',
    },
    disconnected: {
      color: '#6b7280',
      bgColor: '#f3f4f6',
      textColor: '#374151',
      icon: 'fa-circle-xmark',
      label: 'Disconnected',
    },
    connecting: {
      color: '#f59e0b',
      bgColor: '#fef3c7',
      textColor: '#92400e',
      icon: 'fa-spinner',
      label: 'Connecting...',
    },
    error: {
      color: '#ef4444',
      bgColor: '#fee2e2',
      textColor: '#991b1b',
      icon: 'fa-circle-exclamation',
      label: 'Connection Error',
    },
  };

  const config = statusConfig[status];

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '20px 24px',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        {/* Left: Status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Status badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 14px',
              background: config.bgColor,
              borderRadius: 10,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: config.color,
                animation: status === 'connecting' ? 'pulse 2s infinite' : 'none',
              }}
            />
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: config.textColor,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {config.label}
            </span>
          </div>

          {/* Server info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i
                className="fa-solid fa-server"
                style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}
              />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)' }}>
                {serverUrl}
              </span>
            </div>
            {lastSync && status === 'connected' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <i
                  className="fa-solid fa-clock"
                  style={{ fontSize: '0.7rem', color: 'var(--text-4)' }}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>
                  Last sync: {new Date(lastSync).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Action button */}
        <button
          onClick={status === 'connected' ? onDisconnect : onConnect}
          disabled={loading || status === 'connecting'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            background: status === 'connected' ? '#fee2e2' : '#dbeafe',
            border: status === 'connected' ? '1px solid #fecaca' : '1px solid #bfdbfe',
            borderRadius: 9,
            color: status === 'connected' ? '#991b1b' : '#1e40af',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: loading || status === 'connecting' ? 'not-allowed' : 'pointer',
            opacity: loading || status === 'connecting' ? 0.6 : 1,
            transition: 'all 0.2s',
            fontFamily: "'DM Sans', sans-serif",
          }}
          onMouseEnter={e => {
            if (!loading && status !== 'connecting') {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <i
            className={`fa-solid ${status === 'connected' ? 'fa-plug-circle-xmark' : 'fa-plug-circle-check'}`}
            style={{ fontSize: '0.9rem' }}
          />
          {loading || status === 'connecting'
            ? 'Connecting...'
            : status === 'connected'
              ? 'Disconnect'
              : 'Connect to RBIS'}
        </button>
      </div>

      {/* Error message */}
      {error && status === 'error' && (
        <div
          style={{
            marginTop: 16,
            padding: '12px 16px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          <i
            className="fa-solid fa-circle-exclamation"
            style={{ fontSize: '0.9rem', color: '#dc2626', marginTop: 2 }}
          />
          <div>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#991b1b', margin: 0 }}>
              Connection Failed
            </p>
            <p
              style={{
                fontSize: '0.75rem',
                color: '#dc2626',
                margin: '4px 0 0 0',
                lineHeight: 1.4,
              }}
            >
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
