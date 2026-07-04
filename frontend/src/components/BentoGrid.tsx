import {
  HeartPulse,
  Sparkles,
  CheckCircle,
  Circle,
  Activity,
  ClipboardList,
  Mails,
  Image,
  Music,
  SkipBack,
  Play,
  SkipForward,
  Plus,
} from 'lucide-react';

export function BentoGrid() {
  const cardClass = `
    bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 
    p-5 md:p-6 flex flex-col 
    hover:bg-neutral-800/40 hover:border-rose-400/30 hover:shadow-lg 
    transition-all duration-200
  `;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-7xl mx-auto">
      {/* Card 1 */}
      <div className={`${cardClass} lg:col-span-2`}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-white">Greetings, Yanz!</h1>
            <p className="text-neutral-400 text-sm mt-1">Together for 142 days</p>
          </div>
          <div className="flex -space-x-2">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-rose-400/30 border-2 border-neutral-900 flex items-center justify-center text-sm text-white font-medium">
              J
            </div>
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-rose-400/30 border-2 border-neutral-900 flex items-center justify-center text-sm text-white font-medium">
              Y
            </div>
          </div>
        </div>
        <button className="mt-4 w-fit flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-medium text-sm transition-all shadow-[0_0_25px_rgba(251,113,133,0.25)]">
          <HeartPulse className="w-4 h-4" />
          Pulse
        </button>
      </div>

      {/* Card 2 */}
      <div className={`${cardClass} lg:col-span-2`}>
        <div className="flex items-center gap-2 text-rose-400 mb-1">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium text-rose-400">Daily Question</span>
        </div>
        <p className="text-neutral-400 text-sm">Answer today to reveal your partner's answer.</p>
        <p className="text-white text-lg md:text-xl font-medium mt-4">
          "What's the best memory from our first date?"
        </p>
        <div className="flex flex-wrap items-center gap-3 md:gap-4 mt-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-rose-400" />
            <span className="text-sm text-neutral-300">You Answered</span>
          </div>
          <div className="flex items-center gap-2">
            <Circle className="w-4 h-4 text-neutral-600" />
            <span className="text-sm text-neutral-500">They Answered</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          <button className="px-4 py-2 md:px-5 md:py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-medium transition">
            Write Answer
          </button>
          <button className="px-4 py-2 md:px-5 md:py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-sm font-medium transition border border-neutral-700">
            Unlock History
          </button>
        </div>
      </div>

      {/* Card 3 – Cycle Tracker */}
      <div className={cardClass}>
        <div className="flex items-center gap-2 text-rose-400 mb-1">
          <Activity className="w-4 h-4" />
          <span className="text-sm font-medium text-rose-400">Cycle Tracker</span>
        </div>
        <p className="text-white text-lg md:text-xl font-medium">Luteal Phase</p>
        <p className="text-neutral-400 text-sm">4 days until predicted flow</p>
        <div className="flex items-center justify-between mt-4 gap-0.5">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div
              key={i}
              className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs ${
                i === 3 ? 'bg-rose-500/30 text-rose-400 border border-rose-400/50' : 'text-neutral-500'
              }`}
            >
              {day}
            </div>
          ))}
        </div>
        <button className="mt-4 w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-sm font-medium transition border border-neutral-700">
          Log Flow Start
        </button>
      </div>

      {/* Card 4 – Remarks */}
      <div className={cardClass}>
        <div className="flex items-center gap-2 text-rose-400 mb-3">
          <ClipboardList className="w-4 h-4" />
          <span className="text-sm font-medium text-rose-400">Remarks & Cravings</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-neutral-300 text-sm">
            <CheckCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>Need: Comfort food (chocolate)</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-300 text-sm">
            <CheckCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>Crave: [Item]</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-300 text-sm">
            <CheckCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>Request: Movie night</span>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 border-t border-neutral-800 pt-3">
          <input
            type="text"
            placeholder="Add request..."
            className="flex-1 bg-neutral-800/50 text-sm text-white placeholder:text-neutral-500 px-3 py-2 rounded-lg border border-neutral-700 focus:outline-none focus:ring-1 focus:ring-rose-400/50"
          />
          <button className="w-9 h-9 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 flex items-center justify-center transition border border-rose-400/20 flex-shrink-0">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Card 5 – Love Letters */}
      <div className={cardClass}>
        <div className="flex items-center gap-2 text-rose-400 mb-1">
          <Mails className="w-4 h-4" />
          <span className="text-sm font-medium text-rose-400">Love Letters</span>
        </div>
        <p className="text-neutral-400 text-sm">Recent Letter from Jed</p>
        <div className="my-3 flex justify-center">
          <div className="w-14 h-10 md:w-16 md:h-12 bg-neutral-800 rounded-lg border border-neutral-700 flex items-center justify-center relative">
            <div className="w-0 h-0 border-l-[14px] md:border-l-[16px] border-l-transparent border-r-[14px] md:border-r-[16px] border-r-transparent border-t-[14px] md:border-t-[16px] border-t-rose-400/30 absolute -top-[1px]" />
            <span className="text-xs text-neutral-500">✉</span>
          </div>
        </div>
        <button className="mt-1 w-full py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-medium transition">
          Send new letter & song
        </button>
      </div>

      {/* Card 6 – Shared Media */}
      <div className={cardClass}>
        <div className="flex items-center gap-2 text-rose-400 mb-1">
          <Image className="w-4 h-4" />
          <Music className="w-4 h-4" />
          <span className="text-sm font-medium text-rose-400">Shared Media</span>
        </div>
        <div className="w-full h-20 md:h-24 bg-neutral-800 rounded-xl border border-neutral-700 flex items-center justify-center text-neutral-600 text-sm">
          📸
        </div>
        <div className="mt-3 bg-neutral-800 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-400/20 flex items-center justify-center flex-shrink-0">
              <Music className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <p className="text-white text-xs font-medium">Our Song</p>
              <p className="text-neutral-500 text-[10px]">Artist Name</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SkipBack className="w-4 h-4 text-neutral-400 hover:text-white cursor-pointer transition" />
            <Play className="w-5 h-5 text-rose-400 fill-rose-400/20 hover:scale-110 transition" />
            <SkipForward className="w-4 h-4 text-neutral-400 hover:text-white cursor-pointer transition" />
          </div>
        </div>
      </div>
    </div>
  );
}
