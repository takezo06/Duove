import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Badge, Seal, focusRing, surface, toggleRow, toggleRowOff, toggleRowOn } from '../Card';
import { when } from '../../lib/when';
import type { Letter } from './LetterReader';

interface RecentLettersProps {
  letters: Letter[];
  openId: string;
  readerId: string;
  meId: string;
  partnerName: string;
  onToggle: (letter: Letter) => void;
}

// The last few letters. Tapping one puts it in the reader; tapping it again goes back to the latest.
export function RecentLetters({ letters, openId, readerId, meId, partnerName, onToggle }: RecentLettersProps) {
  return (
    <section aria-labelledby="recent-letters">
      <h2 id="recent-letters" className="flex items-baseline justify-between text-sm px-1 mb-2">
        <span className="font-semibold text-white">Recent letters</span>
        <span className="text-neutral-400">Pick one to read</span>
      </h2>
      <ul className={`${surface} p-2 grid md:grid-cols-2 lg:grid-cols-1 gap-1`}>
        {letters.map((l) => {
          const on = l.id === openId;
          return (
            <li key={l.id}>
              <button
                onClick={() => onToggle(l)}
                aria-pressed={on}
                aria-controls={readerId}
                className={`${toggleRow} ${on ? toggleRowOn : toggleRowOff} flex items-start gap-3`}
              >
                <Seal name={l.sender_name || (l.sender_id === meId ? 'You' : partnerName)} partner={l.sender_id !== meId} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3 min-h-5 text-xs text-neutral-400">
                    {l.sender_id === meId ? <span>You</span> : <span className="text-rose-400 font-medium">{partnerName}</span>}
                    {on ? (
                      <Badge tone="rose">Reading</Badge>
                    ) : !l.opened_at && l.sender_id !== meId ? (
                      <Badge tone="rose">New</Badge>
                    ) : (
                      <time dateTime={l.created_at} title={new Date(l.created_at).toLocaleString()} className="shrink-0">
                        {when(l.created_at)}
                      </time>
                    )}
                  </span>
                  <span className={`mt-1 font-semibold leading-snug line-clamp-2 break-words transition ${on ? 'text-white' : 'text-white group-hover:text-rose-400'}`}>
                    {l.heading}
                  </span>
                  <span className="mt-1 text-sm text-neutral-400 line-clamp-1 break-words">{l.message}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <Link
        to="/letters/all"
        className={`group mt-2 px-1 min-h-10 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-400 hover:text-rose-400 transition rounded ${focusRing}`}
      >
        Open the envelope box
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden />
      </Link>
    </section>
  );
}
