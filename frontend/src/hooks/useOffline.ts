import { useSyncExternalStore } from 'react';

// True while the browser says it has no network. Wi-Fi without internet still reads as online;
// there, writes fail and show their usual error.
const subscribe = (onChange: () => void) => {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
};

export const useOffline = () => useSyncExternalStore(subscribe, () => !navigator.onLine);
