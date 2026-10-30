import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Flower2, Music, Play } from 'lucide-react';
import { CardHeader, focusRing, iconClass, inset, secondaryButton, textLink } from '../Card';
import { useConsent } from '../../hooks/useConsent';
import { saveConsent } from '../../lib/consent';
import { counts, countLabel, isBouquet, type Bouquet as BouquetValue } from '../../lib/bouquet';
import { Bouquet } from '../flowers/Bouquet';
import { FlowerIcon } from '../flowers/FlowerArt';
import { Polaroid } from '../flowers/Polaroid';

export interface Letter {
  id: string;
  heading: string;
  message: string;
  sender_id: string;
  sender_name: string | null;
  recipient_name: string | null;
  created_at: string;
  // null until the recipient opens it
  opened_at?: string | null;
  spotify_track_id?: string | null;
  spotify_track_name?: string | null;
  spotify_artist_name?: string | null;
  // flowers sent with it, null without
  bouquet?: BouquetValue | null;
  // a photo tucked into the flowers: a link the love-letters function signed for an hour, null without
  photo_url?: string | null;
}

interface LetterReaderProps {
  letter: Letter;
  mine: boolean;
  partnerName: string;
  onNewer?: () => void;
  onOlder?: () => void;
}

// One open letter: who wrote it, the letter itself, its song, and a way to the next one
export function LetterReader({ letter, mine, partnerName, onNewer, onOlder }: LetterReaderProps) {
  const partner = <span className="text-rose-400 font-medium">{partnerName}</span>;
  // Spotify's player sets Spotify's cookies, so it loads only once "Spotify players" is allowed
  const consent = useConsent();
  const photo = isBouquet(letter.bouquet) ? letter.photo_url : null;

  // The photo starts tucked into the bouquet. Taking it out moves it under the list of flowers, and it flies
  // there from where it was tucked. Kept per letter, so Newer and Older start with the photo tucked in again.
  const [pulledId, setPulledId] = useState<string | null>(null);
  const pulled = !!photo && pulledId === letter.id;
  const tuckedRef = useRef<HTMLButtonElement>(null);
  const photoRef = useRef<HTMLElement>(null);
  const from = useRef<{ x: number; y: number; w: number } | null>(null);

  const pullOut = () => {
    const el = tuckedRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      from.current = { x: r.left + r.width / 2, y: r.top + r.height / 2, w: el.offsetWidth };
    }
    setPulledId(letter.id);
  };

  // FLIP: the big photo is laid out in its place, then drawn back over the tucked one and let go. Centers and
  // layout widths, not the boxes, because both are tilted. Transform and clip only, so nothing reflows.
  useLayoutEffect(() => {
    const el = photoRef.current;
    const start = from.current;
    if (!pulled || !el || !start) return;
    from.current = null;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const settle = () => {
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    };
    if (reduce) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'ease-out' });
      settle();
      return;
    }
    const r = el.getBoundingClientRect();
    const dx = start.x - (r.left + r.width / 2);
    const dy = start.y - (r.top + r.height / 2);
    const k = start.w / el.offsetWidth;
    const flight = el.animate(
      [
        // where it was: tilted like the tucked one, its strip still inside the wrap
        { transform: `translate(${dx}px, ${dy}px) scale(${k}) rotate(-8deg)`, clipPath: 'inset(0 0 26% 0)', easing: 'cubic-bezier(0.3, 0, 0.2, 1)' },
        // drawn up out of the paper
        { transform: `translate(${dx}px, ${dy - 28}px) scale(${k * 1.08}) rotate(-5deg)`, clipPath: 'inset(0 0 0 0)', offset: 0.24, easing: 'cubic-bezier(0.34, 1.25, 0.5, 1)' },
        // and into its place, with a little give at the end
        { transform: 'rotate(-2deg)', clipPath: 'inset(0 0 0 0)' },
      ],
      { duration: 680 },
    );
    flight.onfinish = settle;
    return () => flight.cancel();
  }, [pulled]);

  return (
    <article>
      <div className="flex items-start gap-4 pr-10">
        <Stamp name={letter.sender_name || (mine ? 'You' : partnerName)} partner={!mine} date={letter.created_at} />
        <div className="min-w-0">
          <p className="text-sm text-neutral-400">
            {mine ? <>You to {partner}</> : <>{partner} to you</>}
            <span aria-hidden> · </span>
            <time dateTime={letter.created_at}>
              {new Date(letter.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
            </time>
          </p>
          <h2 className="mt-1 text-xl font-bold text-white leading-snug break-words">{letter.heading}</h2>
        </div>
      </div>

      <div className="mt-6 max-w-prose text-neutral-200 leading-relaxed break-words">
        {letter.recipient_name && <p className="text-rose-400 font-semibold">{letter.recipient_name},</p>}
        <p className="mt-4 whitespace-pre-wrap">{letter.message}</p>
        {letter.sender_name && (
          <div className="mt-6 flex flex-col items-end">
            <span aria-hidden className="w-10 h-px bg-rose-400/60" />
            <p className="mt-2 font-semibold text-white">{letter.sender_name}</p>
          </div>
        )}
      </div>

      {isBouquet(letter.bouquet) && (
        <div className="mt-6 pt-6 border-t border-neutral-800">
          <CardHeader
            icon={<Flower2 className={iconClass} aria-hidden />}
            title={
              mine
                ? photo ? 'The flowers and photo you sent' : 'The flowers you sent'
                : `${partnerName} sent you flowers${photo ? ' and a photo' : ''}`
            }
          />
          <div className="mt-4 grid sm:grid-cols-2 gap-6 items-start">
            <Bouquet
              bouquet={letter.bouquet}
              to={letter.recipient_name ?? undefined}
              from={letter.sender_name ?? undefined}
              tucked={
                photo && !pulled ? (
                  <button
                    ref={tuckedRef}
                    type="button"
                    onClick={pullOut}
                    aria-label={`Take out the photo ${mine ? 'you' : partnerName} tucked in`}
                    className={`polaroid-glow block w-full cursor-pointer ${focusRing}`}
                  >
                    <Polaroid src={photo} alt="" compact />
                  </button>
                ) : undefined
              }
              className="w-full max-w-xs mx-auto aspect-square"
            />
            <div>
              <ul className="space-y-3">
                {counts(letter.bouquet.stems).map(({ id, n }) => (
                  <li key={id} className="flex items-center gap-3">
                    <FlowerIcon id={id} className="w-8 h-8 shrink-0" />
                    <p className="min-w-0 text-white font-medium">{countLabel(id, n)}</p>
                  </li>
                ))}
              </ul>
              {photo && pulled && (
                <figure ref={photoRef} tabIndex={-1} style={{ transform: 'rotate(-2deg)' }} className="relative z-10 mt-6 w-full max-w-xs focus:outline-none">
                  <Polaroid
                    src={photo}
                    alt={mine ? 'The photo you sent' : `A photo from ${partnerName}`}
                    caption={new Date(letter.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  />
                </figure>
              )}
            </div>
          </div>
        </div>
      )}

      {letter.spotify_track_id && (
        <div className="mt-6 pt-6 border-t border-neutral-800">
          <CardHeader
            icon={<Music className={iconClass} aria-hidden />}
            title={mine ? 'The song you added' : `${partnerName} added a song`}
          />
          {consent?.spotify ? (
            <iframe
              title={`${letter.spotify_track_name ?? 'Song'} on Spotify`}
              src={`https://open.spotify.com/embed/track/${letter.spotify_track_id}`}
              width="100%"
              height="80"
              loading="lazy"
              allow="encrypted-media"
              className="mt-4 rounded-xl border-0"
            />
          ) : (
            <div className={`${inset} mt-4`}>
              <p className="text-white font-medium break-words">{letter.spotify_track_name ?? 'A song'}</p>
              {letter.spotify_artist_name && <p className="text-sm text-neutral-400 break-words">{letter.spotify_artist_name}</p>}
              <p className="mt-3 text-sm text-neutral-400">
                Spotify's player sets Spotify's cookies, so it waits for your OK.{' '}
                <Link to="/cookies#spotify" className={textLink}>Cookie policy</Link>
              </p>
              <button onClick={() => saveConsent({ cache: consent?.cache ?? false, spotify: true })} className={`${secondaryButton} mt-4`}>
                <Play className="w-4 h-4" aria-hidden />
                Allow Spotify players
              </button>
            </div>
          )}
        </div>
      )}

      {(onNewer || onOlder) && (
        <nav aria-label="More letters" className="mt-6 pt-6 border-t border-neutral-800 flex justify-between gap-3">
          <button onClick={onNewer} disabled={!onNewer} className={secondaryButton}>
            <ArrowLeft className="w-4 h-4" aria-hidden />
            Newer
          </button>
          <button onClick={onOlder} disabled={!onOlder} className={secondaryButton}>
            Older
            <ArrowRight className="w-4 h-4" aria-hidden />
          </button>
        </nav>
      )}
    </article>
  );
}

// A postage stamp in the letter's corner: the sender's initial and the day it was sent.
// Rose for the partner, neutral for you. The dashed outline is the perforation.
function Stamp({ name, partner, date }: { name: string; partner: boolean; date: string }) {
  return (
    <div
      aria-hidden
      className={`w-14 h-16 shrink-0 -rotate-3 rounded-lg flex flex-col items-center justify-center outline-2 outline-dashed [outline-offset:-5px] ${
        partner ? 'bg-rose-600 text-white outline-white/50' : 'bg-neutral-800 text-neutral-200 outline-neutral-600'
      }`}
    >
      <span className="text-xl font-bold leading-none">{name.charAt(0).toUpperCase()}</span>
      <span className="mt-1 text-xs font-medium tabular-nums">
        {new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
      </span>
    </div>
  );
}
