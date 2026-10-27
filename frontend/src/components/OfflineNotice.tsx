import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { Modal, focusRing, primaryButton, secondaryButton, surface } from './Card';
import { useOffline } from '../hooks/useOffline';
import { getConsent, openCookieSettings } from '../lib/consent';

// "Don't remind me" for this device only. Not 'duove:', so sign-out keeps it (see /cookies).
const KEY = 'duove-offline-reminder';

// Remind only when letters aren't kept on the device and nobody here said to stop
function shouldRemind() {
  if (getConsent()?.cache) return false;
  try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; }
}

// While offline: a banner saying Duove is read-only, and each time the connection drops
// without "Faster loading", a reminder that letters won't be there once the app closes.
export function OfflineNotice() {
  const offline = useOffline();
  const [reminding, setReminding] = useState(() => !navigator.onLine && shouldRemind());

  useEffect(() => {
    const drop = () => setReminding(shouldRemind());
    window.addEventListener('offline', drop);
    return () => window.removeEventListener('offline', drop);
  }, []);

  const stopReminding = () => {
    try { localStorage.setItem(KEY, 'off'); } catch { /* reminds again next time */ }
    setReminding(false);
  };

  return (
    <>
      {offline && (
        <p role="status" className={`${surface} max-w-6xl mx-auto mb-4 px-4 py-3 flex items-center gap-2 text-sm text-neutral-200`}>
          <WifiOff className="w-4 h-4 shrink-0 text-neutral-400" aria-hidden />
          You're offline. You can read, but not write until you're back.
        </p>
      )}
      {reminding && (
        <Modal label="You're offline" onClose={() => setReminding(false)}>
          <h2 className="text-xl font-bold text-white pr-8">You're offline</h2>
          <p className="mt-3 text-neutral-200">
            Faster loading is off, so Duove doesn't keep your letters on this device. The ones you've opened stay readable
            until you close the app.
          </p>
          <p className="mt-2 text-sm text-neutral-400">To read them offline next time, turn on Faster loading.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={() => { setReminding(false); openCookieSettings(); }} className={primaryButton}>
              Open cookie settings
            </button>
            <button onClick={() => setReminding(false)} className={secondaryButton}>Got it</button>
          </div>
          <button
            onClick={stopReminding}
            className={`mt-4 min-h-10 text-sm font-medium text-neutral-400 hover:text-rose-400 transition rounded ${focusRing}`}
          >
            Don't remind me on this device
          </button>
        </Modal>
      )}
    </>
  );
}
