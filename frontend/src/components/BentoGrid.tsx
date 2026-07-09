import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import {
  HeartPulse,
  Sparkles,
  CheckCircle,
  Circle,
  Activity,
  Mails,
  Music,
  Pizza,
  UserPlus,
} from 'lucide-react';

export function BentoGrid() {
  const navigate = useNavigate();
  const {
    userName,
    userAvatar,
    partnerName,
    partnerAvatar,
    daysTogether,
    cycle,
    latestLetter,
    currentQuestion,
    cravings,
    loading,
    error,
  } = useDashboardData();

  const cardClass =
    'bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 p-5 md:p-6 flex flex-col hover:bg-neutral-800/40 hover:border-rose-400/30 hover:shadow-lg transition-all duration-200';

  // Loading skeleton
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-7xl mx-auto">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`${cardClass} animate-pulse`}>
            <div className="h-6 w-1/3 bg-neutral-800 rounded mb-2" />
            <div className="h-4 w-full bg-neutral-800 rounded mb-1" />
            <div className="h-4 w-2/3 bg-neutral-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  // Error / no relationship
  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-8 md:p-12 text-center shadow-xl">
          <div className="w-16 h-16 bg-rose-400/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-400/20">
            <UserPlus className="w-8 h-8 text-rose-400" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">No active relationship</h2>
          <p className="text-neutral-400 max-w-md mx-auto mb-6">{error}</p>
          <button
            onClick={() => navigate('/partner')}
            className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium transition shadow-lg shadow-rose-500/20"
          >
            Go to Partner Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-7xl mx-auto">
      {/* Card 1 – Greeting & Days together */}
      <div className={`${cardClass} lg:col-span-2`}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-white">
              Greetings, {userName}!
            </h1>
            <p className="text-neutral-400 text-sm mt-1">
              Together with {partnerName} for{' '}
              <span className="text-rose-400 font-medium">{daysTogether} days</span>
            </p>
          </div>
          <div className="flex -space-x-2">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName}
                className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-neutral-900 object-cover"
              />
            ) : (
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-rose-400/30 border-2 border-neutral-900 flex items-center justify-center text-sm text-white font-medium">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
            {partnerAvatar ? (
              <img
                src={partnerAvatar}
                alt={partnerName}
                className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-neutral-900 object-cover"
              />
            ) : (
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-rose-400/30 border-2 border-neutral-900 flex items-center justify-center text-sm text-white font-medium">
                {partnerName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => navigate('/partner')}
          className="mt-4 w-fit flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-medium text-sm transition-all shadow-[0_0_25px_rgba(251,113,133,0.25)]"
        >
          <HeartPulse className="w-4 h-4" />
          View Relationship
        </button>
      </div>

      {/* Card 2 – Daily Question */}
      <div className={cardClass}>
        <div className="flex items-center gap-2 text-rose-400 mb-1">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium text-rose-400">Daily Question</span>
        </div>
        {currentQuestion ? (
          <>
            <p className="text-white text-lg md:text-xl font-medium mt-2 line-clamp-2">
              {currentQuestion.question_text}
            </p>
            <div className="flex flex-wrap items-center gap-3 md:gap-4 mt-4">
              <div className="flex items-center gap-2">
                {currentQuestion.youAnswered ? (
                  <CheckCircle className="w-4 h-4 text-rose-400" />
                ) : (
                  <Circle className="w-4 h-4 text-neutral-600" />
                )}
                <span className="text-sm text-neutral-300">
                  {currentQuestion.youAnswered ? 'You answered' : 'You'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {currentQuestion.partnerAnswered ? (
                  <CheckCircle className="w-4 h-4 text-rose-400" />
                ) : (
                  <Circle className="w-4 h-4 text-neutral-600" />
                )}
                <span className="text-sm text-neutral-300">
                  {currentQuestion.partnerAnswered ? 'Partner answered' : 'Partner'}
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate('/qa')}
              className="mt-4 w-full py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-medium transition"
            >
              {currentQuestion.youAnswered ? 'View Answers' : 'Answer Now'}
            </button>
          </>
        ) : (
          <>
            <p className="text-neutral-400 text-sm mt-2">No question today yet.</p>
            <button
              onClick={() => navigate('/qa')}
              className="mt-4 w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-sm font-medium transition border border-neutral-700"
            >
              Go to Q&A
            </button>
          </>
        )}
      </div>

      {/* Card 3 – Cycle Tracker */}
      <div className={cardClass}>
        <div className="flex items-center gap-2 text-rose-400 mb-1">
          <Activity className="w-4 h-4" />
          <span className="text-sm font-medium text-rose-400">Cycle Tracker</span>
        </div>
        {cycle ? (
          <>
            <p className="text-white text-lg md:text-xl font-medium capitalize">
              {cycle.phase} Phase
            </p>
            <p className="text-neutral-400 text-sm">
              {cycle.daysUntilPeriod === 0
                ? 'Period expected today'
                : `${cycle.daysUntilPeriod} days until flow`}
            </p>
            <button
              onClick={() => navigate('/cycle')}
              className="mt-4 w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-sm font-medium transition border border-neutral-700"
            >
              View Cycle
            </button>
          </>
        ) : (
          <>
            <p className="text-neutral-400 text-sm">No cycle data yet</p>
            <button
              onClick={() => navigate('/cycle/log')}
              className="mt-4 w-full py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-medium transition"
            >
              Log First Cycle
            </button>
          </>
        )}
      </div>

      {/* Card 4 – Love Letters */}
      <div className={cardClass}>
        <div className="flex items-center gap-2 text-rose-400 mb-1">
          <Mails className="w-4 h-4" />
          <span className="text-sm font-medium text-rose-400">Love Letters</span>
        </div>
        {latestLetter ? (
          <>
            <p className="text-neutral-400 text-sm">Latest from {latestLetter.sender_name}</p>
            <p className="text-white font-medium mt-1 line-clamp-2">"{latestLetter.heading}"</p>
            <button
              onClick={() => navigate('/letters')}
              className="mt-3 w-full py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-medium transition"
            >
              Open Letters
            </button>
          </>
        ) : (
          <>
            <p className="text-neutral-400 text-sm">No letters yet</p>
            <button
              onClick={() => navigate('/letters')}
              className="mt-3 w-full py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-medium transition"
            >
              Send First Letter
            </button>
          </>
        )}
      </div>

      {/* Card 5 – Cravings / Remarks */}
      <div className={cardClass}>
        <div className="flex items-center gap-2 text-rose-400 mb-3">
          <Pizza className="w-4 h-4" />
          <span className="text-sm font-medium text-rose-400">Remarks & Cravings</span>
        </div>
        {cravings.length > 0 ? (
          <ul className="space-y-2 flex-1">
            {cravings.map((c) => (
              <li key={c.id} className="flex items-center gap-2 text-neutral-300 text-sm">
                <Circle className="w-3 h-3 text-rose-400/70 flex-shrink-0" />
                <span className="truncate">{c.content}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-neutral-500 text-sm flex-1">No active cravings</p>
        )}
        <button
          onClick={() => navigate('/cravings')}
          className="mt-3 w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-sm font-medium transition border border-neutral-700"
        >
          View Cravings
        </button>
      </div>

      {/* Card 6 – Shared Media placeholder */}
      <div className={cardClass}>
        <div className="flex items-center gap-2 text-rose-400 mb-1">
          <Music className="w-4 h-4" />
          <span className="text-sm font-medium text-rose-400">Shared Media</span>
        </div>
        <p className="text-neutral-400 text-sm">Coming soon: photos & playlists.</p>
        <div className="flex-1" />
        <p className="text-xs text-neutral-600 mt-3">Stay tuned</p>
      </div>
    </div>
  );
}
