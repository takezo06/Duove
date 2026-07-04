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
  return (
    <div className="bento-grid">
      {/* Card 1: Greeting & Pulse */}
      <div className="bento-card span-2">
        <div className="flex-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-white">Greetings, Yanz!</h1>
            <p className="text-muted text-sm mt-1">Together for 142 days</p>
          </div>
          <div className="flex -space-x-2">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-rose-400/30 border-2 border-[var(--color-bg)] flex items-center justify-center text-sm text-white font-medium">
              J
            </div>
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-rose-400/30 border-2 border-[var(--color-bg)] flex items-center justify-center text-sm text-white font-medium">
              Y
            </div>
          </div>
        </div>
        <button className="btn-primary mt-4 w-fit">
          <HeartPulse className="w-4 h-4" />
          Pulse
        </button>
      </div>

      {/* Card 2: Daily Question */}
      <div className="bento-card span-2">
        <div className="bento-card-title">
          <Sparkles className="icon" />
          Daily Question
        </div>
        <p className="text-muted text-sm">Answer today to reveal your partner's answer.</p>
        <p className="text-white text-lg md:text-xl font-medium mt-4">
          "What's the best memory from our first date?"
        </p>
        <div className="flex flex-wrap gap-3 md:gap-4 mt-4">
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
          <button className="btn-primary">Write Answer</button>
          <button className="btn-secondary">Unlock History</button>
        </div>
      </div>

      {/* Card 3: Cycle Tracker */}
      <div className="bento-card">
        <div className="bento-card-title">
          <Activity className="icon" />
          Cycle Tracker
        </div>
        <p className="text-white text-lg md:text-xl font-medium">Luteal Phase</p>
        <p className="text-muted text-sm">4 days until predicted flow</p>
        <div className="timeline">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={i} className={`timeline-day ${i === 3 ? 'active' : ''}`}>
              {day}
            </div>
          ))}
        </div>
        <button className="btn-secondary w-full mt-4">Log Flow Start</button>
      </div>

      {/* Card 4: Remarks & Cravings */}
      <div className="bento-card">
        <div className="bento-card-title">
          <ClipboardList className="icon" />
          Remarks & Cravings
        </div>
        <div className="space-y-2 mt-1">
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
        <div className="flex items-center gap-2 mt-3 border-t border-[var(--color-border)] pt-3">
          <input type="text" placeholder="Add request..." className="input" />
          <button className="w-9 h-9 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 flex items-center justify-center transition border border-rose-400/20 flex-shrink-0">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Card 5: Love Letters */}
      <div className="bento-card">
        <div className="bento-card-title">
          <Mails className="icon" />
          Love Letters
        </div>
        <p className="text-muted text-sm">Recent Letter from Jed</p>
        <div className="my-3 flex justify-center">
          <div className="w-14 h-10 md:w-16 md:h-12 bg-neutral-800 rounded-lg border border-neutral-700 flex items-center justify-center relative">
            <div className="w-0 h-0 border-l-[14px] md:border-l-[16px] border-l-transparent border-r-[14px] md:border-r-[16px] border-r-transparent border-t-[14px] md:border-t-[16px] border-t-rose-400/30 absolute -top-[1px]" />
            <span className="text-xs text-neutral-500">✉</span>
          </div>
        </div>
        <button className="btn-primary w-full mt-1">Send new letter & song</button>
      </div>

      {/* Card 6: Shared Media */}
      <div className="bento-card">
        <div className="bento-card-title">
          <Image className="icon" />
          <Music className="icon" />
          Shared Media
        </div>
        <div className="w-full h-20 md:h-24 bg-neutral-800 rounded-xl border border-neutral-700 flex items-center justify-center text-neutral-600 text-sm">
          📸
        </div>
        <div className="music-player">
          <div className="track">
            <div className="track-icon">
              <Music className="w-4 h-4 text-rose-400" />
            </div>
            <div className="track-info">
              <div className="title">Our Song</div>
              <div className="artist">Artist Name</div>
            </div>
          </div>
          <div className="controls">
            <button><SkipBack className="w-4 h-4" /></button>
            <button className="play"><Play className="w-5 h-5 fill-rose-400/20" /></button>
            <button><SkipForward className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
