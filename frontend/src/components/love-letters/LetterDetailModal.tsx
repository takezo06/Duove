import { useEffect } from 'react';
import { LetterDetailModalSkeleton } from './SkeletonCard';

interface LetterDetailModalProps {
  letter: any;
  onClose: () => void;
  isLoading?: boolean; // Set this true if waiting on single query actions
}

export function LetterDetailModal({ letter, onClose, isLoading }: LetterDetailModalProps) {
  
  useEffect(() => {
    if (letter || isLoading) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [letter, isLoading]);

  // Intercept render tree to show the matching modal spinner/skeleton
  if (isLoading) return <LetterDetailModalSkeleton />;
  if (!letter) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-x-hidden overflow-y-auto">
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md transition-opacity duration-300 animate-fade-in cursor-pointer overflow-hidden" 
      >
        <div className="absolute top-[20%] left-[15%] w-72 h-72 rounded-full bg-rose-500/10 blur-[100px] animate-ambient-slow" />
        <div className="absolute bottom-[25%] right-[15%] w-96 h-96 rounded-full bg-rose-700/5 blur-[120px] animate-ambient-delayed" />
      </div>

      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl bg-neutral-900 rounded-xl border border-neutral-800 shadow-[0_25px_70px_-10px_rgba(244,63,94,0.15)] flex flex-col transform transition-all duration-300 animate-scale-up z-10 max-h-[85vh]"
      >
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-rose-500/30 to-transparent rounded-t-xl" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800/60 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-rose-500 text-sm">♥</span>
            <span className="text-neutral-400 font-mono text-xs uppercase tracking-widest">
              From: {letter.sender_name}
            </span>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-rose-400 transition-colors text-sm font-mono tracking-wider focus:outline-none">
            [ Close ]
          </button>
        </div>

        {/* Lined Paper Content Area */}
        <div 
          className="flex-1 overflow-y-auto p-8 font-serif leading-relaxed text-neutral-200 select-text space-y-6"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(244, 63, 94, 0.05) 28px)',
            backgroundSize: '100% 28px',
            lineHeight: '28px'
          }}
        >
          <h2 className="text-xl font-bold font-serif text-neutral-100 tracking-tight pt-1">
            {letter.heading}
          </h2>

          <div className="text-sm whitespace-pre-wrap text-neutral-300/90 font-medium tracking-wide">
            {letter.message || "No content provided."}
          </div>

          {letter.spotify_track_id && (
            <div className="mt-6 pt-4 border-t border-neutral-800/40">
              <p className="text-xs text-neutral-400 font-mono mb-3 flex items-center gap-2">
                <span>🎵</span> {letter.spotify_track_name}
              </p>
              <iframe
                src={`https://open.spotify.com/embed/track/${letter.spotify_track_id}`}
                width="100%"
                height="80"
                frameBorder="0"
                allow="encrypted-media"
                className="rounded-lg shadow-md bg-transparent"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-800/60 px-6 py-4 flex items-center justify-between bg-neutral-950/20 rounded-b-xl">
          <div className="text-[11px] font-mono text-neutral-500">
            Received: {new Date(letter.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-sans uppercase tracking-wider text-neutral-400 font-semibold">
              To: {letter.recipient_name}
            </span>
            <div className="w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center shadow-[0_0_8px_rgba(244,63,94,0.4)]">
              <span className="text-white text-[8px]">♥</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
