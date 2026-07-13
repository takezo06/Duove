import { Link } from 'react-router-dom';
import { History, Settings, XCircle, MessageCircle } from 'lucide-react';

interface QAHeaderProps {
  onSkip: () => void;
  onSettings: () => void;
  skipping: boolean;
  youAnswered: boolean;
}

export function QAHeader({ onSkip, onSettings, skipping, youAnswered }: QAHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-400/10 flex items-center justify-center border border-rose-400/20">
          <MessageCircle className="w-5 h-5 text-rose-400" />
        </div>
        <h1 className="text-2xl font-semibold text-white">Daily Q&A</h1>
        {!youAnswered && (
          <button
            onClick={onSkip}
            disabled={skipping}
            className="text-sm text-neutral-400 hover:text-rose-400 transition flex items-center gap-1.5"
          >
            <XCircle className="w-4 h-4" />
            Skip
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Link
          to="/qa/history"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-400/30 text-rose-400 hover:text-white hover:bg-rose-500/20 transition-all duration-200 shadow-[0_0_15px_rgba(244,63,94,0.15)] hover:shadow-[0_0_25px_rgba(244,63,94,0.35)]"
        >
          <History className="w-4 h-4" />
          <span className="text-sm">History</span>
        </Link>
        <button onClick={onSettings} className="text-sm text-neutral-400 hover:text-white transition flex items-center gap-1.5">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
