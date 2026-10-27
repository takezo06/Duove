import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import axios from 'axios';
import { X, Search, Send, Loader2, Flower2 } from 'lucide-react';
import { Modal, field, focusRing, iconButton, inset, primaryButton, secondaryButton } from '../Card';
import { apiError } from '../../lib/apiError';
import type { Letter } from './LetterReader';
import { Bouquet } from '../flowers/Bouquet';
import { BouquetBuilder } from '../flowers/BouquetBuilder';
import { listStems, wrapOf, type Bouquet as BouquetValue } from '../../lib/bouquet';
import { plural } from '../../lib/plural';

interface Track {
  id: string;
  name: string;
  artist: string;
  albumArt: string;
}

interface SendLetterModalProps {
  myName: string;
  partnerName: string;
  onClose: () => void;
  onSent: (letter: Letter) => void;
}

export function SendLetterModal({ myName, partnerName, onClose, onSent }: SendLetterModalProps) {
  const [recipientName, setRecipientName] = useState(partnerName);
  const [senderName, setSenderName] = useState(myName);
  const [heading, setHeading] = useState('');
  const [body, setBody] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [selectedSong, setSelectedSong] = useState<Track | null>(null);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [sendError, setSendError] = useState('');
  // Flowers are built in a second view of this modal; the letter keeps everything typed meanwhile
  const [view, setView] = useState<'letter' | 'flowers'>('letter');
  const [bouquet, setBouquet] = useState<BouquetValue | null>(null);
  const flowersButton = useRef<HTMLButtonElement>(null);
  const returning = useRef(false);
  const canSend = heading.trim() !== '' && body.trim() !== '' && !sending;

  // Back from the builder: focus returns to the flowers field it was opened from
  useEffect(() => {
    if (view === 'letter' && returning.current) flowersButton.current?.focus();
    returning.current = view === 'flowers';
  }, [view]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError('');
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/love-letters/search-song`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { q: searchQuery },
      });
      setSearchResults(res.data);
      if (res.data.length === 0) setSearchError('No songs found. Try another search.');
    } catch (err) {
      setSearchError(apiError(err, "Couldn't search songs. Try again."));
    } finally {
      setSearching(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    setSending(true);
    setSendError('');
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/love-letters`,
        {
          heading,
          message: body,
          recipient_name: recipientName,
          sender_name: senderName,
          spotify_track_id: selectedSong?.id,
          spotify_track_name: selectedSong?.name,
          spotify_artist_name: selectedSong?.artist,
          spotify_album_art: selectedSong?.albumArt,
          bouquet: bouquet ?? undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSent(res.data);
      onClose();
    } catch (err) {
      setSendError(apiError(err, "Your letter didn't send. Try again."));
    } finally {
      setSending(false);
    }
  };

  if (view === 'flowers') {
    return (
      <Modal label={`Flowers for ${partnerName}`} onClose={onClose} wide>
        <BouquetBuilder
          initial={bouquet}
          partnerName={partnerName}
          to={recipientName.trim()}
          from={senderName.trim()}
          onUse={(b) => { setBouquet(b); setView('letter'); }}
          onBack={() => setView('letter')}
        />
      </Modal>
    );
  }

  return (
    <Modal label={`Write to ${partnerName}`} onClose={onClose} wide>
      <h2 className="text-xl font-bold text-white pr-10">Write to {partnerName}</h2>

      <form onSubmit={handleSend} className="mt-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="letter-to" className="block text-sm text-neutral-400 mb-2">To</label>
            <input id="letter-to" type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} maxLength={80} className={field} />
          </div>
          <div>
            <label htmlFor="letter-from" className="block text-sm text-neutral-400 mb-2">Signed</label>
            <input id="letter-from" type="text" value={senderName} onChange={(e) => setSenderName(e.target.value)} maxLength={80} placeholder="Your name or nickname" className={field} />
          </div>
        </div>

        <div>
          <label htmlFor="letter-heading" className="block text-sm text-neutral-400 mb-2">Heading</label>
          <input
            id="letter-heading"
            type="text"
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
            maxLength={120}
            placeholder="My favorite memory with you"
            className={field}
          />
        </div>

        <div>
          <label htmlFor="letter-message" className="block text-sm text-neutral-400 mb-2">Letter</label>
          <textarea
            id="letter-message"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={5000}
            placeholder={`Dear ${partnerName},`}
            className={`${field} h-48 md:h-64 resize-y leading-relaxed`}
          />
        </div>

        <div>
          <p id="letter-flowers" className="block text-sm text-neutral-400 mb-2">Add flowers (optional)</p>
          {bouquet ? (
            <div className={`${inset} flex items-center gap-3`}>
              <Bouquet bouquet={bouquet} size="thumb" className="w-10 h-12 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium line-clamp-2 break-words">{listStems(bouquet.stems)}</p>
                <p className="text-neutral-400 text-xs">
                  {plural(bouquet.stems.length, 'stem')} in {wrapOf(bouquet.wrap).phrase}
                </p>
              </div>
              <button ref={flowersButton} type="button" onClick={() => setView('flowers')} aria-describedby="letter-flowers" className={`${secondaryButton} shrink-0`}>
                Change
              </button>
              <button type="button" onClick={() => setBouquet(null)} aria-label="Remove flowers" className={iconButton}>
                <X className="w-4 h-4" aria-hidden />
              </button>
            </div>
          ) : (
            <button ref={flowersButton} type="button" onClick={() => setView('flowers')} aria-describedby="letter-flowers" className={secondaryButton}>
              <Flower2 className="w-4 h-4" aria-hidden />
              Pick flowers
            </button>
          )}
        </div>

        <div>
          <label htmlFor="letter-song" className="block text-sm text-neutral-400 mb-2">Add a song (optional)</label>
          {selectedSong ? (
            <div className={`${inset} flex items-center gap-3`}>
              {selectedSong.albumArt && <img src={selectedSong.albumArt} alt="" className="w-10 h-10 rounded-lg" />}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{selectedSong.name}</p>
                <p className="text-neutral-400 text-xs truncate">{selectedSong.artist}</p>
              </div>
              <button type="button" onClick={() => setSelectedSong(null)} aria-label="Remove song" className={iconButton}>
                <X className="w-4 h-4" aria-hidden />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                id="letter-song"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
                placeholder="Search Spotify"
                className={field}
              />
              <button type="button" onClick={handleSearch} disabled={searching || !searchQuery.trim()} className={`${secondaryButton} shrink-0`}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Search className="w-4 h-4" aria-hidden />}
                Search
              </button>
            </div>
          )}

          {searchError && <p role="alert" className="mt-2 text-sm text-rose-300">{searchError}</p>}

          {!selectedSong && searchResults.length > 0 && (
            <ul className="mt-2 max-h-48 overflow-y-auto space-y-1">
              {searchResults.map((track) => (
                <li key={track.id}>
                  <button
                    type="button"
                    onClick={() => { setSelectedSong(track); setSearchResults([]); setSearchQuery(''); }}
                    className={`w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-neutral-800/50 transition cursor-pointer ${focusRing}`}
                  >
                    {track.albumArt && <img src={track.albumArt} alt="" className="w-10 h-10 rounded-lg" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{track.name}</p>
                      <p className="text-neutral-400 text-xs truncate">{track.artist}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {sendError && <p role="alert" className="text-sm text-rose-300">{sendError}</p>}

        <button type="submit" disabled={!canSend} className={`${primaryButton} w-full`}>
          {sending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Send className="w-4 h-4" aria-hidden />}
          {sending ? 'Sending...' : 'Send letter'}
        </button>
      </form>
    </Modal>
  );
}
