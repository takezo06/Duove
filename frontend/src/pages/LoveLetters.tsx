import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { Heart, Plus, Sparkles } from 'lucide-react';
import { RecentLettersList } from '../components/love-letters/RecentLettersList';
import { SendLetterModal } from '../components/love-letters/SendLetterModal';
import { LetterDetailModal } from '../components/love-letters/LetterDetailModal';
import { usePageTitle } from '../hooks/usePageTitle';

export function LoveLetters() {
  usePageTitle('Love Letters');
  const [showModal, setShowModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedLetter, setSelectedLetter] = useState<any | null>(null);
  const location = useLocation();

  // Highlight and display a specific letter when arriving from a deep-linked notification
  useEffect(() => {
    const state = location.state as { highlightId?: string } | null;
    const highlightId = state?.highlightId;
    if (!highlightId) return;

    const fetchLetter = async () => {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/love-letters?id=${highlightId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data && res.data.length > 0) {
          setSelectedLetter(res.data[0]);
          
          // Clear history state window frame gracefully so it won't pop up again on page refreshes
          window.history.replaceState({}, document.title);
        }
      } catch (err) {
        console.error('Failed to fetch highlighted letter', err);
      }
    };

    fetchLetter();
  }, [location.key]);

  const handleLetterSent = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      {/* View Header Matrix */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2.5">
            <Heart className="w-6 h-6 text-rose-400 fill-rose-400/10" />
            Love Letters
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Your shared archive of digital keepsakes, lyrics, and letters.
          </p>
        </div>
        
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white rounded-xl flex items-center gap-2 font-medium shadow-lg shadow-rose-500/20 transition-all duration-200"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          New Letter
        </button>
      </div>

      <div className="space-y-8">
        {/* Actionable Hero Prompt Banner */}
        <button
          onClick={() => setShowModal(true)}
          className="w-full text-left relative overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-900 to-rose-950/10 border border-neutral-800 hover:border-rose-500/30 rounded-2xl p-6 shadow-xl transition-all duration-300 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500/40"
        >
          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-neutral-800 group-hover:text-rose-500/20 group-hover:scale-110 transition-all duration-300 pointer-events-none">
            <Sparkles className="w-20 h-20" />
          </div>
          <div className="relative z-10 max-w-xl pr-16">
            <p className="text-white text-lg font-medium group-hover:text-rose-400 transition-colors duration-200 flex items-center gap-2">
              Want to send some love?
              <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Click to write
              </span>
            </p>
            <p className="text-neutral-400 text-sm mt-1.5 leading-relaxed">
              Write a thoughtful message, link a snapshot of a special Spotify song track, and seamlessly ship it straight over into your partner's dynamic mailbox tray.
            </p>
          </div>
        </button>

        {/* Dynamic List Render Matrix */}
        <div className="space-y-4">
          <RecentLettersList 
            key={refreshKey} 
            onSelectLetter={(letter: any) => setSelectedLetter(letter)} 
          />
        </div>
      </div>

      {/* Action Workspace Dialog Modals */}
      {showModal && (
        <SendLetterModal
          onClose={() => setShowModal(false)}
          onSent={handleLetterSent}
        />
      )}

      {selectedLetter && (
        <LetterDetailModal
          letter={selectedLetter}
          onClose={() => setSelectedLetter(null)}
        />
      )}
    </div>
  );
}
