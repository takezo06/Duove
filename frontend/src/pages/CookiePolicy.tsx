import type { ReactNode } from 'react';
import { inset, secondaryButton, textLink } from '../components/Card';
import { Bullets, ContactEmail, LegalPage, Section } from '../components/Legal';
import { openCookieSettings } from '../lib/consent';

// One thing Duove (or Spotify) keeps in the browser: what it's called, its key, who sets it, how long it stays
function StorageItem({ id, name, storageKey, by, lasts, children }: {
  id?: string;
  name: string;
  storageKey: string;
  by: string;
  lasts: string;
  children: ReactNode;
}) {
  return (
    <li id={id} className={`${inset} scroll-mt-6`}>
      <p className="font-semibold text-white">{name}</p>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-400">
        <span className="break-all">{storageKey}</span>
        <span aria-hidden>·</span>
        <span>{by}</span>
        <span aria-hidden>·</span>
        <span>{lasts}</span>
      </p>
      <p className="mt-2">{children}</p>
    </li>
  );
}

// Every key Duove (or a third party it loads) keeps in the browser has an item here; see lib/consent.ts
export function CookiePolicy() {
  return (
    <LegalPage
      title="Cookie policy"
      updated="2026-10-28"
      summary={
        <>
          <Bullets>
            <li>No advertising or analytics cookies, and no tracking you across sites.</li>
            <li>A few essentials keep you signed in.</li>
            <li>Two extras stay off until you turn them on: faster loading, and Spotify players in letters.</li>
          </Bullets>
          <button type="button" onClick={openCookieSettings} className={`${secondaryButton} mt-5`}>
            Cookie settings
          </button>
        </>
      }
    >
      <Section id="what" title="Cookies and local storage">
        <p>
          Cookies are small files a website saves in your browser. Local storage is a similar place in your browser where a
          site can keep information between visits.
        </p>
        <p>
          Duove itself doesn't set any cookies. It keeps what it needs in your browser's local storage, and only the
          essentials without asking. Spotify's player sets cookies, and it only loads if you allow it. This policy covers
          both.
        </p>
      </Section>

      <Section id="essential" title="Essential, always on">
        <p>Duove can't work without these, or they only remember a choice you made, so they don't need your consent.</p>
        <ul className="space-y-3">
          <StorageItem name="Sign-in session" storageKey="sb-…-auth-token" by="Supabase" lasts="Until you sign out">
            Keeps you signed in, so you don't have to enter your password on every visit.
          </StorageItem>
          <StorageItem name="Your cookie choices" storageKey="duove-consent" by="Duove" lasts="12 months">
            Remembers what you allowed here. After 12 months, Duove asks again.
          </StorageItem>
          <StorageItem name="Sidebar layout" storageKey="sidebar-width, sidebar-collapsed" by="Duove" lasts="Until you clear your browser data">
            Remembers how wide you made the sidebar, and whether you collapsed it.
          </StorageItem>
          <StorageItem name="Offline reminder" storageKey="duove-offline-reminder" by="Duove" lasts="Until you clear your browser data">
            Remembers that you chose "Don't remind me" when Duove told you letters aren't kept offline on this device.
          </StorageItem>
          <StorageItem name="App files" storageKey="Service worker cache (workbox-precache-…)" by="Duove" lasts="Until the next Duove update replaces them">
            Keeps Duove's own code, styles and icons on this device, so it opens like an app and loads without a connection.
            It holds none of your letters or other data.
          </StorageItem>
        </ul>
      </Section>

      <Section id="optional" title="Optional, off until you allow them">
        <ul className="space-y-3">
          <StorageItem name="Faster loading" storageKey="duove:…" by="Duove" lasts="Until you sign out or turn it off">
            Keeps a copy of your profile, your partner's name, your relationship details and stats, your cravings, your
            cycle overview and the letters you've loaded on this device, so pages show them at once instead of waiting for
            the server, and you can read those letters offline.
          </StorageItem>
          <StorageItem id="spotify" name="Spotify players" storageKey="Spotify's cookies" by="Spotify (open.spotify.com)" lasts="As long as Spotify sets">
            Lets the songs in letters play right on the page. When a player loads, Spotify sets its own cookies and uses them
            as its <a href="https://www.spotify.com/legal/cookies-policy/" className={textLink}>cookie policy</a> describes.
            While this is off, letters show the song's name and artist, with a button to allow players.
          </StorageItem>
        </ul>
      </Section>

      <Section id="not-used" title="What Duove doesn't use">
        <p>
          No analytics, no advertising, no tracking pixels, no social media plugins and no fingerprinting. Duove doesn't
          follow you around the web.
        </p>
      </Section>

      <Section id="choices" title="Changing your mind">
        <p>
          Change your choices at any time in the{' '}
          <button type="button" onClick={openCookieSettings} className={textLink}>cookie settings</button>. You can also
          open them from your profile and from the bottom of every policy page.
        </p>
        <p>
          Turning off faster loading deletes its copies from this device at once. Cookies Spotify already set stay until you
          clear them in your browser or they expire.
        </p>
        <p>You can also block cookies or clear site data in your browser's settings. Clearing Duove's data signs you out.</p>
      </Section>

      <Section id="changes" title="Changes to this policy">
        <p>
          When this policy changes, so does the date at the top. If Duove adds a new kind of optional storage, it asks you
          again before using it.
        </p>
      </Section>

      <Section id="contact" title="Contact">
        <p>Questions about cookies or storage: <ContactEmail />.</p>
      </Section>
    </LegalPage>
  );
}
