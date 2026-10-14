import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { Category } from '../lib/cravingCategories';

// Shared visual vocabulary for Duove pages (dashboard, partner, ...)
export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950';
export const surface = 'bg-neutral-900 rounded-2xl border border-neutral-800';
export const inset = 'rounded-xl bg-neutral-800/40 border border-neutral-800 px-4 py-3';
export const primaryButton = `inline-flex items-center justify-center gap-2 px-5 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium transition shadow-lg shadow-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${focusRing}`;
export const secondaryButton = `inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-sm font-medium transition border border-neutral-700 disabled:opacity-50 cursor-pointer ${focusRing}`;
export const iconClass = 'w-4 h-4 text-rose-400';
// The primary action when it sits on a rose-600 block (white button, rose label)
export const inverseButton = 'inline-flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-rose-50 text-rose-700 rounded-xl font-medium transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-rose-600';
export const iconButton = `w-10 h-10 shrink-0 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-neutral-400 ${focusRing}`;
// A row you tap to open and tap again to close (aria-pressed). Pair with toggleRowOn or toggleRowOff;
// headings inside take group-hover:text-rose-400 while off.
export const toggleRow = `group w-full text-left p-3 md:p-4 rounded-xl border transition cursor-pointer ${focusRing}`;
export const toggleRowOn = 'bg-rose-500/10 border-rose-400/20';
export const toggleRowOff = 'border-transparent hover:bg-neutral-800/60 hover:border-neutral-700';
export const field =
  'w-full bg-neutral-800/50 text-white placeholder:text-neutral-500 px-4 py-3 rounded-xl border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-rose-400/50 focus:border-transparent transition';


type Tone = 'rose' | 'emerald' | 'neutral';
const toneClass: Record<Tone, string> = {
  rose: 'bg-rose-500/10 border-rose-400/20 text-rose-400',
  emerald: 'bg-emerald-500/10 border-emerald-400/20 text-emerald-400',
  neutral: 'bg-neutral-800 border-neutral-700 text-neutral-300',
};

// Status pill: rose = needs you, emerald = done/connected, neutral = info
export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-medium whitespace-nowrap ${toneClass[tone]}`}>
      {children}
    </span>
  );
}

// Card header: rose icon + label on the left, optional status on the right
export function CardHeader({ icon, title, badge }: { icon: ReactNode; title: string; badge?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 min-h-6">
      <h2 className="flex items-center gap-2 text-neutral-400 text-sm">
        {icon}
        {title}
      </h2>
      {badge}
    </div>
  );
}

export function Avatar({ src, name, dashed = false }: { src: string | null; name: string; dashed?: boolean }) {
  const base = 'w-16 h-16 rounded-full ring-4 ring-neutral-900 object-cover shrink-0';
  if (src) return <img src={src} alt={name} className={base} />;
  return (
    <div
      aria-label={name}
      className={`${base} flex items-center justify-center text-xl font-semibold ${
        dashed ? 'bg-neutral-900 border-2 border-dashed border-neutral-700 text-neutral-500' : 'bg-neutral-800 text-rose-400'
      }`}
    >
      {dashed ? '?' : name.charAt(0).toUpperCase()}
    </div>
  );
}

// Filter or single-choice chip; an active category chip takes the category tint
export function Chip({ active, cat, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean; cat?: Category }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition cursor-pointer ${focusRing} ${
        active
          ? cat?.tint ?? 'bg-neutral-800 border-neutral-700 text-white'
          : 'border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
      } ${className}`}
    />
  );
}

// Wax seal: the sender's initial. Rose when the partner sent it, neutral when you did.
export function Seal({ name, partner, className = '' }: { name: string; partner: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold ${
        partner ? 'bg-rose-500 text-white' : 'bg-neutral-700 text-neutral-200'
      } ${className}`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

// Category pill on each craving: same shape as the selected chip, smaller
export function CategoryPill({ cat }: { cat: Category }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${cat.tint}`}>
      <cat.icon className={`w-3 h-3 ${cat.iconColor}`} aria-hidden />
      {cat.label}
    </span>
  );
}

// Dialog shell: overlay, panel, close button. Escape and an overlay click close it.
// Focus moves into the panel on open and back to whatever opened it on close.
export function Modal({ label, onClose, wide = false, className = '', children }: {
  label: string;
  onClose: () => void;
  wide?: boolean;
  className?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    return () => opener?.focus();
  }, []);

  return (
    <div onClick={onClose} className={`fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/80 p-4 ${className}`}>
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className={`${surface} shadow-2xl w-full ${wide ? 'max-w-xl' : 'max-w-md'} p-6 relative max-h-[90vh] overflow-y-auto focus:outline-none`}
      >
        <button onClick={onClose} aria-label="Close" className={`absolute top-3 right-3 p-2.5 rounded-lg text-neutral-400 hover:text-white transition cursor-pointer ${focusRing}`}>
          <X className="w-5 h-5" aria-hidden />
        </button>
        {children}
      </div>
    </div>
  );
}
