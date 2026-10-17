import { Activity, CalendarClock, HeartPulse, History, Lightbulb, Repeat } from 'lucide-react';
import { Badge, CardHeader, InlineBar, Stat, focusRing, iconClass, inset, surface } from '../Card';
import { plural } from '../../lib/plural';
import { daysBetween, type CycleModel, type CycleSummary, type Phase } from '../../lib/cycle';
import { useDailyTip } from '../../hooks/useDailyTip';
import type { SymptomLog } from '../../hooks/useCycle';
import { dayRange, labelOf, phaseColors, shortDay } from './constants';

const countdown = (days: number) =>
  days <= 0 ? <Badge tone="rose">{days === 0 ? 'Today' : 'Now'}</Badge> : <Badge tone={days <= 7 ? 'rose' : 'neutral'}>in {plural(days, 'day')}</Badge>;

export function CycleStats({ s, todayIso }: { s: CycleSummary; todayIso: string }) {
  const card = `${surface} p-6 text-center`;
  return (
    <div className="grid md:grid-cols-3 gap-4 md:gap-6">
      <section className={card}>
        <Stat
          icon={<CalendarClock className={iconClass} aria-hidden />}
          label="Next period"
          value={s.late ? 'Late' : shortDay(s.nextStart)}
          sub={s.late ? `Expected ${shortDay(s.nextStart)}` : `Lasts about ${plural(s.bleed, 'day')}`}
        >
          <div className="mt-4">{s.late ? <Badge tone="rose">{plural(-s.daysUntil, 'day')} late</Badge> : countdown(s.daysUntil)}</div>
        </Stat>
      </section>
      <section className={card}>
        <Stat
          icon={<HeartPulse className={iconClass} aria-hidden />}
          label="Fertile window"
          value={s.fertile ? dayRange(s.fertile.start, s.fertile.end) : 'Paused'}
          sub={s.fertile ? `Ovulation around ${shortDay(s.fertile.ovulation)}` : 'Until the late period is logged'}
        >
          {s.fertile && (
            <div className="mt-4">{todayIso >= s.fertile.start ? <Badge tone="rose">Now</Badge> : countdown(daysBetween(todayIso, s.fertile.start))}</div>
          )}
        </Stat>
      </section>
      <section className={card}>
        <Stat
          icon={<Repeat className={iconClass} aria-hidden />}
          label="Cycle length"
          value={plural(s.length, 'day')}
          sub={s.basedOn ? `Average of the last ${plural(s.basedOn, 'cycle')}` : 'A typical length until two periods are logged'}
        >
          <div className="mt-4">
            <Badge tone="neutral">{s.basedOn ? 'Your average' : 'Typical'}</Badge>
          </div>
        </Stat>
      </section>
    </div>
  );
}

// The latest cycles as bars (red for the period), newest first. Tapping one shows it in the calendar.
export function PastCycles({ model, mine, name, onPick }: { model: CycleModel; mine: boolean; name: string; onPick: (day: string) => void }) {
  const rows = model.history.slice(0, 7);
  const day = model.summary?.day ?? 0;
  const longest = Math.max(...rows.map((r) => r.length ?? day), 1);
  // A gap outside 21-45 days is most likely a missed log (as in lib/cycle.ts), so it doesn't count as variation
  const gap = (len: number | null) => len !== null && (len < 21 || len > 45);
  const done = rows.filter((r) => r.length !== null && !gap(r.length)).map((r) => r.length!);
  const spread = done.length >= 3 ? Math.max(...done) - Math.min(...done) : 0;
  const longBleed = rows.some((r) => (r.bleed ?? 0) > 7);

  return (
    <section className={`${surface} p-6`}>
      <CardHeader icon={<History className={iconClass} aria-hidden />} title="Past cycles" />
      {rows.length < 2 && (
        <p className="text-neutral-300 mt-4">
          {mine ? 'Your' : `${name}'s`} cycle lengths show up here after the next period is logged.
        </p>
      )}
      {rows.length > 0 && (
        <ul className="mt-3 -mx-3 space-y-1">
          {rows.map((r) => {
            const len = r.length ?? day;
            return (
              <li key={r.start}>
                <button onClick={() => onPick(r.start)} className={`w-full text-left p-3 rounded-xl hover:bg-neutral-800/50 transition cursor-pointer ${focusRing}`}>
                  <span className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-white font-medium">{shortDay(r.start)}</span>
                    <span className="text-neutral-400 tabular-nums">
                      {r.length ? (gap(r.length) ? `${plural(r.length, 'day')}, a period may be missing` : plural(r.length, 'day')) : `Now, day ${day}`}
                      {r.bleed !== null && ` · period ${plural(r.bleed, 'day')}`}
                    </span>
                  </span>
                  <span aria-hidden className="mt-2 block h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                    <span className="flex h-full rounded-full overflow-hidden" style={{ width: `${(len / longest) * 100}%` }}>
                      <span className="bg-red-500" style={{ width: `${(Math.min(r.bleed ?? 0, len) / len) * 100}%` }} />
                      <span className="flex-1 bg-neutral-600" />
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {(spread > 7 || longBleed) && (
        <p className={`${inset} mt-4 text-sm text-neutral-300`}>
          {spread > 7 && `These cycles vary by up to ${plural(spread, 'day')}. `}
          Cycles that vary by more than 7 days, or periods longer than 7 days, are worth mentioning to a doctor.
        </p>
      )}
    </section>
  );
}

export function MostLogged({ logs, from, mine, name }: { logs: Record<string, SymptomLog> | undefined; from: string | undefined; mine: boolean; name: string }) {
  const counts = new Map<string, number>();
  for (const l of Object.values(logs ?? {})) for (const v of [...(l.physical_symptoms ?? []), ...(l.moods ?? [])]) counts.set(v, (counts.get(v) ?? 0) + 1);
  const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <section className={`${surface} p-6`}>
      <CardHeader icon={<Activity className={iconClass} aria-hidden />} title="Most logged" badge={from && <span className="text-xs text-neutral-400">Since {shortDay(from)}</span>} />
      {!logs ? (
        <div className="mt-4 flex flex-wrap gap-2" aria-busy="true">
          {['w-20', 'w-16', 'w-24', 'w-14'].map((w) => <InlineBar key={w} w={w} />)}
        </div>
      ) : top.length ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {top.map(([v, n]) => (
            <li key={v} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-800 text-sm text-neutral-200">
              {labelOf(v)} <span className="text-neutral-500 tabular-nums">{n}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-neutral-300 mt-4">{mine ? 'Log how you feel and your patterns show up here.' : `${name} hasn't logged any symptoms lately.`}</p>
      )}
    </section>
  );
}

export function TipCard({ phase, mine, name }: { phase: Phase | null; mine: boolean; name: string }) {
  const tip = useDailyTip(phase, mine ? 'self' : 'partner');
  const label = phase && phaseColors[phase].label.toLowerCase();
  return (
    <section className={`${surface} p-6`}>
      <CardHeader
        icon={<Lightbulb className={iconClass} aria-hidden />}
        title={mine ? (label ? `For your ${label} phase` : 'For today') : `Supporting ${name}${label ? ` in the ${label} phase` : ''}`}
      />
      {tip === undefined ? (
        <div className="mt-4 flex flex-col gap-2" aria-busy="true"><InlineBar w="w-full" /><InlineBar w="w-2/3" /></div>
      ) : (
        <p className="text-neutral-200 mt-4 leading-relaxed">{tip}</p>
      )}
    </section>
  );
}
