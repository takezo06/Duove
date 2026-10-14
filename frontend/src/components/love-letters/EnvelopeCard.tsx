import { Music } from 'lucide-react';
import { Badge, Seal, focusRing } from '../Card';
import type { Letter } from './LetterReader';

interface EnvelopeCardProps {
  letter: Letter;
  mine: boolean;
  partnerName: string;
  // still waiting for its recipient: the wax seal stays on until then
  sealed: boolean;
  open: boolean;
  onOpen: () => void;
}

// A sealed letter. When `open` turns true the flap turns up, then the letter slides half out.
// Layers, back to front: letter, envelope body, flap (drops behind the letter once it is up), seal.
export function EnvelopeCard({ letter, mine, partnerName, sealed, open, onOpen }: EnvelopeCardProps) {
  const sender = letter.sender_name || (mine ? 'You' : partnerName);
  // The partner's letters come in wine envelopes, yours in charcoal, so the box shows who wrote what at a glance
  const tone = mine
    ? { body: 'bg-neutral-900 border-neutral-800', flap: 'fill-neutral-800', edge: 'stroke-neutral-700', ring: 'ring-neutral-900', meta: 'text-neutral-400' }
    : { body: 'bg-rose-950 border-rose-900', flap: 'fill-rose-900', edge: 'stroke-rose-800', ring: 'ring-rose-950', meta: 'text-rose-200/80' };

  return (
    <button
      onClick={onOpen}
      aria-haspopup="dialog"
      className={`group relative block w-full aspect-[3/2] text-left rounded-xl cursor-pointer [perspective:900px] ${open ? 'z-10' : ''} ${focusRing}`}
    >
      <span
        aria-hidden
        className={`absolute inset-x-4 top-3 bottom-3 z-[5] rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-3 transition-transform duration-200 ease-out motion-reduce:transition-none ${
          open ? '-translate-y-1/2 delay-200' : ''
        }`}
      >
        <span className="text-sm font-semibold text-white line-clamp-1">{letter.heading}</span>
      </span>

      <span className={`absolute inset-0 z-10 rounded-xl border group-hover:border-rose-400/50 transition ${tone.body}`} />

      <span
        aria-hidden
        className={`absolute inset-x-px top-px h-[42%] origin-top transition-[transform,z-index] [transition-duration:200ms,0ms] ease-out motion-reduce:transition-none ${
          open ? 'z-0 [transform:rotateX(180deg)] [transition-delay:0ms,200ms]' : 'z-20 [transition-delay:150ms]'
        }`}
      >
        <span className="absolute inset-0 rounded-t-xl overflow-hidden">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
            <polygon points="0,0 100,0 50,100" className={tone.flap} />
            <polyline points="0,0 50,100 100,0" fill="none" vectorEffect="non-scaling-stroke" className={tone.edge} />
          </svg>
        </span>
      </span>

      {sealed && (
        <Seal
          name={sender}
          partner={!mine}
          className={`absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 z-30 ring-4 ${tone.ring} transition-opacity duration-100 motion-reduce:transition-none ${open ? 'opacity-0' : ''}`}
        />
      )}

      <span className="absolute inset-x-0 bottom-0 z-20 p-4">
        <span className="font-semibold text-white leading-snug line-clamp-1 break-words">{letter.heading}</span>
        <span className={`mt-1 flex items-center gap-x-2 text-xs ${tone.meta}`}>
          <span className="truncate">
            From {mine ? 'you' : <span className="text-rose-400 font-medium">{partnerName}</span>}
          </span>
          <span aria-hidden>·</span>
          <time dateTime={letter.created_at} className="shrink-0">
            {new Date(letter.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
          </time>
          {letter.spotify_track_id && (
            <>
              <span aria-hidden>·</span>
              <Music className="w-3.5 h-3.5 shrink-0" aria-hidden />
              <span className="sr-only">with a song</span>
            </>
          )}
          {sealed && (
            <span className="ml-auto shrink-0">
              {mine ? <Badge tone="neutral">Unopened</Badge> : <Badge tone="rose">New</Badge>}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

export function EnvelopeSkeleton() {
  return <div className="aspect-[3/2] rounded-xl bg-neutral-900 border border-neutral-800 animate-pulse" />;
}
