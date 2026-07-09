import { useState } from 'react';
import { Heart, Plus, PenTool, Sparkles } from 'lucide-react';
import { RecentLettersList } from '../components/love-letters/RecentLettersList';
import { SendLetterModal } from '../components/love-letters/SendLetterModal';

export function LoveLetters() {
  const [showModal, setShowModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleLetterSent = () => {
    setRefreshKey(prev => prev + 1); 
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2.5 tracking-tight">
            <Heart className="w-6 h-6 text-rose-500 fill-rose-500/10" />
            Love Letters
          </h1>
          <p className="text-xs text-neutral-500 font-sans pl-8 hidden sm:block">
            Your private space for archiving words, tracks, and moments.
          </p>
        </div>
        
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl flex items-center gap-2 font-medium text-sm transition-all duration-200 shadow-md shadow-rose-950/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
        >
          <Plus className="w-4 h-4" />
          New Letter
        </button>
      </div>

      <div className="space-y-8">
        
        {/* Interactive Prompt Hero Card */}
        <div 
          onClick={() => setShowModal(true)}
          className="group relative bg-neutral-900 border border-neutral-800 rounded-2xl p-6 cursor-pointer overflow-hidden transition-all duration-300 hover:border-neutral-700/80 hover:-translate-y-0.5 shadow-lg select-none"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h3 className="text-white text-lg font-medium tracking-wide group-hover:text-rose-400 transition-colors">
                  Want to send some love?
                </h3>
                <Sparkles className="w-3.5 h-3.5 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse" />
              </div>
              <p className="text-neutral-400 text-sm leading-relaxed max-w-xl">
                Write a meaningful message, attach a favorite Spotify track embed, and instantly surprise your partner.
              </p>
            </div>
            
            <div className="w-10 h-10 rounded-xl bg-neutral-950/40 border border-neutral-800/80 flex items-center justify-center text-neutral-500 group-hover:text-rose-400 group-hover:border-rose-500/20 group-hover:bg-rose-500/5 transition-all duration-300 shrink-0">
              <PenTool className="w-4 h-4 transition-transform duration-300 group-hover:rotate-6" />
            </div>
          </div>
        </div>

        {/* Recent Letters List Component (Rendered cleanly with direct layout spacing) */}
        <div className="pt-2">
          <RecentLettersList key={refreshKey} />
        </div>
      </div>

      {/* Sheet Modal Engine Overlay */}
      {showModal && (
        <SendLetterModal
          onClose={() => setShowModal(false)}
          onSent={handleLetterSent}
        />
      )}
    </div>
  );
}
