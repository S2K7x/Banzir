import { getSettings } from '../../lib/settings';
import { Icon } from '../../ui/kit';

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** A computer with a mouse or trackpad, where "home screen" makes no sense. */
export const isDesktop = () => !/Android|iPad|iPhone|iPod/.test(navigator.userAgent) && window.matchMedia('(pointer: fine)').matches;

export function InstallCard() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const mac = /Macintosh/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/Chrome|Edg/.test(navigator.userAgent);
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
      <b>{isDesktop() ? 'Install Banzir on this computer' : 'Add Banzir to your home screen'}</b>
      <p className="muted small">It opens like an app, works offline, and your browser keeps your data safe from automatic clean-up.</p>
      {isDesktop() ? (
        <ol className="small" style={{ margin: 0, paddingLeft: 18 }}>
          {mac ? (
            <li>In Safari, open the File menu and choose "Add to Dock".</li>
          ) : (
            <>
              <li>In Chrome or Edge, click the install icon at the right of the address bar,</li>
              <li>or open the browser menu and choose "Install Banzir".</li>
            </>
          )}
        </ol>
      ) : ios ? (
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
