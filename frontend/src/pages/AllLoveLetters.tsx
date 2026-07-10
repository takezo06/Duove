import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { Heart, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EnvelopeCard } from '../components/love-letters/EnvelopeCard';
import { LetterDetailModal } from '../components/love-letters/LetterDetailModal';
import { AllLettersSkeleton } from '../components/love-letters/SkeletonCard';
import { usePageTitle } from '../hooks/usePageTitle';

export function AllLoveLetters() {
  usePageTitle('All Letters');
  const [letters, setLetters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [animateScatter, setAnimateScatter] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<any | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);

  const location = useLocation();
  const highlightId = (location.state as any)?.highlightId;

  useEffect(() => {
    const fetchAll = async () => {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/love-letters?limit=50`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setLetters(res.data);
        
        // Trigger scatter animation after data loads
        setTimeout(() => {
          setAnimateScatter(true);
        }, 200);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Handle highlighted letter from notification
  useEffect(() => {
    if (!highlightId || loading) return;

    const highlightLetter = async () => {
      // Try to find the letter in the already loaded list
      let letter = letters.find(l => l.id === highlightId);
      
      if (!letter) {
        // Fetch it directly from the backend
        try {
          const token = (await supabase.auth.getSession()).data.session?.access_token;
          if (!token) return;
          const res = await axios.get(
            `${import.meta.env.VITE_BACKEND_URL}/api/love-letters?id=${highlightId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (res.data.length > 0) {
            letter = res.data[0];
          }
        } catch (err) {
          console.error('Failed to fetch highlighted letter', err);
        }
      }

      if (letter) {
        handleOpenLetter(letter);
      }
    };

    highlightLetter();
  }, [highlightId, letters, loading]);

  const handleOpenLetter = (letter: any) => {
    setSelectedLetter(letter);
    setIsModalLoading(true);
    setTimeout(() => setIsModalLoading(false), 600); 
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/letters" className="text-neutral-400 hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-semibold text-white">All Letters</h1>
        </div>
        
        <div className="flex items-center gap-1.5 text-neutral-400 bg-neutral-900 border border-neutral-700 px-3 py-1.5 rounded-lg text-sm font-medium">
          <Heart className="w-4 h-4 text-rose-400 fill-rose-400/20" />
          <span>{loading ? "..." : `${letters.length} letters`}</span>
        </div>
      </div>

      {/* Grid Workspace */}
      {loading ? (
        <AllLettersSkeleton />
      ) : letters.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-8 text-center">
          <Heart className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
          <p className="text-white text-lg font-medium">No letters yet</p>
          <p className="text-neutral-400 text-sm mt-2 max-w-xs mx-auto">
            When you receive or save love letters, they will automatically sync here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 [perspective:1200px]">
          {letters.map((letter, index) => {
            const rotations = [-16, 14, -8, 22, -12, 6, -18, 10];
            const xOffsets = [-50, 60, -30, 40, -70, 55, -25, 35];
            const yOffsets = [140, 160, 130, 180, 150, 135, 145, 155];

            const rotation = rotations[index % rotations.length];
            const x = xOffsets[index % xOffsets.length];
            const y = yOffsets[index % yOffsets.length] + (index * -6); 

            return (
              <div
                key={letter.id}
                className="will-change-transform opacity-0"
                style={{
                  transition: 'transform 1200ms cubic-bezier(0.25, 1, 0.5, 1), opacity 1000ms linear, z-index 1200ms step-end',
                  transform: animateScatter 
                    ? 'translate3d(0, 0, 0) rotate(0deg) scale(1)' 
                    : `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg) scale(0.92)`,
                  opacity: animateScatter ? 1 : 0.2,
                  zIndex: animateScatter ? 1 : 50 - index,
                  transitionDelay: animateScatter ? `${index * 80}ms` : '0ms'
                }}
              >
                <div className="transition-transform duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl">
                  <EnvelopeCard
                    letter={letter}
                    onClick={() => handleOpenLetter(letter)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Engine */}
      {(selectedLetter || isModalLoading) && (
        <LetterDetailModal
          letter={selectedLetter}
          isLoading={isModalLoading}
          onClose={() => setSelectedLetter(null)}
        />
      )}
    </div>
  );
}
