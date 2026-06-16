import React, { useState, useRef, useEffect } from 'react';

interface ExportButtonProps {
  onExportPNG: () => Promise<void>;
  onExportCSV: () => Promise<void>;
  disabled?: boolean;
  isMobile?: boolean;
}

/**
 * ExportButton Component
 * 
 * Provides a dropdown menu for exporting map data in different formats:
 * - PNG: Export the current map visualization as an image
 * - CSV: Export the underlying district data as a spreadsheet
 * 
 * Features:
 * - Dropdown menu with export options
 * - Loading state during export generation
 * - Mobile-friendly design with larger tap targets
 * - Keyboard navigation support
 * - Click-outside to close dropdown
 */
export const ExportButton: React.FC<ExportButtonProps> = ({
  onExportPNG,
  onExportCSV,
  disabled = false,
  isMobile = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'png' | 'csv' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleExport = async (type: 'png' | 'csv') => {
    setIsExporting(true);
    setExportType(type);
    setIsOpen(false);

    try {
      if (type === 'png') {
        await onExportPNG();
      } else {
        await onExportCSV();
      }
    } catch (error) {
      console.error(`Export ${type.toUpperCase()} failed:`, error);
      // Error handling is done in the parent component
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  return (
    <div 
      ref={dropdownRef} 
      style={{ position: 'relative', display: 'inline-block' }}
      onKeyDown={handleKeyDown}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting}
        aria-label="Export map data"
        aria-expanded={isOpen}
        aria-haspopup="true"
        style={{
          padding: isMobile ? '10px 14px' : '8px 12px',
          background: isExporting ? 'var(--surface-3)' : 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 7,
          fontSize: isMobile ? '0.8rem' : '0.75rem',
          fontWeight: 600,
          cursor: disabled || isExporting ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minWidth: isMobile ? 44 : 'auto',
          minHeight: isMobile ? 44 : 'auto',
          opacity: disabled || isExporting ? 0.6 : 1,
          transition: 'all 0.2s ease'
        }}
      >
        {isExporting ? (
          <>
            <i className="fa-solid fa-spinner fa-spin" style={{ color: 'var(--sky-dim)' }} />
            <span>Exporting {exportType?.toUpperCase()}...</span>
          </>
        ) : (
          <>
            <i className="fa-solid fa-download" style={{ color: 'var(--sky-dim)' }} />
            <span>Export</span>
            <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ fontSize: '0.7rem' }} />
          </>
        )}
      </button>

      {isOpen && !isExporting && (
        <div
          role="menu"
          aria-label="Export options"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 7,
            boxShadow: 'var(--shadow-md)',
            zIndex: 1000,
            minWidth: isMobile ? 180 : 160,
            overflow: 'hidden'
          }}
        >
          <button
            role="menuitem"
            onClick={() => handleExport('png')}
            style={{
              width: '100%',
              padding: isMobile ? '12px 16px' : '10px 14px',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--border)',
              fontSize: isMobile ? '0.8rem' : '0.75rem',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              textAlign: 'left',
              minHeight: isMobile ? 44 : 'auto',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <i className="fa-solid fa-image" style={{ color: 'var(--sky-dim)', width: 16 }} />
            <div>
              <div>Export as PNG</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: 2 }}>
                Save map as image
              </div>
            </div>
          </button>

          <button
            role="menuitem"
            onClick={() => handleExport('csv')}
            style={{
              width: '100%',
              padding: isMobile ? '12px 16px' : '10px 14px',
              background: 'transparent',
              border: 'none',
              fontSize: isMobile ? '0.8rem' : '0.75rem',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              textAlign: 'left',
              minHeight: isMobile ? 44 : 'auto',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <i className="fa-solid fa-table" style={{ color: 'var(--sky-dim)', width: 16 }} />
            <div>
              <div>Export as CSV</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: 2 }}>
                Save data as spreadsheet
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
