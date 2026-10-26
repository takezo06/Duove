import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Pencil, Plus } from 'lucide-react';
import { Chip, InlineBar, focusRing, primaryButton, secondaryButton, surface, textLink } from '../Card';
import { apiError } from '../../lib/apiError';
import { plural } from '../../lib/plural';
import { parseDay, type CycleModel, type CycleSummary, type Phase } from '../../lib/cycle';
import type { Who } from '../../hooks/useCycle';
import { phaseColors, relativeDay, shortDay } from './constants';

const aroundDay = (day: string) => parseDay(day).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const value = (v: ReactNode) => <span className="text-white font-medium tabular-nums">{v}</span>;

// A button that shows a spinner while its action runs and reports a failure under the row
function useAction() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = (key: string, fn: () => Promise<void>, fallback = "That didn't save. Try again.") => async () => {
    setBusy(key);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(apiError(err, fallback));
    } finally {
      setBusy(null);
    }
  };
  const spin = (key: string) => busy === key && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />;
  const alert = error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>;
  return { busy, run, spin, alert };
}

// The cycle on one line: each phase as a segment (the current one lit) and a marker on today
function Track({ s }: { s: CycleSummary }) {
  const { length, bleed, fertileStart, ovulation } = s.layout;
  const segments: [Phase, number, number][] = [
    ['menstrual', 1, bleed],
    ['follicular', bleed + 1, fertileStart - 1],
    ['fertile', fertileStart, ovulation],
    ['luteal', ovulation + 1, length],
  ];
  const at = Math.min(s.day, length);
  return (
    <div className="mt-6">
      <div
        className="relative"
        role="progressbar"
        aria-label={`Cycle day ${s.day} of about ${length}`}
        aria-valuenow={at}
        aria-valuemin={1}
        aria-valuemax={length}
      >
        <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
          {segments.map(([phase, from, to]) =>
            to >= from ? (
              <div key={phase} className={`${phaseColors[phase].dot} ${s.phase && s.phase !== phase ? 'opacity-40' : ''}`} style={{ flexGrow: to - from + 1 }} />
            ) : null,
          )}
        </div>
        <span
          aria-hidden
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white ring-4 ring-neutral-900"
          style={{ left: `${((at - 0.5) / length) * 100}%` }}
        />
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400">
        {segments.map(([phase, from, to]) =>
          to >= from ? (
            <li key={phase} className="flex items-center gap-1.5">
              <span aria-hidden className={`w-2 h-2 rounded-full ${phaseColors[phase].dot}`} />
              <span className={s.phase === phase ? 'text-white font-medium' : ''}>{phaseColors[phase].label}</span>
              <span className="tabular-nums">{from === to ? `day ${from}` : `days ${from}–${to}`}</span>
            </li>
          ) : null,
        )}
      </ul>
    </div>
  );
}

export function HeaderShell({ title, subtitle, aside, children }: { title: ReactNode; subtitle: ReactNode; aside?: ReactNode; children?: ReactNode }) {
  return (
    <section className={`${surface} p-6 md:p-8`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-white">{title}</h1>
          <p className="text-neutral-400 mt-1">{subtitle}</p>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function CycleHeader({ who, options, setWho, partnerName, model, todayIso, todayLogged, logsReady, onStart, onUpdate, onLogToday, onTrackMine }: {
  who: Who;
  options: Who[];
  setWho: (w: Who) => void;
  partnerName: string;
  model: CycleModel;
  todayIso: string;
  todayLogged: boolean;
  logsReady: boolean; // today's log has loaded, so the modal never opens blank over it
  onStart: (day: string) => Promise<void>;
  onUpdate: (id: string, patch: { end_date: string }) => Promise<void>;
  onLogToday: () => void;
  onTrackMine?: () => Promise<void>; // you said you don't have periods; this turns your own tracking on
}) {
  const { busy, run, spin, alert } = useAction();
  const s = model.summary;
  const mine = who === 'me';
  const late = s && -s.daysUntil;
  const today = model.day(todayIso);
  const acts = mine ? model.actions(todayIso) : {};
  const endable = s?.openPeriod && acts.end === s.openPeriod.id ? s.openPeriod : null;

  const subtitle = !s
    ? mine ? 'Log your last period to start predictions.' : `${partnerName} hasn't logged a period yet.`
    : s.stale ? <>Last period started {value(shortDay(s.start))}</>
    : <>
        Day {value(s.day)} ·{' '}
        {s.late ? <>Period {value(plural(late!, 'day'))} late</>
          : s.daysUntil === 0 ? 'Period expected today'
          : today?.period === 'logged' ? `Period day ${today.day}`
          : s.phase && `${phaseColors[s.phase].label} phase`}
      </>;

  // What's going on today, said to whoever is looking
  const whose = mine ? 'Your' : `${partnerName}'s`;
  const [line, hint] = !s
    ? mine ? ['When did your last period start?', "If it's today, tap below. If it was earlier, pick the day in the calendar."] : [null, null]
    : today?.period === 'logged'
      ? [`${whose} period started ${relativeDay(s.start, todayIso).toLowerCase()}.`, endable ? 'Tap below when it stops, or pick the day in the calendar.' : null]
      : s.stale
        ? mine ? ['Predictions are paused until you log your latest period.', 'Pick the day it started in the calendar, or tap below if it was today.'] : [`${partnerName} hasn't logged a period since ${shortDay(s.start)}.`, null]
        : s.late
          ? [`${whose} period is ${plural(late!, 'day')} late.`, mine ? 'Log it when it starts and predictions pick up from there.' : null]
          : s.daysUntil === 0
            ? [`${whose} period is expected today.`, null]
            : [`${whose} next period should start around ${aroundDay(s.nextStart)}, in ${plural(s.daysUntil, 'day')}.`, null];

  return (
    <HeaderShell
      title={mine ? 'Your cycle' : <><span className="text-rose-400">{partnerName}</span>'s cycle</>}
      subtitle={subtitle}
      aside={
        options.length > 1 && (
          <div role="radiogroup" aria-label="Whose cycle" className="flex gap-2">
            {options.map((o) => (
              <Chip key={o} role="radio" aria-checked={who === o} active={who === o} onClick={() => setWho(o)}>
                {o === 'me' ? 'You' : partnerName}
              </Chip>
            ))}
          </div>
        )
      }
    >
      {s && !s.stale && <Track s={s} />}
      {(line || mine || onTrackMine) && (
        <div className="mt-6 pt-6 border-t border-neutral-800">
          {line && <p className="text-neutral-200">{line}</p>}
          {hint && <p className="text-sm text-neutral-400 mt-1">{hint}</p>}
          {mine && (
            <div className={`${line ? 'mt-5' : ''} flex flex-col sm:flex-row gap-3`}>
              {endable ? (
                <button onClick={run('end', () => onUpdate(endable.id, { end_date: todayIso }))} disabled={!!busy} className={primaryButton}>
                  {spin('end')}
                  Period ended today
                </button>
              ) : acts.start === 'new' ? (
                <button onClick={run('start', () => onStart(todayIso))} disabled={!!busy} className={primaryButton}>
                  {spin('start')}
                  My period started today
                </button>
              ) : null}
              <button onClick={onLogToday} disabled={!logsReady} className={secondaryButton}>
                {todayLogged ? <Pencil className="w-4 h-4" aria-hidden /> : <Plus className="w-4 h-4" aria-hidden />}
                {todayLogged ? "Edit today's log" : 'Log how you feel'}
              </button>
            </div>
          )}
          {onTrackMine && (
            <button
              onClick={run('mine', onTrackMine, "Your answer didn't save. Try again.")}
              disabled={!!busy}
              className={`${line ? 'mt-4' : ''} inline-flex items-center gap-2 text-sm font-medium text-neutral-400 hover:text-rose-400 transition rounded cursor-pointer disabled:opacity-50 ${focusRing}`}
            >
              {spin('mine')}
              Have periods too? Track your cycle
            </button>
          )}
          {alert}
        </div>
      )}
    </HeaderShell>
  );
}

// "Do you have periods?": asked before anything else, under the header's divider
export function TrackingQuestion({ partnerName, partnerTracks, onAnswer }: {
  partnerName: string;
  partnerTracks: boolean;
  onAnswer: (yes: boolean) => Promise<void>;
}) {
  const { busy, run, spin, alert } = useAction();
  const fallback = "Your answer didn't save. Try again.";
  return (
    <div className="mt-6 pt-6 border-t border-neutral-800">
      <h2 className="text-lg font-semibold text-white leading-snug">Do you have periods?</h2>
      {/* The consent moment for health data: say who sees it before the yes */}
      <p className="text-sm text-neutral-400 mt-1">
        Duove tracks a cycle only for whoever has one. Saying yes shares your periods and day logs with {partnerName}.{' '}
        {partnerTracks ? `You'll see ${partnerName}'s either way.` : 'You can change this later in your profile.'}{' '}
        <Link to="/privacy#cycle" className={textLink}>How Duove handles health data</Link>
      </p>
      <div className="mt-5 flex flex-col sm:flex-row gap-3">
        <button onClick={run('yes', () => onAnswer(true), fallback)} disabled={!!busy} className={primaryButton}>
          {spin('yes')}
          Yes, track my cycle
        </button>
        <button onClick={run('no', () => onAnswer(false), fallback)} disabled={!!busy} className={secondaryButton}>
          {spin('no')}
          No, I don't
        </button>
      </div>
      {alert}
    </div>
  );
}

// Nobody's cycle to show: you said no, and your partner said no or hasn't set it up
export function TrackingOff({ partnerName, partnerSaidNo, onTurnOn }: { partnerName: string; partnerSaidNo: boolean; onTurnOn: () => Promise<void> }) {
  const { busy, run, spin, alert } = useAction();
  return (
    <HeaderShell
      title="Cycle tracking"
      subtitle={partnerSaidNo ? "Neither of you has periods, so there's nothing to track." : `${partnerName} hasn't set up cycle tracking yet. Their cycle shows up here once they do.`}
    >
      <div className="mt-6 pt-6 border-t border-neutral-800">
        <p className="text-neutral-200">Have periods after all?</p>
        <p className="text-sm text-neutral-400 mt-1">Turn tracking on for yourself here or in your profile.</p>
        <button onClick={run('on', onTurnOn)} disabled={!!busy} className={`${secondaryButton} mt-5`}>
          {spin('on')}
          Track my cycle
        </button>
        {alert}
      </div>
    </HeaderShell>
  );
}

export function HeaderSkeleton() {
  return (
    <HeaderShell title={<InlineBar w="w-40" />} subtitle={<InlineBar w="w-56" />}>
      <div className="mt-6 h-2 rounded-full bg-neutral-800 animate-pulse" aria-hidden />
    </HeaderShell>
  );
}
