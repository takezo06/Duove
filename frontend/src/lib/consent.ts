// What this browser allows beyond essential storage (see /cookies). Kept on the device only.
// Essential storage (the sign-in session, this choice, the sidebar layout) needs no consent.
export interface Consent {
  cache: boolean; // "Faster loading": lib/cache.ts may keep copies in localStorage
  spotify: boolean; // "Spotify players": letters may load Spotify's player, which sets Spotify's cookies
}

// Not 'duove:': sign-out clears that prefix (lib/cache.ts), and the choice outlives a session
const KEY = 'duove-consent';
const YEAR = 365 * 24 * 60 * 60 * 1000;
export const settingsEvent = 'cookie-settings';

const listeners = new Set<() => void>();
let raw: string | null | undefined;
let current: Consent | null = null;

// Every field must be a boolean, so adding a category here asks everyone again. So does a year passing.
function parse(text: string | null): Consent | null {
  try {
    const v = JSON.parse(text ?? 'null');
    if (typeof v?.cache === 'boolean' && typeof v.spotify === 'boolean' && Date.now() - Date.parse(v.at) < YEAR) {
      return { cache: v.cache, spotify: v.spotify };
    }
  } catch { /* bad JSON: ask again */ }
  return null;
}

// null until the visitor chooses. The same object until the stored choice changes (useSyncExternalStore needs that).
export function getConsent(): Consent | null {
  let text: string | null = null;
  try { text = localStorage.getItem(KEY); } catch { /* storage blocked: the choice lasts this visit */ }
  if (text !== raw) {
    raw = text;
    current = parse(text);
  }
  return current;
}

export function saveConsent(c: Consent) {
  current = c;
  const text = JSON.stringify({ ...c, at: new Date().toISOString() });
  try {
    localStorage.setItem(KEY, text);
    raw = text;
  } catch {
    raw = null; // what a blocked storage reads back, so getConsent keeps this choice in memory
  }
  listeners.forEach((l) => l());
}

export function subscribeConsent(onChange: () => void) {
  listeners.add(onChange);
  return () => { listeners.delete(onChange); };
}

// Opens the cookie settings dialog from any page (CookieConsent listens)
export const openCookieSettings = () => window.dispatchEvent(new Event(settingsEvent));
