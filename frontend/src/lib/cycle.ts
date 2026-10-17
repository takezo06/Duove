// Cycle math in local calendar days ('YYYY-MM-DD'), shared by the tracker and the dashboard.
// Verify changes with `node scripts/cycle.check.ts` (from frontend/).

export interface Period {
  id: string;
  start_date: string;
  end_date: string | null;
}
export type Phase = 'menstrual' | 'follicular' | 'fertile' | 'luteal';
export interface DayInfo {
  day: number;
  phase: Phase | null;
  ovulation: boolean;
  period: 'logged' | 'predicted' | null;
}

const pad = (n: number) => String(n).padStart(2, '0');
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => isoDay(new Date());
export const parseDay = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (day: string, n: number) => {
  const d = parseDay(day);
  d.setDate(d.getDate() + n);
  return isoDay(d);
};
// Rounded so a DST change (a 23 or 25 hour day) still counts as one day
export const daysBetween = (a: string, b: string) => Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86_400_000);

const DEFAULT_LENGTH = 28;
const DEFAULT_BLEED = 5;
// ponytail: a gap outside 21-45 days is read as a missed log, not one cycle; very irregular cycles fall back to the average
const MIN_LENGTH = 21;
const MAX_LENGTH = 45;
const RECENT = 6; // averages use the last 6 cycles, so they follow changes
export const MAX_PERIOD = 14;

// Whose cycle Duove shows. `hasPeriods` is the answer to "Do you have periods?" (null until asked).
// Without an answer, 2 or more logged periods count as a yes. The cycles function shares a partner's
// data by the same rule.
export const MIN_PERIODS_TO_SHOW = 2;
export const showsCycle = (hasPeriods: boolean | null, periods: number) =>
  hasPeriods === true || (hasPeriods === null && periods >= MIN_PERIODS_TO_SHOW);

// Index of the last period starting on or before a day, or -1
const lastStartOnOrBefore = (ps: Period[], date: string) => {
  let i = ps.length - 1;
  while (i >= 0 && ps[i].start_date > date) i--;
  return i;
};
const mean = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
const periodDays = (p: Period) => (p.end_date ? daysBetween(p.start_date, p.end_date) + 1 : null);

// Where each phase falls: ovulation 14 days before the next period, the fertile window the
// 6 days ending on it, and neither inside the bleed
export function layout(length: number, bleed: number) {
  const ovulation = Math.max(length - 14, bleed + 1);
  return { length, bleed, fertileStart: Math.max(ovulation - 5, bleed + 1), ovulation };
}
type Layout = ReturnType<typeof layout>;

function info(day: number, l: Layout, period: DayInfo['period']): DayInfo {
  const phase: Phase | null =
    day > l.length ? null : day <= l.bleed ? 'menstrual' : day < l.fertileStart ? 'follicular' : day <= l.ovulation ? 'fertile' : 'luteal';
  return { day, phase, ovulation: day === l.ovulation, period };
}

export function cycleModel(periods: Period[], todayIso: string) {
  const ps = periods.filter((p) => p.start_date <= todayIso).sort((a, b) => a.start_date.localeCompare(b.start_date));

  const lengths = ps
    .slice(1)
    .map((p, i) => daysBetween(ps[i].start_date, p.start_date))
    .filter((d) => d >= MIN_LENGTH && d <= MAX_LENGTH)
    .slice(-RECENT);
  const bleeds = ps
    .map(periodDays)
    .filter((d): d is number => d !== null && d >= 1 && d <= 10)
    .slice(-RECENT);
  const length = lengths.length ? mean(lengths) : DEFAULT_LENGTH;
  const bleed = bleeds.length ? mean(bleeds) : DEFAULT_BLEED;
  const last = ps[ps.length - 1] as Period | undefined;
  // The latest period, still open in its first 10 days: it can be ended, and counts as bleeding through today
  const open = last && !last.end_date && daysBetween(last.start_date, todayIso) <= 9 ? last : null;
  const bleedOf = (p: Period) => periodDays(p) ?? (p === open ? Math.max(bleed, daysBetween(p.start_date, todayIso) + 1) : bleed);

  // The span a period blocks for another start: at least 10 days, 14 while it's still open
  const blocked = (p: Period): [string, string] => [
    p.start_date,
    p.end_date ? [p.end_date, addDays(p.start_date, 9)].sort()[1] : addDays(p.start_date, MAX_PERIOD - 1),
  ];

  // What can be logged on a day: start a period (new, or move a nearby one's start), end one, remove one
  function actions(date: string) {
    const out: { start?: string; end?: string; remove?: string } = {};
    if (date > todayIso) return out;
    const clash = ps.filter((p) => {
      const [a, b] = blocked(p);
      return date <= b && a <= addDays(date, MAX_PERIOD - 1); // a new period starts open
    });
    if (!clash.length) out.start = 'new';
    else if (clash.length === 1 && date < clash[0].start_date && daysBetween(date, clash[0].end_date ?? clash[0].start_date) < MAX_PERIOD)
      out.start = clash[0].id;
    const p = ps[lastStartOnOrBefore(ps, date)];
    if (p) {
      if (date > p.start_date && date <= blocked(p)[1] && daysBetween(p.start_date, date) < MAX_PERIOD && date !== p.end_date) out.end = p.id;
      if (date <= (p.end_date ?? addDays(p.start_date, bleedOf(p) - 1))) out.remove = p.id;
    }
    return out;
  }

  if (!last) return { summary: null, day: () => null, actions, history: [] };

  const nextStart = addDays(last.start_date, length);
  const daysUntil = daysBetween(todayIso, nextStart);
  const late = daysUntil < 0;

  function day(date: string): DayInfo | null {
    const i = lastStartOnOrBefore(ps, date);
    if (i < 0) return null;
    const p = ps[i];
    const next = ps[i + 1];
    const n = daysBetween(p.start_date, date) + 1;
    const b = bleedOf(p);
    const period = n <= b ? (date <= todayIso ? 'logged' : 'predicted') : null;
    if (next) {
      // A finished cycle keeps its own length, unless the gap was a missed log
      const actual = daysBetween(p.start_date, next.start_date);
      return info(n, layout(actual >= MIN_LENGTH && actual <= MAX_LENGTH ? actual : length, b), period);
    }
    if (n <= length) return info(n, layout(length, b), period);
    // Past the expected start: nothing to predict while late, else the projected cycles
    if (late) return { day: n, phase: null, ovulation: false, period: null };
    // Due today: keep counting this cycle, nothing is logged yet
    if (date <= todayIso) return { day: n, phase: null, ovulation: false, period: 'predicted' };
    const projected = ((n - 1 - length) % length) + 1;
    return info(projected, layout(length, bleed), projected <= bleed ? 'predicted' : null);
  }

  const current = layout(length, bleedOf(last));
  const windowFrom = (start: string, l: Layout) => ({
    start: addDays(start, l.fertileStart - 1),
    end: addDays(start, l.ovulation - 1),
    ovulation: addDays(start, l.ovulation - 1),
  });
  const thisWindow = windowFrom(last.start_date, current);

  return {
    summary: {
      length,
      bleed,
      basedOn: lengths.length,
      start: last.start_date,
      day: daysBetween(last.start_date, todayIso) + 1,
      phase: day(todayIso)!.phase,
      nextStart,
      daysUntil,
      late,
      stale: -daysUntil >= length,
      layout: current,
      fertile: late ? null : todayIso <= thisWindow.end ? thisWindow : windowFrom(nextStart, layout(length, bleed)),
      openPeriod: open,
    },
    day,
    actions,
    history: ps
      .map((p, i) => ({ start: p.start_date, length: ps[i + 1] ? daysBetween(p.start_date, ps[i + 1].start_date) : null, bleed: periodDays(p) }))
      .reverse(),
  };
}

export type CycleModel = ReturnType<typeof cycleModel>;
export type CycleSummary = NonNullable<CycleModel['summary']>;
