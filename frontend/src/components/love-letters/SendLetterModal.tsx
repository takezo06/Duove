import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import axios from 'axios';
import { X, Music, Send, Heart } from 'lucide-react';
import { focusRing } from '../Card';
import { apiError } from '../../lib/apiError';

interface SendLetterModalProps {
  onClose: () => void;
  onSent: () => void;
}

export function SendLetterModal({ onClose, onSent }: SendLetterModalProps) {
  const [heading, setHeading] = useState('');
  const [body, setBody] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [senderName, setSenderName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedSong, setSelectedSong] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [sendError, setSendError] = useState('');
  const canSend = heading.trim() !== '' && body.trim() !== '' && !sending;

  // Fetch user's display name and partner's name
  useEffect(() => {
    const fetchNames = async () => {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      try {
        // Get user's own profile
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;
        if (userId) {
          const { data: myProfile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', userId)
            .single();
          setSenderName(myProfile?.display_name || '');
        }

        // Get partner's name
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/relationships/me`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setRecipientName(res.data.partner?.display_name || 'My love');
      } catch (err) {
        console.error(err);
        setRecipientName('My love');
      }
    };
    fetchNames();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
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
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setSendError('');
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      await axios.post(
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
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSent();
      onClose();
    } catch (err) {
      setSendError(apiError(err, "Your letter didn't send. Try again."));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} aria-label="Close" className={`absolute top-3 right-3 p-2.5 rounded-lg text-neutral-400 hover:text-white ${focusRing}`}>
          <X className="w-5 h-5" aria-hidden />
        </button>

        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-400" />
          New Letter
        </h2>

        {/* To */}
        <div className="mb-4">
          <label htmlFor="letter-to" className="text-sm text-neutral-400 mb-1 block">To</label>
          <input
            type="text"
            id="letter-to"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            className="w-full bg-neutral-800 text-white rounded-lg px-3 py-2 border border-neutral-700 focus:border-rose-400 outline-none"
          />
        </div>

        {/* Heading */}
        <div className="mb-4">
          <label htmlFor="letter-heading" className="text-sm text-neutral-400 mb-1 block">Heading</label>
          <input
            type="text"
            id="letter-heading"
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
            placeholder="e.g. My favorite memory with you..."
            className="w-full bg-neutral-800 text-white rounded-lg px-3 py-2 border border-neutral-700 focus:border-rose-400 outline-none"
          />
        </div>

        {/* Body */}
        <div className="mb-4">
          <label htmlFor="letter-message" className="text-sm text-neutral-400 mb-1 block">Message</label>
          <textarea
            id="letter-message"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your heart out..."
            className="w-full bg-neutral-800 text-white rounded-lg px-3 py-2 resize-none h-28 border border-neutral-700 focus:border-rose-400 outline-none"
          />
        </div>

        {/* From */}
        <div className="mb-4">
          <label htmlFor="letter-from" className="text-sm text-neutral-400 mb-1 block">From</label>
          <input
            type="text"
            id="letter-from"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="Your name or nickname"
            className="w-full bg-neutral-800 text-white rounded-lg px-3 py-2 border border-neutral-700 focus:border-rose-400 outline-none"
          />
        </div>

        {/* Song search */}
        <div className="mb-4">
          <label className="text-sm text-neutral-400 mb-1 block">Attach a song (optional)</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              aria-label="Search Spotify"
              placeholder="Search Spotify..."
              className="flex-1 bg-neutral-800 text-white rounded-lg px-3 py-2 border border-neutral-700 focus:border-rose-400 outline-none"
            />
            <button
              onClick={handleSearch}
              disabled={loading || !searchQuery.trim()}
              aria-label="Search songs"
              className={`px-3 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg disabled:opacity-50 ${focusRing}`}
            >
              <Music className="w-4 h-4" aria-hidden />
            </button>
          </div>

          {searchError && <p role="alert" className="text-sm text-rose-300 mb-2">{searchError}</p>}

          {searchResults.length > 0 && (
            <div className="max-h-36 overflow-y-auto space-y-2">
              {searchResults.map((track) => (
                <button
                  key={track.id}
                  onClick={() => { setSelectedSong(track); setSearchResults([]); setSearchQuery(''); }}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg text-left hover:bg-neutral-800 ${
                    selectedSong?.id === track.id ? 'bg-neutral-800 border border-rose-400' : ''
                  }`}
                >
                  {track.albumArt && <img src={track.albumArt} alt="" className="w-8 h-8 rounded" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs truncate">{track.name}</p>
                    <p className="text-neutral-400 text-xs truncate">{track.artist}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedSong && (
            <div className="flex items-center gap-2 bg-neutral-800 rounded-lg p-2 mt-2">
              {selectedSong.albumArt && <img src={selectedSong.albumArt} alt="" className="w-8 h-8 rounded" />}
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{selectedSong.name}</p>
                <p className="text-neutral-400 text-xs">{selectedSong.artist}</p>
              </div>
              <button onClick={() => setSelectedSong(null)} aria-label="Remove song" className={`p-2 rounded-lg text-neutral-400 hover:text-white ${focusRing}`}>
                <X className="w-4 h-4" aria-hidden />
              </button>
            </div>
          )}
        </div>

        {sendError && <p role="alert" className="text-sm text-rose-300 mb-3">{sendError}</p>}

        <button
          onClick={handleSend}
          disabled={!canSend}
          className="w-full py-3 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-lg flex items-center justify-center gap-2 transition"
        >
          <Send className="w-4 h-4" aria-hidden />
          {sending ? 'Sending...' : 'Send Letter'}
        </button>
      </div>
    </div>
  );
}
