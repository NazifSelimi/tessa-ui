/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the component tree and displays
 * a fallback UI instead of crashing the entire app.
 * 
 * Usage:
 * <ErrorBoundary fallback={<ErrorFallback />}>
 *   <YourComponent />
 * </ErrorBoundary>
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { isChunkLoadError } from '@/shared/utils/chunkReload';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** When this changes (e.g. the page address), a shown error is cleared. */
  resetKey?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    this.setState({ error, errorInfo });
  }

  componentDidUpdate(prevProps: Props): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.handleReset();
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // A page file from an older version of the site: only a reload helps.
      const newVersion = isChunkLoadError(this.state.error);

      // Plain-HTML fallback — no antd dependency to keep initial bundle small
      return (
        <div style={{ padding: '50px 20px', textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{newVersion ? '🔄' : '⚠️'}</div>
          <h1 style={{ fontSize: 22, margin: '0 0 8px', color: '#1a1a2e' }}>
            {newVersion ? 'A new version is available' : 'Something went wrong'}
          </h1>
          <p style={{ color: '#666', marginBottom: 24 }}>
            {newVersion
              ? 'The site was updated while this page was open. Reload to continue.'
              : 'An unexpected error occurred. Please try refreshing the page.'}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '8px 24px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
            >
              Reload Page
            </button>
            {!newVersion && <button
              onClick={this.handleReset}
              style={{ padding: '8px 24px', background: '#fff', color: '#1a1a2e', border: '1px solid #d9d9d9', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
            >
              Try Again
            </button>}
          </div>
          {!newVersion && this.state.error && (
            <p style={{ marginTop: 16, color: '#999', fontSize: 12 }}>
              Error: {String(this.state.error.message || this.state.error).slice(0, 200)}{' '}
              <button
                type="button"
                onClick={() => { void navigator.clipboard?.writeText(`${this.state.error?.stack ?? this.state.error}\n${this.state.errorInfo?.componentStack ?? ''}`); }}
                style={{ border: 0, background: 'none', color: '#1a1a2e', textDecoration: 'underline', cursor: 'pointer', fontSize: 12 }}
              >
                Copy details
              </button>
            </p>
          )}
          {import.meta.env.DEV && this.state.error && (
            <details style={{ marginTop: 20, textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Error Details</summary>
              <pre style={{ marginTop: 10, padding: 15, background: '#f5f5f5', borderRadius: 4, overflow: 'auto', fontSize: 12 }}>
                <strong>{this.state.error.toString()}</strong>
                {'\n\n'}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
