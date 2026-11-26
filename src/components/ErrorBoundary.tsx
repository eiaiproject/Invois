import { Component, type ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleClearData = async () => {
    const confirmed = window.confirm(
      'Delete all invoices, receipts, clients, and items stored in this browser? This cannot be undone.'
    );
    if (!confirmed) return;

    try {
      const { closeDB } = await import('../lib/db');
      await closeDB();
    } catch {
      // The database wrapper may be unavailable in a crash; deletion still proceeds.
    }

    try {
      const request = indexedDB.deleteDatabase('invois');
      request.onsuccess = () => window.location.reload();
      request.onerror = () => window.location.reload();
      request.onblocked = () => {
        window.alert('Close other Invois tabs, then try clearing data again.');
      };
    } catch {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            fontFamily: 'system-ui, sans-serif',
            background: '#F7F6F0',
            color: '#28251F',
          }}
        >
          <div
            style={{
              maxWidth: 480,
              textAlign: 'center',
              background: '#fff',
              borderRadius: 18,
              padding: '40px 32px',
              boxShadow: '0 4px 12px rgba(40,37,31,0.1)',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                background: '#F1DFDA',
                color: '#7A3F33',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 20px',
              }}
            >
              <TriangleAlert size={26} aria-hidden="true" />
            </div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ color: '#6F6A5F', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: 24 }}>
              Invois encountered an unexpected error. Your data is likely still safe in your browser.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  padding: '12px 20px',
                  borderRadius: 12,
                  border: 'none',
                  background: '#596949',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  minHeight: 44,
                  cursor: 'pointer',
                }}
              >
                Try again
              </button>
              <button
                type="button"
                onClick={this.handleClearData}
                style={{
                  padding: '12px 20px',
                  borderRadius: 12,
                  border: '1px solid #DDD8C9',
                  background: '#fff',
                  color: '#7A3F33',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  minHeight: 44,
                  cursor: 'pointer',
                }}
              >
                Clear data &amp; restart
              </button>
            </div>
            {this.state.error && (
              <details style={{ marginTop: 20, textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', color: '#6F6A5F', fontSize: '0.75rem' }}>Error details</summary>
                <pre
                  style={{
                    marginTop: 8,
                    padding: 12,
                    background: '#F7F6F0',
                    borderRadius: 8,
                    fontSize: '0.6875rem',
                    overflow: 'auto',
                    color: '#7A3F33',
                  }}
                >
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
