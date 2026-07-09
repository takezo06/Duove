import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import axios from 'axios';
import { LetterCard } from './LetterCard';
import { LetterDetailModal } from './LetterDetailModal';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export function RecentLettersList() {
  const [letters, setLetters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLetter, setSelectedLetter] = useState<any | null>(null);

  const fetchRecent = async () => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) return;
    try {
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/love-letters?limit=6`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLetters(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecent();
  }, []);

  return (
    <>
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white">Recent Letters</h3>
          <Link to="/letters/all" className="text-rose-400 text-sm flex items-center gap-1 hover:underline">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <p className="text-neutral-400 text-sm">Loading...</p>
        ) : letters.length === 0 ? (
          <p className="text-neutral-500 text-sm">No letters yet. Send your first one!</p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
            {letters.map((letter) => (
              <LetterCard
                key={letter.id}
                letter={letter}
                onClick={() => setSelectedLetter(letter)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedLetter && (
        <LetterDetailModal
          letter={selectedLetter}
          onClose={() => setSelectedLetter(null)}
        />
      )}
    </>
  );
}
