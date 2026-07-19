import React, { Component, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import App from './App';
import { initializeDatabase } from './lib/db';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0d0b',
          color: '#ffffff',
          fontFamily: 'sans-serif',
          padding: '20px',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '12px', color: '#66bb6a' }}>AgriSense AI Rover</h1>
          <p style={{ fontSize: '16px', color: '#e2e8f0', marginBottom: '20px' }}>
            Something went wrong while loading the workspace.
          </p>
          <pre style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            maxWidth: '600px',
            overflowX: 'auto',
            marginBottom: '20px',
            color: '#f87171'
          }}>
            {this.state.error?.message || 'Unknown error'}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#2e7d32',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '12px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Start database initialization asynchronously (non-blocking)
initializeDatabase().catch((err) => {
  console.error('Database initialization error:', err);
});

// Render React immediately so the page is never blank
const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  });
}
