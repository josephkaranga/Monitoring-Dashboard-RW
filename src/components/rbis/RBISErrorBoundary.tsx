// ══════════════════════════════════════════════════════════════════════════════
// RBIS Error Boundary Component
// ══════════════════════════════════════════════════════════════════════════════
// React error boundary for catching and displaying component-level errors
// in the RBIS dashboard with recovery options
// ══════════════════════════════════════════════════════════════════════════════

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Optional fallback UI */
  fallback?: ReactNode;
  /** Optional error handler callback */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * RBISErrorBoundary catches React component errors and displays a fallback UI
 * 
 * @example
 * ```tsx
 * <RBISErrorBoundary>
 *   <RBISPage />
 * </RBISErrorBoundary>
 * ```
 */
export class RBISErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console for debugging
    console.error('RBIS Error Boundary caught an error:', error, errorInfo);

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div
          style={{
            padding: 40,
            maxWidth: 800,
            margin: '40px auto',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* Error Icon */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <i
              className="fa-solid fa-triangle-exclamation"
              style={{ fontSize: '2rem', color: '#dc2626' }}
            />
          </div>

          {/* Error Title */}
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--text-1)',
              textAlign: 'center',
              margin: '0 0 12px 0',
            }}
          >
            Something went wrong
          </h2>

          {/* Error Message */}
          <p
            style={{
              fontSize: '0.95rem',
              color: 'var(--text-2)',
              textAlign: 'center',
              lineHeight: 1.6,
              margin: '0 0 24px 0',
            }}
          >
            The RBIS dashboard encountered an unexpected error. Please try resetting the dashboard or refreshing the page.
          </p>

          {/* Error Details (collapsible) */}
          {this.state.error && (
            <details
              style={{
                marginBottom: 24,
                padding: 16,
                background: 'var(--surface-2)',
                borderRadius: 8,
                border: '1px solid var(--border)',
              }}
            >
              <summary
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-2)',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                Error Details
              </summary>
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  background: '#fef2f2',
                  borderRadius: 6,
                  border: '1px solid #fecaca',
                }}
              >
                <p
                  style={{
                    fontSize: '0.8rem',
                    fontFamily: "'DM Mono', monospace",
                    color: '#991b1b',
                    margin: '0 0 8px 0',
                    fontWeight: 600,
                  }}
                >
                  {this.state.error.name}: {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <pre
                    style={{
                      fontSize: '0.7rem',
                      fontFamily: "'DM Mono', monospace",
                      color: '#7f1d1d',
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      maxHeight: 200,
                      overflow: 'auto',
                    }}
                  >
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            </details>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '10px 20px',
                background: '#0ea5e9',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <i className="fa-solid fa-rotate-right" />
              Reset Dashboard
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text-2)',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <i className="fa-solid fa-arrow-rotate-right" />
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
