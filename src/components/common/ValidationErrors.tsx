import React from 'react';
import { ValidationError, formatErrorForUser } from '../../utils/errorHandling';

/**
 * ValidationErrors Component
 *
 * A reusable component for displaying validation errors in forms.
 * Supports both field-specific errors and general form errors.
 *
 * Requirements: Task 14.2
 * - Display validation errors in a user-friendly format
 * - Support field-specific errors and general form errors
 * - Consistent styling with application design
 * - Integration with error handling utilities
 * - Responsive design for mobile and desktop
 */

// ── TYPE DEFINITIONS ──────────────────────────────────────────

/**
 * Field-specific validation error
 */
export interface FieldError {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Props for ValidationErrors component
 */
export interface ValidationErrorsProps {
  /** Array of field-specific errors */
  fieldErrors?: FieldError[];
  /** Array of general form errors (not tied to specific fields) */
  generalErrors?: string[];
  /** ValidationError instances from error handling utilities */
  errors?: ValidationError[];
  /** Custom className for styling */
  className?: string;
  /** Show error icon */
  showIcon?: boolean;
  /** Compact mode (smaller padding and font) */
  compact?: boolean;
  /** Callback when an error is dismissed (if dismissible) */
  onDismiss?: (index: number, type: 'field' | 'general') => void;
}

// ── COMPONENT ─────────────────────────────────────────────────

/**
 * ValidationErrors component displays validation errors in a consistent format
 *
 * @example
 * ```tsx
 * // Field-specific errors
 * <ValidationErrors
 *   fieldErrors={[
 *     { field: 'email', message: 'Invalid email format' },
 *     { field: 'year', message: 'Year must be between 2020 and 2030' }
 *   ]}
 * />
 *
 * // General form errors
 * <ValidationErrors
 *   generalErrors={['Please fill in all required fields']}
 * />
 *
 * // Using ValidationError instances
 * <ValidationErrors
 *   errors={[validationError1, validationError2]}
 * />
 *
 * // Compact mode
 * <ValidationErrors
 *   fieldErrors={errors}
 *   compact
 * />
 * ```
 */
export const ValidationErrors: React.FC<ValidationErrorsProps> = ({
  fieldErrors = [],
  generalErrors = [],
  errors = [],
  className = '',
  showIcon = true,
  compact = false,
  onDismiss,
}) => {
  // Convert ValidationError instances to FieldError format
  const errorsFromInstances: FieldError[] = errors.map(error => ({
    field: error.field || 'general',
    message: formatErrorForUser(error),
    value: error.value,
  }));

  // Combine all field errors
  const allFieldErrors = [
    ...fieldErrors,
    ...errorsFromInstances.filter(e => e.field !== 'general'),
  ];

  // Combine all general errors
  const allGeneralErrors = [
    ...generalErrors,
    ...errorsFromInstances.filter(e => e.field === 'general').map(e => e.message),
  ];

  // If no errors, don't render anything
  if (allFieldErrors.length === 0 && allGeneralErrors.length === 0) {
    return null;
  }

  const padding = compact ? '12px' : '16px';
  const fontSize = compact ? '0.8rem' : '0.85rem';
  const iconSize = compact ? '0.85rem' : '0.95rem';
  const gap = compact ? '8px' : '12px';

  return (
    <div className={`validation-errors ${className}`} role="alert" aria-live="polite">
      {/* General Form Errors */}
      {allGeneralErrors.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: gap,
            marginBottom: allFieldErrors.length > 0 ? gap : 0,
          }}
        >
          {allGeneralErrors.map((error, index) => (
            <div
              key={`general-${index}`}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: gap,
                padding: padding,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
              }}
            >
              {/* Error Icon */}
              {showIcon && (
                <div
                  style={{
                    width: compact ? '28px' : '32px',
                    height: compact ? '28px' : '32px',
                    borderRadius: '6px',
                    background: '#fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <i
                    className="fa-solid fa-circle-exclamation"
                    style={{ fontSize: iconSize, color: '#dc2626' }}
                    aria-hidden="true"
                  />
                </div>
              )}

              {/* Error Message */}
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontSize: fontSize,
                    fontWeight: 600,
                    color: '#991b1b',
                    margin: 0,
                    lineHeight: 1.5,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {error}
                </p>
              </div>

              {/* Dismiss Button */}
              {onDismiss && (
                <button
                  onClick={() => onDismiss(index, 'general')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#991b1b',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#fee2e2';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                  aria-label="Dismiss error"
                >
                  <i className="fa-solid fa-times" style={{ fontSize: '0.75rem' }} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Field-Specific Errors */}
      {allFieldErrors.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: compact ? '6px' : '8px',
          }}
        >
          {allFieldErrors.map((error, index) => (
            <div
              key={`field-${index}`}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: gap,
                padding: padding,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
              }}
            >
              {/* Error Icon */}
              {showIcon && (
                <div
                  style={{
                    width: compact ? '24px' : '28px',
                    height: compact ? '24px' : '28px',
                    borderRadius: '6px',
                    background: '#fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <i
                    className="fa-solid fa-exclamation-triangle"
                    style={{ fontSize: compact ? '0.75rem' : '0.85rem', color: '#dc2626' }}
                    aria-hidden="true"
                  />
                </div>
              )}

              {/* Error Content */}
              <div style={{ flex: 1 }}>
                {/* Field Name */}
                <p
                  style={{
                    fontSize: compact ? '0.7rem' : '0.75rem',
                    fontWeight: 700,
                    color: '#7f1d1d',
                    margin: 0,
                    marginBottom: '2px',
                    textTransform: 'capitalize',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {formatFieldName(error.field)}
                </p>

                {/* Error Message */}
                <p
                  style={{
                    fontSize: fontSize,
                    fontWeight: 500,
                    color: '#991b1b',
                    margin: 0,
                    lineHeight: 1.5,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {error.message}
                </p>

                {/* Show invalid value if provided (for debugging) */}
                {error.value !== undefined && process.env.NODE_ENV === 'development' && (
                  <p
                    style={{
                      fontSize: '0.7rem',
                      color: '#b91c1c',
                      margin: 0,
                      marginTop: '4px',
                      fontFamily: "'Courier New', monospace",
                      fontStyle: 'italic',
                    }}
                  >
                    Value: {String(error.value)}
                  </p>
                )}
              </div>

              {/* Dismiss Button */}
              {onDismiss && (
                <button
                  onClick={() => onDismiss(index, 'field')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#991b1b',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#fee2e2';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                  aria-label={`Dismiss error for ${error.field}`}
                >
                  <i className="fa-solid fa-times" style={{ fontSize: '0.75rem' }} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── HELPER FUNCTIONS ──────────────────────────────────────────

/**
 * Format field name for display (convert snake_case or camelCase to Title Case)
 */
function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/\b\w/g, char => char.toUpperCase()) // Capitalize first letter of each word
    .trim();
}

// ── EXPORTS ───────────────────────────────────────────────────

export default ValidationErrors;
