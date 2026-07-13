import { useEffect, useState } from 'react';
import { Sparkles, CheckCircle, Clock } from 'lucide-react';

interface QACardProps {
  question: string;
  yourAnswer: string | null;
  partnerAnswer: string | null;
  revealed: boolean;
  partnerName: string;
  nextQuestionAvailableIn: number;
  questionId: string; // to trigger flip on change
}

export function QACard({
  question,
  yourAnswer,
  partnerAnswer,
  revealed,
  partnerName,
  nextQuestionAvailableIn,
  questionId,
}: QACardProps) {
  const [flipped, setFlipped] = useState(false);

  // Flip the card when question changes
  useEffect(() => {
    setFlipped(true);
    const timer = setTimeout(() => setFlipped(false), 600); // animation duration
    return () => clearTimeout(timer);
  }, [questionId]);

  const hours = Math.floor(nextQuestionAvailableIn / 3600);
  const minutes = Math.floor((nextQuestionAvailableIn % 3600) / 60);
  const seconds = nextQuestionAvailableIn % 60;

  return (
    <div className="perspective-[1200px] w-full max-w-lg mx-auto">
      <div
        className={`relative w-full transition-transform duration-700 ease-in-out [transform-style:preserve-3d] ${
          flipped ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        {/* Front – Question */}
        <div className="absolute inset-0 [backface-visibility:hidden] bg-neutral-900 rounded-2xl border border-neutral-800 p-6 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-neutral-400 text-sm mb-2">
            <Sparkles className="w-4 h-4 text-rose-400" />
            <span>Question of the Day</span>
            <span className="text-xs text-neutral-600 ml-2">
              {new Date().toLocaleDateString()}
            </span>
          </div>
          <p className="text-xl text-white font-medium">{question}</p>
        </div>

        {/* Back – Status & Answers (visible after flip) */}
        <div className="[backface-visibility:hidden] [transform:rotateY(180deg)] bg-neutral-900 rounded-2xl border border-neutral-800 p-6 space-y-4">
          {/* Status Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-neutral-800/50 rounded-xl p-3 text-center">
              {yourAnswer ? (
                <CheckCircle className="w-5 h-5 mx-auto text-emerald-400" />
              ) : (
                <Clock className="w-5 h-5 mx-auto text-neutral-500" />
              )}
              <p className="text-xs text-neutral-400 mt-1">
                {yourAnswer ? 'You answered' : 'Waiting'}
              </p>
            </div>
            <div className="bg-neutral-800/50 rounded-xl p-3 text-center">
              {partnerAnswer ? (
                <CheckCircle className="w-5 h-5 mx-auto text-emerald-400" />
              ) : revealed ? (
                <Clock className="w-5 h-5 mx-auto text-rose-400" />
              ) : (
                <Clock className="w-5 h-5 mx-auto text-neutral-500" />
              )}
              <p className="text-xs text-neutral-400 mt-1">
                {partnerAnswer ? `${partnerName} answered` : revealed ? 'Revealing...' : 'Waiting'}
              </p>
            </div>
          </div>

          {yourAnswer && (
            <div className="bg-neutral-800/30 rounded-xl p-3">
              <p className="text-xs text-neutral-500 mb-1">Your answer</p>
              <p className="text-sm text-white">{yourAnswer}</p>
            </div>
          )}

          {partnerAnswer && revealed && (
            <div className="bg-rose-400/5 border border-rose-400/20 rounded-xl p-3">
              <p className="text-xs text-rose-400/60 mb-1">{partnerName}'s answer</p>
              <p className="text-sm text-white">{partnerAnswer}</p>
            </div>
          )}

          {revealed && (
            <div className="bg-neutral-800/50 rounded-xl p-3 flex items-center justify-center gap-2 text-sm text-neutral-400">
              <Clock className="w-4 h-4" />
              Next question in{' '}
              <span className="text-white font-mono">
                {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
