interface LetterCardProps {
  letter: any;
  onClick: () => void;
}

export function LetterCard({ letter, onClick }: LetterCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 min-w-[200px] max-w-[260px] flex-shrink-0 text-left hover:border-rose-400/50 transition cursor-pointer"
    >
      <p className="text-white font-medium truncate">{letter.heading}</p>
      <p className="text-xs text-neutral-400 mt-1">To: {letter.recipient_name}</p>
      <p className="text-xs text-neutral-500 mt-1">From: {letter.sender_name}</p>
    </button>
  );
}
