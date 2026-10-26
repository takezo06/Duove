import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Music, Play } from 'lucide-react';
import { CardHeader, iconClass, inset, secondaryButton, textLink } from '../Card';
import { useConsent } from '../../hooks/useConsent';
import { saveConsent } from '../../lib/consent';

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
