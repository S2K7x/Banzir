import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { applyAppearance } from './lib/settings';
import { ErrorBoundary } from './ui/ErrorBoundary';
import './styles.css';

applyAppearance();

// The service worker caches the app shell so Banzir opens offline. A new
// version waits until the person taps "Update".
const listeners = new Set<() => void>();
const updateSW = registerSW({ onNeedRefresh: () => listeners.forEach((l) => l()) });
const update = { subscribe: (cb: () => void) => void listeners.add(cb), apply: () => void updateSW(true) };

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App update={update} />
    </ErrorBoundary>
  </StrictMode>,
);
