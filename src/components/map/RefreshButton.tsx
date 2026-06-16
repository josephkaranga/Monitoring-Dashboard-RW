import React from 'react';

interface RefreshButtonProps {
  onRefresh: () => void;
  loading: boolean;
  lastUpdated: Date | null;
  isMobile?: boolean;
}

/**
 * Manual refresh button for GBIF data with loading state and last updated timestamp
 * Implements Task 14.3, 14.5, and 14.2 enhancement
 */
export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onRefresh,
  loading,
  lastUpdated,
  isMobile = false
}) => {
  // Format relative time (e.g., "5 minutes ago")
  const formatRelativeTime = (date: Date | null): string => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  };

  // Update relative time every minute
  const [relativeTime, setRelativeTime] = React.useState(formatRelativeTime(lastUpdated));
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime(lastUpdated));
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [lastUpdated]);
  
  // Also update immediately when lastUpdated changes
  React.useEffect(() => {
    setRelativeTime(formatRelativeTime(lastUpdated));
  }, [lastUpdated]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexDirection: isMobile ? 'column' : 'row'
    }}>
      {/* Last Updated Timestamp */}
      {!isMobile && (
        <div style={{
          fontSize: '0.7rem',
          color: 'var(--text-3)',
          fontFamily: "'DM Mono', monospace",
          whiteSpace: 'nowrap'
        }}>
          Updated: {relativeTime}
        </div>
      )}
      
      {/* Refresh Button */}
      <button
        onClick={onRefresh}
        disabled={loading}
        style={{
          padding: isMobile ? '10px 14px' : '8px 12px',
          background: loading ? 'var(--surface-2)' : 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 7,
          fontSize: '0.75rem',
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          minWidth: 44,
          minHeight: 44,
          opacity: loading ? 0.6 : 1,
          transition: 'all 0.2s ease'
        }}
        aria-label="Refresh GBIF data"
        title={loading ? 'Refreshing...' : 'Refresh GBIF data now'}
      >
        <i 
          className={`fa-solid fa-sync ${loading ? 'fa-spin' : ''}`}
          style={{ 
            color: loading ? 'var(--text-3)' : 'var(--sky-dim)',
            fontSize: '0.85rem'
          }}
        />
        {!isMobile && (
          <span style={{ color: loading ? 'var(--text-3)' : 'var(--text-1)' }}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </span>
        )}
      </button>
      
      {/* Mobile: Show last updated below button */}
      {isMobile && (
        <div style={{
          fontSize: '0.65rem',
          color: 'var(--text-3)',
          fontFamily: "'DM Mono', monospace",
          textAlign: 'center'
        }}>
          {relativeTime}
        </div>
      )}
    </div>
  );
};
