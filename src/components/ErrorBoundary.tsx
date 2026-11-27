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
        <div className="crash-screen">
          <div className="crash-card">
            <div className="crash-icon">
              <TriangleAlert size={26} aria-hidden="true" />
            </div>
            <h1 className="crash-title">Something went wrong</h1>
            <p className="crash-text">
              Invois encountered an unexpected error. Your data is likely still safe in your browser.
            </p>
            <div className="crash-actions">
              <button
                type="button"
                onClick={this.handleReset}
                className="crash-btn crash-btn-primary"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={this.handleClearData}
                className="crash-btn crash-btn-danger"
              >
                Clear data &amp; restart
              </button>
            </div>
            {this.state.error && (
              <details className="crash-details">
                <summary className="crash-summary">Error details</summary>
                <pre className="crash-error">
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
