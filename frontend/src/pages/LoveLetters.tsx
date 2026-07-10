import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { Heart, Plus } from 'lucide-react';
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

  // Highlight a letter when arriving from a notification
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
        if (res.data.length > 0) {
          setSelectedLetter(res.data[0]);
        }
      } catch (err) {
        console.error('Failed to fetch highlighted letter', err);
      }
    };

    fetchLetter();
  }, [location.key]);   // 🔁 re-runs on every navigation (even to the same path)

  const handleLetterSent = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
          <Heart className="w-6 h-6 text-rose-400" />
          Love Letters
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" />
          New Letter
        </button>
      </div>

      <div className="space-y-6">
        <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6">
          <p className="text-white text-lg font-medium">Want to send some love?</p>
          <p className="text-neutral-400 text-sm mt-2">
            Write a letter, pick a Spotify song, and make their day.
          </p>
        </div>

        <RecentLettersList key={refreshKey} />
      </div>

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
