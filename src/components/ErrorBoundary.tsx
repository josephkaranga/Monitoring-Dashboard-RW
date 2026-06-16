import React from 'react';

interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Page error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚠️</div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
            Something went wrong loading this page
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 16, fontFamily: "'DM Mono', monospace" }}>
            {this.state.error?.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ padding: '8px 20px', background: '#0f2744', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
