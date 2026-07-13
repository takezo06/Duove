import { useEffect, useState } from 'react';
import { Sparkles, CheckCircle, Clock } from 'lucide-react';

interface QADeckProps {
  question: string;
  questionId: string;
  yourAnswer: string | null;
  partnerAnswer: string | null;
  revealed: boolean;
  partnerName: string;
  nextQuestionAvailableIn: number;
  children?: React.ReactNode;   // answer form or extra content
}

export function QADeck({
  question,
  questionId,
  yourAnswer,
  partnerAnswer,
  revealed,
  partnerName,
  nextQuestionAvailableIn,
  children,
}: QADeckProps) {
  const [exiting, setExiting] = useState(false);
  const [displayQuestion, setDisplayQuestion] = useState(question);
  const [displayId, setDisplayId] = useState(questionId);

  // When questionId changes, trigger exit animation
  useEffect(() => {
    if (questionId !== displayId) {
      setExiting(true);
      const timeout = setTimeout(() => {
        setDisplayQuestion(question);
        setDisplayId(questionId);
        setExiting(false);
      }, 500); // matches animation duration
      return () => clearTimeout(timeout);
    }
  }, [questionId, displayId, question]);

  const hours = Math.floor(nextQuestionAvailableIn / 3600);
  const minutes = Math.floor((nextQuestionAvailableIn % 3600) / 60);
  const seconds = nextQuestionAvailableIn % 60;

  return (
    <div className="relative w-full max-w-lg mx-auto" style={{ perspective: '1200px' }}>
      {/* Background stack – 3 cards */}
      <div
        className="absolute inset-0 bg-neutral-800/40 rounded-2xl border border-neutral-700/30"
        style={{ transform: 'rotate(-2deg) translateY(8px) scale(0.98)' }}
      />
      <div
        className="absolute inset-0 bg-neutral-800/50 rounded-2xl border border-neutral-700/40"
        style={{ transform: 'rotate(1.5deg) translateY(4px) scale(0.99)' }}
      />
      <div
        className="absolute inset-0 bg-neutral-800/60 rounded-2xl border border-neutral-700/50"
        style={{ transform: 'rotate(-0.5deg) translateY(2px) scale(0.995)' }}
      />

      {/* Top card (the active one) */}
      <div
        className={`relative bg-neutral-900 rounded-2xl border border-neutral-700 p-6 transition-all duration-500 ease-in-out ${
          exiting
            ? 'opacity-0 translate-x-16 rotate-6 scale-95'
            : 'opacity-100 translate-x-0 rotate-0 scale-100'
        }`}
        style={{ zIndex: 10 }}
      >
        {/* Question header */}
        <div className="flex items-center gap-2 text-neutral-400 text-sm mb-2">
          <Sparkles className="w-4 h-4 text-rose-400" />
          <span>Question of the Day</span>
          <span className="text-xs text-neutral-600 ml-2">
            {new Date().toLocaleDateString()}
          </span>
        </div>
        <p className="text-xl text-white font-medium mb-6">{displayQuestion}</p>

        {/* Status row (always visible, for quick glance) */}
        <div className="grid grid-cols-2 gap-3 mb-4">
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

        {/* Revealed answers (if both answered) */}
        {yourAnswer && (
          <div className="bg-neutral-800/30 rounded-xl p-3 mb-3">
            <p className="text-xs text-neutral-500 mb-1">Your answer</p>
            <p className="text-sm text-white">{yourAnswer}</p>
          </div>
        )}
        {partnerAnswer && revealed && (
          <div className="bg-rose-400/5 border border-rose-400/20 rounded-xl p-3 mb-3">
            <p className="text-xs text-rose-400/60 mb-1">{partnerName}'s answer</p>
            <p className="text-sm text-white">{partnerAnswer}</p>
          </div>
        )}

        {/* Countdown when revealed */}
        {revealed && (
          <div className="bg-neutral-800/50 rounded-xl p-3 flex items-center justify-center gap-2 text-sm text-neutral-400 mt-2">
            <Clock className="w-4 h-4" />
            Next question in{' '}
            <span className="text-white font-mono">
              {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
        )}

        {/* Answer form or any children (rendered below the card content) */}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  );
}
