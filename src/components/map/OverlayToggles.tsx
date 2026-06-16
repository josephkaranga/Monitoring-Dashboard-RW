import React from 'react';
import type { MapOverlay } from '../../types/overlays';

interface OverlayToggleConfig {
  id: MapOverlay;
  label: string;
  enabled: boolean;
  loading?: boolean;
  error?: string | null;
}

interface OverlayTogglesProps {
  overlays: OverlayToggleConfig[];
  onToggle: (overlayId: MapOverlay) => void;
  isMobile?: boolean;
}

/**
 * OverlayToggles Component
 * 
 * Provides checkbox controls for toggling map overlays on/off.
 * Supports 3 overlay types: GBIF Occurrences, Protected Area Borders, and River Network.
 * 
 * Features:
 * - Multiple overlays can be enabled simultaneously
 * - Loading indicators for async data fetching
 * - Error state display
 * - Keyboard navigation (Tab, Space, Enter)
 * - ARIA labels for accessibility
 * - Matches existing MapPage styling
 */
export function OverlayToggles({ overlays, onToggle, isMobile = false }: OverlayTogglesProps) {
  const handleToggle = (overlayId: MapOverlay) => {
    onToggle(overlayId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLLabelElement>, overlayId: MapOverlay) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle(overlayId);
    }
  };

  return (
    <div
      role="group"
      aria-label="Map overlay toggles"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: isMobile ? '100%' : 'auto'
      }}
    >
      {!isMobile && (
        <div
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-2)',
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: 4,
          }}
        >
          Overlays:
        </div>
      )}
      {overlays.map((overlay) => (
        <label
          key={overlay.id}
          htmlFor={`overlay-${overlay.id}`}
          tabIndex={0}
          onKeyDown={(e) => handleKeyDown(e, overlay.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: overlay.error ? 'not-allowed' : 'pointer',
            fontSize: '0.72rem',
            fontFamily: "'DM Sans', sans-serif",
            color: overlay.error ? 'var(--text-3)' : 'var(--text-1)',
            padding: isMobile ? '10px 12px' : '4px 8px',
            borderRadius: 6,
            transition: 'background-color 0.2s',
            outline: 'none',
            minHeight: isMobile ? 44 : 'auto',
            background: isMobile ? 'var(--surface)' : 'transparent',
            border: isMobile ? '1px solid var(--border)' : 'none'
          }}
          onMouseEnter={(e) => {
            if (!overlay.error) {
              e.currentTarget.style.backgroundColor = 'var(--surface-2)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isMobile ? 'var(--surface)' : 'transparent';
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid var(--sky-dim)';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
        >
          <input
            id={`overlay-${overlay.id}`}
            type="checkbox"
            checked={overlay.enabled}
            onChange={() => handleToggle(overlay.id)}
            disabled={!!overlay.error}
            aria-label={`Toggle ${overlay.label} overlay`}
            aria-describedby={overlay.error ? `overlay-${overlay.id}-error` : undefined}
            style={{
              width: isMobile ? 20 : 16,
              height: isMobile ? 20 : 16,
              cursor: overlay.error ? 'not-allowed' : 'pointer',
              accentColor: 'var(--sky-dim)',
            }}
          />
          <span style={{ flex: 1 }}>{overlay.label}</span>
          {overlay.loading && (
            <i
              className="fa-solid fa-spinner fa-spin"
              style={{
                fontSize: '0.7rem',
                color: 'var(--sky-dim)',
              }}
              aria-label="Loading overlay data"
            />
          )}
          {overlay.error && (
            <>
              <i
                className="fa-solid fa-triangle-exclamation"
                style={{
                  fontSize: '0.7rem',
                  color: '#f43f5e',
                }}
                aria-label="Error loading overlay"
              />
              <span
                id={`overlay-${overlay.id}-error`}
                style={{
                  position: 'absolute',
                  width: 1,
                  height: 1,
                  padding: 0,
                  margin: -1,
                  overflow: 'hidden',
                  clip: 'rect(0, 0, 0, 0)',
                  whiteSpace: 'nowrap',
                  border: 0,
                }}
              >
                {overlay.error}
              </span>
            </>
          )}
        </label>
      ))}
    </div>
  );
}

export default OverlayToggles;
