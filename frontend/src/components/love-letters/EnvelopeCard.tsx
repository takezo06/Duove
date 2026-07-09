interface EnvelopeCardProps {
  letter: any;
  onClick: () => void;
}

export function EnvelopeCard({ letter, onClick }: EnvelopeCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative w-full h-[150px] text-left cursor-pointer transition-all duration-300 ease-out transform hover:-translate-y-12 hover:scale-[1.05] hover:z-50 bg-transparent outline-none focus:outline-none rounded-md hover:shadow-[0_20px_50px_rgba(244,63,94,0.15)] hover:shadow-rose-500/20"
    >
      {/* 1. THE ENVELOPE FLAP: Locked to the pocket line (top-[40px]).
          STEP 1: Flips UP instantly on hover (0ms delay). Drops to z-0 so paper can clear it. */}
      <div 
        className="absolute top-[40px] inset-x-0 h-[45px] origin-top pointer-events-none drop-shadow-md z-30 transition-all duration-300 ease-in-out transform group-hover:scale-y-[-1] group-hover:z-0 group-hover:delay-0"
      >
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polygon points="0,0 100,0 50,100" fill="#262626" stroke="#383838" strokeWidth="1" />
        </svg>
      </div>

      {/* 2. THE PAPER SHEET: Slides UP.
          STEP 2: Explicitly delayed by 250ms so it waits for the flap to clear its path, sitting in front of the flap but behind the pocket. */}
      <div 
        className="absolute inset-x-3 bottom-3 h-[110px] bg-neutral-900 rounded-sm p-3 shadow-inner border border-neutral-800/80 transition-all duration-300 ease-in-out transform z-10 flex flex-col justify-between group-hover:-translate-y-16 group-hover:delay-[250ms] group-hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 17px, rgba(244, 63, 94, 0.08) 18px)',
        }}
      >
        {/* Hidden Details revealed only AFTER the paper has fully emerged */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-[450ms]">
          <p className="text-neutral-200 font-serif text-xs font-semibold line-clamp-2 leading-tight">
            {letter.heading}
          </p>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-[500ms] flex items-center justify-between mt-auto">
          <p className="text-rose-400/80 text-[10px] italic font-medium">
            From: {letter.sender_name}
          </p>
          <span className="text-rose-500 text-[10px]">♥</span>
        </div>
      </div>

      {/* 3. FRONT MAIN ENVELOPE POCKET: Locked securely at z-20 so the paper stays tucked inside it */}
      <div className="absolute bottom-0 inset-x-0 h-[110px] bg-neutral-800/95 border border-neutral-700/70 rounded-b-md shadow-xl z-20 overflow-hidden flex flex-col justify-between p-3.5 group-hover:border-rose-500/30 transition-colors duration-300">
        {/* Shadow Overlay mapping realistic fold shapes */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/20 via-transparent to-transparent pointer-events-none" />
        
        {/* Realistic V-Shape Fold Lines intersecting at center */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" xmlns="http://www.w3.org/2000/svg">
          <line x1="0" y1="110" x2="50%" y2="55" stroke="#525252" strokeWidth="1" />
          <line x1="100%" y1="110" x2="50%" y2="55" stroke="#525252" strokeWidth="1" />
          <line x1="0" y1="0" x2="50%" y2="55" stroke="#404040" strokeWidth="1" />
          <line x1="100%" y1="0" x2="50%" y2="55" stroke="#404040" strokeWidth="1" />
        </svg>

        {/* Closed Envelope Face Content (Always Visible) */}
        <div className="relative z-30">
          <p className="text-neutral-400 font-sans text-[11px] uppercase tracking-wider font-semibold group-hover:text-neutral-300 transition-colors">
            To: {letter.recipient_name}
          </p>
        </div>

        <div className="relative z-30 flex items-center justify-between w-full mt-auto">
          <span className="text-neutral-500 text-[11px] font-mono group-hover:text-neutral-400 transition-colors">
            {new Date(letter.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          
          {/* Miniature Floating Wax Seal Lock */}
          <div className="w-5 h-5 rounded-full bg-rose-950/40 border border-rose-500/30 flex items-center justify-center shadow transition-all duration-300 group-hover:bg-rose-500 group-hover:scale-90 group-hover:shadow-[0_0_10px_rgba(244,63,94,0.6)]">
            <span className="text-rose-400 group-hover:text-white text-[9px]">♥</span>
          </div>
        </div>
      </div>
    </button>
  );
}
