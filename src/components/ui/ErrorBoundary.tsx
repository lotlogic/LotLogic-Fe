import React from 'react';
import { colors } from '@/constants/content';

type ErrorBoundaryProps = {
  fallback?: React.ReactNode;
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Uncaught error:', error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#FFFFFF'
        }}>
          <div style={{ textAlign: 'center', padding: '24px' }}>
            {/* Refresh/rotate icon */}
            <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 16px' }}>
              <polyline points="1 4 1 10 7 10"></polyline>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
            </svg>

            <h2 style={{
              fontSize: '24px',
              fontWeight: 600,
              color: '#111827',
              marginBottom: '8px'
            }}>Something went wrong</h2>

            <p style={{
              fontSize: '16px',
              color: '#6B7280',
              marginBottom: '20px'
            }}>Please restart the app.</p>

            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: colors.primary,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 20px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Refresh now
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;


