import { Component, type ReactNode } from 'react';

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
    try {
      indexedDB.deleteDatabase('invois');
      window.location.reload();
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
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 20px',
                fontSize: 28,
              }}
            >
              ⚠️
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ color: '#6F6A5F', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
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
                  fontSize: 14,
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
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Clear data &amp; restart
              </button>
            </div>
            {this.state.error && (
              <details style={{ marginTop: 20, textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', color: '#6F6A5F', fontSize: 12 }}>Error details</summary>
                <pre
                  style={{
                    marginTop: 8,
                    padding: 12,
                    background: '#F7F6F0',
                    borderRadius: 8,
                    fontSize: 11,
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
