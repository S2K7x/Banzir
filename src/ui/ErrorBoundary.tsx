import { Component, type ReactNode } from 'react';
import { exportBackup } from '../lib/backup';

/** Shows a recovery screen instead of a blank page if rendering fails. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="overlay" role="alertdialog" aria-modal="true" aria-label="Something went wrong">
        <div className="overlay-inner" style={{ justifyContent: 'center' }}>
          <h1 className="h1">Something went wrong</h1>
          <p className="muted">Your training data is still on this device. Reloading usually fixes it.</p>
          <p className="note warn small">{this.state.error.message}</p>
          <button className="btn primary big block" onClick={() => location.reload()}>
            Reload
          </button>
          <button className="btn block" onClick={() => void exportBackup()}>
            Save a backup first
          </button>
        </div>
      </div>
    );
  }
}
