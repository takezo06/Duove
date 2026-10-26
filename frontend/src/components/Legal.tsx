import { useEffect, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useConsent } from '../hooks/useConsent';
import { usePageTitle } from '../hooks/usePageTitle';
import { openCookieSettings } from '../lib/consent';
import { focusRing, surface, textLink } from './Card';

// Who runs Duove and how to reach them, as the policies name them
export const operator = 'takezo06';
const contactEmail = 'somera.jed@gmail.com';

const quietLink = `inline-flex items-center min-h-10 rounded transition cursor-pointer ${focusRing}`;

// The three policies and the cookie settings, as one row of quiet links (auth pages, policy footers, profile)
export function LegalLinks({ className = '' }: { className?: string }) {
  const tone = ({ isActive }: { isActive: boolean }) =>
    `${quietLink} ${isActive ? 'text-white' : 'text-neutral-400 hover:text-rose-400'}`;
  return (
    <nav aria-label="Legal" className={`flex flex-wrap items-center gap-x-4 text-sm ${className}`}>
      <NavLink to="/privacy" className={tone}>Privacy policy</NavLink>
      <NavLink to="/terms" className={tone}>Terms of service</NavLink>
      <NavLink to="/cookies" className={tone}>Cookie policy</NavLink>
      <button type="button" onClick={openCookieSettings} className={`${quietLink} text-neutral-400 hover:text-rose-400`}>
        Cookie settings
      </button>
    </nav>
  );
}

// A policy page: the brand bar, a header card (title, date, the short version) and the text in one card.
// Public, so it reads the same signed in or out. The window scrolls here (not a layout's main),
// and the router keeps the old position, so each page starts at the top or at its #section.
export function LegalPage({ title, updated, summary, children }: {
  title: string;
  updated: string; // 'YYYY-MM-DD'
  summary: ReactNode;
  children: ReactNode;
}) {
  usePageTitle(title);
  const { user, loading } = useAuth();
  const { pathname, hash } = useLocation();
  // While the cookie banner is up, room below the text so the banner never covers its end
  const asking = useConsent() === null;

  useEffect(() => {
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <div className={`min-h-screen bg-neutral-950 px-4 pt-6 md:pt-10 ${asking ? 'pb-72' : 'pb-10'}`}>
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between gap-3">
          <Link to="/" className={`flex items-center gap-2.5 rounded-lg ${focusRing}`}>
            <img src="/duove-logo.svg" alt="" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold text-white tracking-tight">Duove</span>
          </Link>
          {!loading && (
            <Link
              to={user ? '/' : '/login'}
              className={`group inline-flex items-center gap-2 text-sm font-medium text-neutral-400 hover:text-rose-400 transition rounded ${focusRing}`}
            >
              {user ? 'Back to Duove' : 'Sign in'}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden />
            </Link>
          )}
        </header>

        <main className="mt-8 space-y-6">
          <section className={`${surface} p-6 md:p-8`}>
            <h1 className="text-2xl md:text-3xl font-bold text-white">{title}</h1>
            <p className="text-sm text-neutral-400 mt-1">
              Last updated{' '}
              <time dateTime={updated}>
                {new Date(`${updated}T00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
              </time>
            </p>
            <div className="mt-6 pt-6 border-t border-neutral-800">
              <h2 className="font-semibold text-white">The short version</h2>
              <div className="mt-3 max-w-prose text-neutral-200 leading-relaxed">{summary}</div>
            </div>
          </section>

          <article className={`${surface} p-6 md:p-8`}>{children}</article>
        </main>

        <footer className="mt-8">
          <LegalLinks />
        </footer>
      </div>
    </div>
  );
}

// One part of a policy; `id` makes it linkable (/privacy#cycle)
export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 mt-6 pt-6 border-t border-neutral-800 first:mt-0 first:pt-0 first:border-t-0">
      <h2 className="text-lg font-semibold text-white leading-snug">{title}</h2>
      <div className="mt-3 max-w-prose space-y-3 text-neutral-200 leading-relaxed">{children}</div>
    </section>
  );
}

export function Bullets({ children }: { children: ReactNode }) {
  return <ul className="list-disc pl-5 space-y-2 marker:text-neutral-500">{children}</ul>;
}

// The word a bullet is about ("Account.")
export function Term({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-white">{children}</strong>;
}

export function ContactEmail() {
  return <a href={`mailto:${contactEmail}`} className={`${textLink} break-all`}>{contactEmail}</a>;
}
