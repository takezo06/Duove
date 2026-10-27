import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Music, ShieldCheck, Zap } from 'lucide-react';
import {
  Badge,
  Modal,
  iconClass,
  inset,
  primaryButton,
  secondaryButton,
  textLink,
  toggleRow,
  toggleRowOff,
  toggleRowOn,
} from './Card';
import { useConsent } from '../hooks/useConsent';
import { forgetStored } from '../lib/cache';
import { saveConsent, settingsEvent, type Consent } from '../lib/consent';

const none: Consent = { cache: false, spotify: false };
const all: Consent = { cache: true, spotify: true };

// The optional storage, each with its switch (essential storage has none)
const options = [
  {
    key: 'cache',
    name: 'Faster loading',
    icon: Zap,
    description: 'Saves your profile, partner, cravings, cycle overview and letters on this device so pages open at once and letters can be read offline. Deleted when you sign out.',
  },
  {
    key: 'spotify',
    name: 'Spotify players',
    icon: Music,
    description: 'Plays the songs in letters right on the page. Spotify sets its own cookies when a player loads.',
  },
] as const;

// The cookie banner until a choice is made, and the settings any page can open (openCookieSettings).
// Mounted once, first in App, so it's first in tab order. Saying no is one tap, the same as saying yes.
export function CookieConsent() {
  const consent = useConsent();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(settingsEvent, show);
    return () => window.removeEventListener(settingsEvent, show);
  }, []);

  const choose = (c: Consent) => {
    saveConsent(c);
    if (!c.cache) forgetStored(); // drop the copies an earlier "Faster loading" left on this device
    setOpen(false);
  };

  return (
    <>
      {/* Stays under the dialog while it's open, so focus can return to "Choose". It floats over cards,
          so its border is the lighter neutral-700 (how the Deck shows depth) instead of surface's */}
      {consent === null && (
        <section
          aria-labelledby="cookie-banner-title"
          className="fixed inset-x-4 bottom-4 md:bottom-6 z-40 mx-auto max-w-xl bg-neutral-900 rounded-2xl border border-neutral-700 shadow-2xl p-5"
        >
          <h2 id="cookie-banner-title" className="font-semibold text-white">Cookies and storage</h2>
          <p className="mt-1 text-sm text-neutral-300">
            Duove only stores what it needs to keep you signed in. Two extras are up to you: saving your data on this device
            so pages open faster, and Spotify's player in letters, which sets Spotify's cookies.{' '}
            <Link to="/cookies" className={textLink}>Cookie policy</Link>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => choose(none)} className={secondaryButton}>Essential only</button>
            <button onClick={() => setOpen(true)} className={secondaryButton}>Choose</button>
            <button onClick={() => choose(all)} className={secondaryButton}>Allow all</button>
          </div>
        </section>
      )}
      {open && <CookieSettings initial={consent ?? none} onSave={choose} onClose={() => setOpen(false)} />}
    </>
  );
}

function CookieSettings({ initial, onSave, onClose }: { initial: Consent; onSave: (c: Consent) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(initial);

  return (
    <Modal label="Cookie settings" onClose={onClose}>
      <h2 className="text-xl font-bold text-white pr-10">Cookie settings</h2>
      <p className="text-sm text-neutral-400 mt-1">
        Choose what Duove keeps on this device. You can change it any time from your profile or the{' '}
        <Link to="/cookies" onClick={onClose} className={textLink}>cookie policy</Link>.
      </p>

      <div className="mt-6 space-y-2">
        <div className={inset}>
          <span className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-semibold text-white">
              <ShieldCheck className={iconClass} aria-hidden />
              Essential
            </span>
            <Badge tone="neutral">Always on</Badge>
          </span>
          <span className="block mt-1 text-sm text-neutral-400">
            Keeps you signed in, and remembers these choices and your sidebar layout.
          </span>
        </div>
        {options.map(({ key, name, icon: Icon, description }) => {
          const on = draft[key];
          return (
            <button
              key={key}
              type="button"
              role="switch"
              aria-checked={on}
              onClick={() => setDraft((d) => ({ ...d, [key]: !d[key] }))}
              className={`${toggleRow} ${on ? toggleRowOn : toggleRowOff}`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className={`flex items-center gap-2 font-semibold text-white transition ${on ? '' : 'group-hover:text-rose-400'}`}>
                  <Icon className={iconClass} aria-hidden />
                  {name}
                </span>
                <Badge tone="neutral">{on ? 'On' : 'Off'}</Badge>
              </span>
              <span className="block mt-1 text-sm text-neutral-400">{description}</span>
            </button>
          );
        })}
      </div>

      <button type="button" onClick={() => onSave(draft)} className={`${primaryButton} mt-6 w-full sm:w-auto`}>
        Save choices
      </button>
    </Modal>
  );
}
