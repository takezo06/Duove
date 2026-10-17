import { Link, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { phaseColors } from './cycle/constants';
import { relationshipYear } from '../lib/relationshipYear';
import { Avatar, Badge, BadgeBar, CardHeader, InlineBar, focusRing, iconClass, inset, primaryButton, surface } from './Card';
import { plural } from '../lib/plural';
import { categoryFor } from '../lib/cravingCategories';
import {
  Activity,
  ArrowRight,
  Check,
  Heart,
  Mails,
  MessageCircleQuestion,
  Pizza,
  UserPlus,
} from 'lucide-react';

function greetingFor(hour: number) {
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const shortDate = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

// Tile skeletons while each tile's own fetch is in flight, shaped like what lands there
const bar = (cls: string) => <div className={`rounded bg-neutral-800 ${cls}`} />;
const skeleton = (children: ReactNode) => (
  <div className="animate-pulse" aria-busy="true">
    {children}
  </div>
);
const badgeSkeleton = <BadgeBar />;

const questionSkeleton = skeleton(
  <>
    <div className="space-y-2">
      {bar('h-5 w-full')}
      {bar('h-5 w-5/6')}
      {bar('h-5 w-2/3')}
    </div>
    <div className="flex gap-4 mt-4">
      {bar('h-4 w-14')}
      {bar('h-4 w-16')}
    </div>
  </>
);
const cycleSkeleton = skeleton(
  <>
    {bar('h-5 w-36')}
    {bar('h-4 w-28 mt-2')}
    {bar('h-1.5 w-full mt-5 rounded-full')}
  </>
);
const letterSkeleton = skeleton(
  <>
    <div className="space-y-2">
      {bar('h-5 w-full')}
      {bar('h-5 w-3/5')}
    </div>
    {bar('h-4 w-20 mt-3')}
  </>
);
const cravingsSkeleton = skeleton(
  <div className="space-y-3">
    {['w-4/5', 'w-3/5', 'w-2/3'].map((w) => (
      <div key={w} className="flex items-center gap-2.5">
        {bar('w-4 h-4 shrink-0')}
        {bar(`h-4 ${w}`)}
      </div>
    ))}
  </div>
);

function Tile({
  to,
  icon,
  title,
  badge,
  action,
  children,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  badge?: ReactNode;
  action: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className={`group ${surface} p-6 flex flex-col hover:border-rose-400/30 transition ${focusRing}`}>
      <CardHeader icon={icon} title={title} badge={badge} />
      <div className="flex-1 mt-4">{children}</div>
      <span className="mt-5 pt-4 border-t border-neutral-800 flex items-center justify-between text-sm font-medium text-neutral-400 group-hover:text-rose-400 transition">
        {action}
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden />
      </span>
    </Link>
  );
}

export function BentoGrid() {
  const navigate = useNavigate();
  const {
    userName,
    userAvatar,
    partnerName,
    partnerAvatar,
    daysTogether,
    since,
    cycle,
    latestLetter,
    currentQuestion,
    cravings,
    loading,
    error,
  } = useDashboardData();

  const grid = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 max-w-6xl mx-auto';
  const fullRow = 'md:col-span-2 xl:col-span-4';

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className={`${surface} p-8 md:p-12 text-center`}>
          <div className="w-16 h-16 bg-rose-400/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-400/20">
            <UserPlus className="w-8 h-8 text-rose-400" aria-hidden />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">You're not paired yet</h1>
          <p className="text-neutral-400 max-w-md mx-auto mb-6">{error}</p>
          <button onClick={() => navigate('/partner')} className={`${primaryButton} cursor-pointer`}>
            Connect with your partner
          </button>
        </div>
      </div>
    );
  }

  const now = new Date();
  const greeting = greetingFor(now.getHours());
  const dateLine = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const year = since ? relationshipYear(since) : null;
  const partner = loading ? <InlineBar w="w-14" /> : <span className="text-rose-400 font-semibold">{partnerName}</span>;

  // Daily question status
  const q = currentQuestion;
  const qBadge = q === undefined ? badgeSkeleton : !q ? undefined : !q.youAnswered ? (
    <Badge tone="rose">Your turn</Badge>
  ) : q.partnerAnswered ? (
    <Badge tone="emerald">Both answered</Badge>
  ) : loading ? badgeSkeleton : (
    <Badge tone="neutral">Waiting on {partnerName}</Badge>
  );

  // Cycle status
  const phase = cycle?.phase ? phaseColors[cycle.phase] : undefined;
  const cycleProgress = cycle ? Math.min(100, (cycle.cycleDay / cycle.length) * 100) : 0;
  const periodWord = cycle?.whose ? `${cycle.whose}'s period` : 'Period';
  const cycleBadge = cycle === undefined ? badgeSkeleton : !cycle ? undefined : cycle.daysUntilPeriod < 0 ? (
    <Badge tone="rose">{plural(-cycle.daysUntilPeriod, 'day')} late</Badge>
  ) : cycle.daysUntilPeriod <= 3 ? (
    <Badge tone="rose">{cycle.daysUntilPeriod === 0 ? 'Period today' : 'Period soon'}</Badge>
  ) : (
    <Badge tone="neutral">Day {cycle.cycleDay}</Badge>
  );

  return (
    <div className={grid}>
      {/* Greeting + year together */}
      <section className={`${fullRow} ${surface} p-6 md:p-8`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
          <div className="flex -space-x-4">
            {/* Blank circles until the names land */}
            <Avatar src={userAvatar} name={userName} />
            <Avatar src={partnerAvatar} name={partnerName} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {greeting}, {loading ? <InlineBar w="w-24" /> : userName}
              {greeting === 'Still up' ? '?' : ''}
            </h1>
            <p className="text-neutral-400 text-sm mt-1">
              {dateLine} · {loading ? <InlineBar w="w-16" /> : <span className="text-white font-medium tabular-nums">{daysTogether} days</span>} with {partner}
            </p>
          </div>
          <Link
            to="/partner"
            className={`group self-start sm:self-center text-sm font-medium text-neutral-400 hover:text-rose-400 transition flex items-center gap-1.5 rounded-lg ${focusRing}`}
          >
            Your relationship
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden />
          </Link>
        </div>

        {loading && (
          <div className="mt-8 pt-6 border-t border-neutral-800 animate-pulse" aria-busy="true">
            <div className="flex items-center justify-between gap-3">
              {bar('h-4 w-36')}
              {bar('h-5 w-24 rounded-full')}
            </div>
            {bar('h-6 w-56 max-w-full mt-4')}
            {bar('h-2 w-full mt-6 rounded-full')}
            <div className="flex justify-between mt-3">
              {bar('h-3 w-12')}
              {bar('h-3 w-28')}
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mt-5">
              <div className={`${inset} h-[4.25rem]`} />
              <div className={`${inset} h-[4.25rem]`} />
            </div>
          </div>
        )}

        {year && (
          <div className="mt-8 pt-6 border-t border-neutral-800">
            <CardHeader
              icon={<Heart className={iconClass} aria-hidden />}
              title={`Year ${year.yearNumber} together`}
              badge={<Badge tone="neutral">Month {year.monthOfYear} of 12</Badge>}
            />
            <p className="text-lg font-semibold text-white mt-4">
              {year.isAnniversary ? (
                <span className="text-rose-400">Happy anniversary, today's the day</span>
              ) : (
                <>
                  <span className="tabular-nums">{plural(year.daysToAnniversary, 'day')}</span> to your anniversary
                </>
              )}
            </p>

            {/* Track from this year's anniversary to the next, one dot per monthsary */}
            <div
              className="relative h-2 mt-6 rounded-full bg-neutral-800"
              role="img"
              aria-label={`Month ${year.monthOfYear} of year ${year.yearNumber}. ${plural(year.daysToAnniversary, 'day')} to your anniversary.`}
            >
              <div className="absolute inset-y-0 left-0 rounded-full bg-rose-500" style={{ width: `${year.progress * 100}%` }} />
              {year.monthsaries.map((t) => (
                <span
                  key={t}
                  className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${t <= year.progress ? 'bg-rose-200' : 'bg-neutral-600'}`}
                  style={{ left: `${t * 100}%` }}
                />
              ))}
              <span
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-neutral-900 border-2 border-rose-500 flex items-center justify-center"
                style={{ left: `${year.progress * 100}%` }}
              >
                <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" aria-hidden />
              </span>
            </div>
            <div className="flex justify-between mt-3 text-xs text-neutral-400">
              <span>{shortDate(year.yearStart)}</span>
              <span>Anniversary · {shortDate(year.yearEnd)}</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mt-5">
              <div className={inset}>
                <p className="text-sm text-neutral-400">Next monthsary</p>
                <p className="text-white font-semibold mt-0.5">
                  {year.isMonthsary ? (
                    <span className="text-rose-400">Today. Happy monthsary</span>
                  ) : (
                    <>
                      {shortDate(year.nextMonthsary)}{' '}
                      <span className="text-neutral-400 font-normal">in {plural(year.daysToMonthsary, 'day')}</span>
                    </>
                  )}
                </p>
              </div>
              <div className={inset}>
                <p className="text-sm text-neutral-400">Together since</p>
                <p className="text-white font-semibold mt-0.5">
                  {year.start.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Daily question */}
      <Tile
        to="/qa"
        icon={<MessageCircleQuestion className={iconClass} aria-hidden />}
        title="Daily question"
        badge={qBadge}
        action={q?.youAnswered ? 'See answers' : q ? 'Answer now' : 'Open Q&A'}
      >
        {q === undefined ? questionSkeleton : q ? (
          <>
            <p className="text-lg font-semibold text-white leading-snug line-clamp-3">{q.question_text}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm">
              {[
                { who: <span className="text-neutral-200">You</span>, key: 'you', done: q.youAnswered },
                { who: partner, key: 'partner', done: q.partnerAnswered },
              ].map(({ who, key, done }) => (
                <span key={key} className="flex items-center gap-1.5">
                  {done ? (
                    <Check className="w-4 h-4 text-emerald-400" aria-hidden />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-neutral-600" aria-hidden />
                  )}
                  {who}
                  <span className="sr-only">{done ? 'answered' : 'has not answered'}</span>
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="text-neutral-300">No question yet today.</p>
        )}
      </Tile>

      {/* Cycle */}
      <Tile
        to="/cycle"
        icon={<Activity className={iconClass} aria-hidden />}
        title="Cycle"
        badge={cycleBadge}
        action={cycle === null ? 'Set up tracking' : 'Open tracker'}
      >
        {cycle === undefined ? cycleSkeleton : cycle ? (
          <>
            <p className="flex items-center gap-2 text-lg font-semibold text-white leading-snug">
              <span className={`w-2.5 h-2.5 rounded-full ${phase?.dot ?? 'bg-neutral-500'}`} aria-hidden />
              {phase ? `${phase.label} phase` : `Day ${cycle.cycleDay}`}
            </p>
            <p className="text-sm text-neutral-400 mt-1">
              {cycle.daysUntilPeriod > 0
                ? `${periodWord} in ${plural(cycle.daysUntilPeriod, 'day')}`
                : cycle.daysUntilPeriod === 0
                  ? `${periodWord} expected today`
                  : `${periodWord} is ${plural(-cycle.daysUntilPeriod, 'day')} late`}
            </p>
            <div
              className="mt-4 h-1.5 rounded-full bg-neutral-800 overflow-hidden"
              role="progressbar"
              aria-label="Cycle progress"
              aria-valuenow={Math.round(cycleProgress)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className={`h-full rounded-full ${phase?.dot ?? 'bg-neutral-500'}`} style={{ width: `${cycleProgress}%` }} />
            </div>
          </>
        ) : (
          <p className="text-neutral-300">No cycle data yet.</p>
        )}
      </Tile>

      {/* Love letters */}
      <Tile
        to="/letters"
        icon={<Mails className={iconClass} aria-hidden />}
        title="Love letters"
        action={latestLetter === null ? 'Write the first one' : 'Read letters'}
      >
        {latestLetter === undefined ? letterSkeleton : latestLetter ? (
          <>
            <p className="text-lg font-semibold text-white leading-snug line-clamp-2">“{latestLetter.heading}”</p>
            <p className="text-sm text-neutral-400 mt-1">
              from{' '}
              {latestLetter.sender_name === partnerName ? partner : <span className="text-neutral-200">{latestLetter.sender_name}</span>}
            </p>
          </>
        ) : (
          <p className="text-neutral-300">No letters yet.</p>
        )}
      </Tile>

      {/* Cravings */}
      <Tile
        to="/cravings"
        icon={<Pizza className={iconClass} aria-hidden />}
        title="Cravings"
        badge={cravings === undefined ? badgeSkeleton : cravings.length ? <Badge tone="rose">{cravings.length} open</Badge> : undefined}
        action={cravings?.length === 0 ? 'Add a craving' : 'See all cravings'}
      >
        {cravings === undefined ? cravingsSkeleton : cravings.length > 0 ? (
          <ul className="space-y-2">
            {cravings.map((c) => (
              <li key={c.id} className="flex items-start gap-2.5 text-neutral-200 leading-snug">
                {(() => {
                  const cat = categoryFor(c.category);
                  return <cat.icon className={`w-4 h-4 mt-0.5 shrink-0 ${cat.iconColor}`} aria-label={cat.label} />;
                })()}
                <span className="line-clamp-2">{c.content}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-neutral-300">Nothing on the list.</p>
        )}
      </Tile>
    </div>
  );
}
