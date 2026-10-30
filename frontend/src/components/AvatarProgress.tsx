// The profile photo while it uploads: a dark mask and a ring that fills over the new photo,
// then the ring closes in emerald, a check draws in, and the mask lifts off the saved photo.
// The motion is defined in index.css and allowed only here (DESIGN.md section 10).
import { Avatar } from './Card';

export type PhotoPhase = 'idle' | 'uploading' | 'done';

const R = 29;
const C = 2 * Math.PI * R;

export function AvatarProgress({ src, name, phase, progress }: { src: string | null; name: string; phase: PhotoPhase; progress: number }) {
  const done = phase === 'done';
  const pct = Math.round((done ? 1 : progress) * 100);
  return (
    <div className="relative w-16 h-16 shrink-0">
      <Avatar src={src} name={name} />
      {phase !== 'idle' && (
        <div
          role="progressbar"
          aria-label="Uploading your photo"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className={`absolute inset-0 rounded-full bg-neutral-950/60 flex items-center justify-center ${done ? 'animate-photo-reveal' : ''}`}
        >
          <svg viewBox="0 0 64 64" className="absolute inset-0 w-16 h-16 -rotate-90" aria-hidden>
            <circle cx="32" cy="32" r={R} fill="none" strokeWidth="3" className="stroke-white/15" />
            <circle
              cx="32"
              cy="32"
              r={R}
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - pct / 100)}
              className={`photo-ring ${done ? 'stroke-emerald-400' : 'stroke-rose-500'}`}
            />
          </svg>
          {done && (
            <svg viewBox="0 0 24 24" className="relative w-6 h-6 animate-photo-pop" aria-hidden>
              <path
                d="M5 12.5l4.5 4.5L19 7.5"
                fill="none"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                className="stroke-emerald-400 animate-photo-check"
              />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}
