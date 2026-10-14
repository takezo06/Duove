import { ArrowLeft, ArrowRight, Music } from 'lucide-react';
import { CardHeader, iconClass, secondaryButton } from '../Card';

export interface Letter {
  id: string;
  heading: string;
  message: string;
  sender_id: string;
  sender_name: string | null;
  recipient_name: string | null;
  created_at: string;
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

  return (
    <article>
      <p className="text-sm text-neutral-400 pr-10 lg:pr-0">
        {mine ? <>You to {partner}</> : <>{partner} to you</>}
        <span aria-hidden> · </span>
        <time dateTime={letter.created_at}>
          {new Date(letter.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
        </time>
      </p>
      <h2 className="mt-2 text-2xl font-bold text-white leading-snug break-words">{letter.heading}</h2>

      <div className="mt-6 max-w-prose text-neutral-200 leading-relaxed break-words">
        {letter.recipient_name && <p className="text-neutral-300">{letter.recipient_name},</p>}
        <p className="mt-4 whitespace-pre-wrap">{letter.message}</p>
        {letter.sender_name && <p className="mt-6 text-neutral-300">{letter.sender_name}</p>}
      </div>

      {letter.spotify_track_id && (
        <div className="mt-8 pt-6 border-t border-neutral-800">
          <CardHeader
            icon={<Music className={iconClass} aria-hidden />}
            title={mine ? 'The song you added' : `${partnerName} added a song`}
          />
          <iframe
            title={`${letter.spotify_track_name ?? 'Song'} on Spotify`}
            src={`https://open.spotify.com/embed/track/${letter.spotify_track_id}`}
            width="100%"
            height="80"
            loading="lazy"
            allow="encrypted-media"
            className="mt-4 rounded-xl border-0"
          />
        </div>
      )}

      {(onNewer || onOlder) && (
        <nav aria-label="More letters" className="mt-8 pt-6 border-t border-neutral-800 flex justify-between gap-3">
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
