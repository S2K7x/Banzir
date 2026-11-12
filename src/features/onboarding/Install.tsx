import { getSettings } from '../../lib/settings';
import { Icon } from '../../ui/kit';

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function InstallCard() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isStandalone()) {
    return (
      <div className="card accent row">
        <Icon name="check" />
        <p className="grow">Installed. Your training data is stored on this device.</p>
      </div>
    );
  }
  return (
    <div className="card stack">
      <b>Add Banzir to your home screen</b>
      <p className="muted small">It opens like an app, works offline, and your browser keeps your data safe from automatic clean-up.</p>
      {ios ? (
        <ol className="small" style={{ margin: 0, paddingLeft: 18 }}>
          <li>Open this page in Safari.</li>
          <li>Tap the Share button.</li>
          <li>Choose "Add to Home Screen".</li>
        </ol>
      ) : (
        <ol className="small" style={{ margin: 0, paddingLeft: 18 }}>
          <li>Open the browser menu.</li>
          <li>Choose "Install app" or "Add to Home screen".</li>
        </ol>
      )}
      <p className="muted small">Units: {getSettings().units === 'imperial' ? 'lb and miles' : 'kg and km'}. You can skip this and do it later from Profile.</p>
    </div>
  );
}
