import { Loader2, Send } from 'lucide-react';

interface QAAnswerFormProps {
  answerText: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  disabled: boolean;
}

export function QAAnswerForm({ answerText, onChange, onSubmit, submitting, disabled }: QAAnswerFormProps) {
  return (
    <div className="space-y-4 mt-6">
      <textarea
        value={answerText}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write your answer here..."
        className="w-full bg-neutral-800/50 text-sm text-white placeholder:text-neutral-500 px-4 py-3 rounded-xl border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-rose-400/50 min-h-[120px] resize-none"
      />
      <button
        onClick={onSubmit}
        disabled={disabled || submitting}
        className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-500/20"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {submitting ? 'Submitting...' : 'Submit Answer'}
      </button>
    </div>
  );
}
