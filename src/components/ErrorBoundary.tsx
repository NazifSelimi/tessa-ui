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

import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Plain-HTML fallback — no antd dependency to keep initial bundle small
      return (
        <div style={{ padding: '50px 20px', textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ fontSize: 22, margin: '0 0 8px', color: '#1a1a2e' }}>Something went wrong</h1>
          <p style={{ color: '#666', marginBottom: 24 }}>An unexpected error occurred. Please try refreshing the page.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '8px 24px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
            >
              Reload Page
            </button>
            <button
              onClick={this.handleReset}
              style={{ padding: '8px 24px', background: '#fff', color: '#1a1a2e', border: '1px solid #d9d9d9', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
            >
              Try Again
            </button>
          </div>
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
