// Contraception math in local calendar days ('YYYY-MM-DD'): the method catalog, where today falls in a
// pack or a schedule, what's due, and the dates worth keeping in mind.
// The contraception function keeps its own copy of the id lists (scripts/contraception.check.ts compares them).
// Verify changes with `node scripts/contraception.check.ts` (from frontend/).
import { addDays, daysBetween, isoDay, parseDay } from './cycle.ts';
import { plural } from './plural.ts';

export const METHOD_IDS = [
  'pill_combined', 'pill_progestin', 'patch', 'ring_monthly', 'ring_yearly', 'shot', 'implant', 'iud_hormonal', 'iud_copper',
  'condom_external', 'condom_internal', 'diaphragm', 'cervical_cap', 'sponge', 'spermicide',
  'fertility_awareness', 'withdrawal', 'lam', 'tubal', 'vasectomy',
] as const;
export type MethodId = (typeof METHOD_IDS)[number];
export const EVENT_KINDS = ['taken', 'missed', 'changed', 'removed', 'ring_in', 'ring_out', 'shot', 'used', 'emergency'] as const;
export type EventKind = (typeof EVENT_KINDS)[number];
export const PILL_KINDS = ['combined_mono', 'combined_multi', 'pop_norethindrone', 'pop_desogestrel', 'pop_drospirenone'] as const;
export type PillKind = (typeof PILL_KINDS)[number];
export const PACK_IDS = ['21_7', '24_4', '26_2', '84_7', '28'] as const;
export type PackId = (typeof PACK_IDS)[number];
export const BRAND_IDS = ['nexplanon', 'mirena', 'liletta', 'kyleena', 'skyla', 'paragard', 'other'] as const;
export type BrandId = (typeof BRAND_IDS)[number];
export const SHOT_KINDS = ['im', 'subq'] as const;
export const EC_KINDS = ['levonorgestrel', 'ulipristal', 'copper_iud'] as const;
export type EcKind = (typeof EC_KINDS)[number];

export interface Details {
  pill?: PillKind;
  pack?: PackId;
  usual_time?: string; // 'HH:MM'
  brand?: BrandId;
  years?: number;
  shot?: (typeof SHOT_KINDS)[number];
  confirmed?: boolean; // vasectomy: a semen test said it worked
}
export interface Method {
  id: string;
  method: MethodId;
  details: Details;
  started_on: string;
  ended_on: string | null;
  shared: boolean;
}
export interface ContraEvent {
  id: string;
  method_id: string | null;
  kind: EventKind;
  on_date: string;
  at_time: string | null; // 'HH:MM'
  detail: { ec?: EcKind } | null;
}

export type Group = 'daily' | 'weekly' | 'months' | 'long' | 'each' | 'other';
export const GROUPS: { id: Group; label: string }[] = [
  { id: 'daily', label: 'Daily pill' },
  { id: 'weekly', label: 'Patch or ring' },
  { id: 'months', label: 'Shot' },
  { id: 'long', label: 'Implant or IUD' },
  { id: 'each', label: 'Each time' },
  { id: 'other', label: 'Other' },
];

interface MethodInfo {
  id: MethodId;
  group: Group;
  label: string;
  hint: string; // one line in the picker
  starts: string; // the label of the start date in setup
  use?: string; // the per-use action, for methods logged each time
  facts: string[];
}
const STI = "It doesn't protect against STIs. Condoms do.";
export const METHODS: MethodInfo[] = [
  { id: 'pill_combined', group: 'daily', label: 'Combination pill', hint: 'Estrogen and progestin, most packs have a break week', starts: 'This pack started on', facts: [
    'Vomiting within 3 hours of a pill, or bad diarrhoea for more than 24 hours, can count as a missed pill.',
    'Rifampicin, some epilepsy medicines and St John\'s wort can make it work less well. Mention the pill when you get a new prescription.',
    'Bleeding in the break week is a withdrawal bleed, not a true period.',
    STI,
  ] },
  { id: 'pill_progestin', group: 'daily', label: 'Mini pill', hint: 'Progestin only, one every day with no break', starts: 'This pack started on', facts: [
    'Take one at about the same time every day, and start the next pack the day after the last one.',
    'Irregular, light or no bleeding is common on it and usually harmless.',
    'Vomiting within 3 hours of a pill can count as a missed pill.',
    STI,
  ] },
  { id: 'patch', group: 'weekly', label: 'Patch', hint: 'A new patch each week for 3 weeks, then a week off', starts: 'First patch of this cycle went on', facts: [
    'Change it on the same weekday each week.',
    "Put it on clean, dry skin: bottom, belly, upper arm or back. Not on the breasts or on irritated skin.",
    'If it comes off for more than 48 hours, put a new one on and use condoms for 7 days.',
    STI,
  ] },
  { id: 'ring_monthly', group: 'weekly', label: 'Monthly ring', hint: 'In for 3 weeks, out for 1, a new ring each month', starts: 'This ring went in on', facts: [
    'If it comes out, rinse it in cool water and put it back.',
    'Out for more than 48 hours in a row? Put it back and use condoms for 7 days.',
    STI,
  ] },
  { id: 'ring_yearly', group: 'weekly', label: 'Yearly ring', hint: 'One ring for 13 cycles, 3 weeks in and 1 out', starts: 'This ring first went in on', facts: [
    'Wash it with mild soap and keep it in its case during the week off.',
    'One ring lasts 13 cycles, about a year.',
    'Out for more than 2 hours during the 3 weeks? Use condoms until it has been back in for 7 days.',
    STI,
  ] },
  { id: 'shot', group: 'months', label: 'Shot', hint: 'An injection every 13 weeks', starts: 'Last shot was on', facts: [
    'Periods often get irregular at first, and many people stop having them after a year.',
    'After stopping, it can take up to a year for periods and fertility to come back.',
    STI,
  ] },
  { id: 'implant', group: 'long', label: 'Implant', hint: 'A small rod in the upper arm, good for 3 years', starts: 'It went in on', facts: [
    'Bleeding often changes, and for some it stays unpredictable.',
    'Some epilepsy and HIV medicines make it work less well. Mention it when you get a new prescription.',
    'Only a clinician can take it out. Fertility comes back soon after.',
    STI,
  ] },
  { id: 'iud_hormonal', group: 'long', label: 'Hormonal IUD', hint: 'Releases progestin, good for 3 to 8 years by brand', starts: 'It went in on', facts: [
    'Feel for the threads once a month, after your period.',
    'Spotting and cramps are common for the first 3 to 6 months.',
    "See a clinician if you can't feel the threads, can feel the hard plastic, or have bad pain or a fever.",
    STI,
  ] },
  { id: 'iud_copper', group: 'long', label: 'Copper IUD', hint: 'No hormones, good for up to 10 years', starts: 'It went in on', facts: [
    'Periods can be heavier and more painful for the first few months.',
    'Feel for the threads once a month, after your period.',
    'Fitted within 5 days of unprotected sex, it also works as emergency contraception.',
    STI,
  ] },
  { id: 'condom_external', group: 'each', label: 'Condoms', hint: 'Worn on the penis, new one every time', starts: 'Using them since', use: 'Log a condom', facts: [
    'Use a new one every time, and put it on before any genital contact.',
    'With latex, use water- or silicone-based lube. Oil-based lube weakens it.',
    'Check the expiry date, and keep them away from heat.',
    'Condoms are the one method here that also protects against STIs.',
  ] },
  { id: 'condom_internal', group: 'each', label: 'Internal condoms', hint: 'Worn inside the vagina, new one every time', starts: 'Using them since', use: 'Log a condom', facts: [
    'It can go in up to 8 hours before sex.',
    "Don't use it together with an external condom: the rubbing can tear both.",
    'Like external condoms, it also protects against STIs.',
  ] },
  { id: 'diaphragm', group: 'each', label: 'Diaphragm', hint: 'A soft dome used with spermicide', starts: 'Using it since', use: 'Log a use', facts: [
    'Use it with spermicide, and leave it in for at least 6 hours after sex.',
    'Get it checked after a pregnancy or a weight change of more than 3 kg.',
    STI,
  ] },
  { id: 'cervical_cap', group: 'each', label: 'Cervical cap', hint: 'A small cap over the cervix, with spermicide', starts: 'Using it since', use: 'Log a use', facts: [
    'Use it with spermicide, and leave it in for at least 6 hours after sex, and no more than 48 hours in total.',
    STI,
  ] },
  { id: 'sponge', group: 'each', label: 'Sponge', hint: 'A one-time sponge with spermicide in it', starts: 'Using it since', use: 'Log a use', facts: [
    'Leave it in for at least 6 hours after sex, and no more than 30 hours in total.',
    STI,
  ] },
  { id: 'spermicide', group: 'each', label: 'Spermicide or gel', hint: 'A gel, foam or film put in before sex', starts: 'Using it since', use: 'Log a use', facts: [
    'Put it in shortly before sex, and use more each time.',
    'It works much better together with a condom, diaphragm or cap.',
    STI,
  ] },
  { id: 'fertility_awareness', group: 'other', label: 'Fertility awareness', hint: 'Avoiding sex or using a barrier on fertile days', starts: 'Using it since', facts: [
    'It works best with daily temperature and cervical mucus checks, not dates alone.',
    "Duove's cycle predictions show likely fertile days, but they aren't birth control on their own.",
    STI,
  ] },
  { id: 'withdrawal', group: 'other', label: 'Withdrawal', hint: 'Pulling out before ejaculation', starts: 'Using it since', use: 'Log a time', facts: [
    'Pre-ejaculate can carry sperm, so it fails more often than most methods.',
    'Keep emergency contraception in mind for a time it went wrong.',
    STI,
  ] },
  { id: 'lam', group: 'other', label: 'Breastfeeding (LAM)', hint: 'For up to 6 months after birth', starts: 'Your baby was born on', facts: [
    'It only works while all three are true: the baby is under 6 months, feeds only on breast milk day and night, and your period hasn\'t come back.',
    'When any of them stops being true, start another method.',
    STI,
  ] },
  { id: 'tubal', group: 'other', label: 'Tubal ligation', hint: 'Tubes tied or removed, permanent', starts: 'Done on', facts: [
    'It is permanent and works from the start.',
    STI,
  ] },
  { id: 'vasectomy', group: 'other', label: "Partner's vasectomy", hint: 'Permanent, once a test confirms it', starts: 'Done on', facts: [
    'It takes about 12 weeks, and a semen test, to be sure it worked. Use another method until then.',
    STI,
  ] },
];
export const methodInfo = (id: MethodId) => METHODS.find((m) => m.id === id)!;

export const PILLS: { id: PillKind; label: string; combined: boolean; lateHours: number }[] = [
  { id: 'combined_mono', label: 'Same dose every day (monophasic)', combined: true, lateHours: 24 },
  { id: 'combined_multi', label: 'Dose changes through the pack (multiphasic)', combined: true, lateHours: 24 },
  { id: 'pop_norethindrone', label: 'Norethindrone (also Opill)', combined: false, lateHours: 3 },
  { id: 'pop_desogestrel', label: 'Desogestrel', combined: false, lateHours: 12 },
  { id: 'pop_drospirenone', label: 'Drospirenone (Slynd)', combined: false, lateHours: 24 },
];
export const pillInfo = (id: PillKind | undefined) => PILLS.find((p) => p.id === id) ?? PILLS[0];
export const PACKS: { id: PackId; label: string; active: number; brk: number }[] = [
  { id: '21_7', label: '21 pills, then 7 days off or placebo', active: 21, brk: 7 },
  { id: '24_4', label: '24 pills, then 4 placebo', active: 24, brk: 4 },
  { id: '26_2', label: '26 pills, then 2 placebo', active: 26, brk: 2 },
  { id: '84_7', label: '84 pills, then 7 placebo (extended)', active: 84, brk: 7 },
  { id: '28', label: '28 pills, no break', active: 28, brk: 0 },
];
export const packInfo = (id: PackId | undefined) => PACKS.find((p) => p.id === id) ?? PACKS[0];
export const BRANDS: { id: BrandId; label: string; method: MethodId; years: number }[] = [
  { id: 'nexplanon', label: 'Nexplanon', method: 'implant', years: 3 },
  { id: 'mirena', label: 'Mirena', method: 'iud_hormonal', years: 8 },
  { id: 'liletta', label: 'Liletta', method: 'iud_hormonal', years: 8 },
  { id: 'kyleena', label: 'Kyleena', method: 'iud_hormonal', years: 5 },
  { id: 'skyla', label: 'Skyla or Jaydess', method: 'iud_hormonal', years: 3 },
  { id: 'paragard', label: 'Paragard (Copper T380A)', method: 'iud_copper', years: 10 },
];
export const brandsFor = (m: MethodId) => BRANDS.filter((b) => b.method === m);
const DEFAULT_YEARS: Partial<Record<MethodId, number>> = { implant: 3, iud_hormonal: 5, iud_copper: 10 };
export const yearsOf = (m: Method) => m.details.years ?? BRANDS.find((b) => b.id === m.details.brand)?.years ?? DEFAULT_YEARS[m.method] ?? 3;

// The shot's window, in days after the last one: when the next can be given, when it's due, the last day without backup.
// The arm or bottom shot (IM) has a 2-week grace; the self-injected one under the skin (subQ) a week either side.
export const SHOT_WINDOW = { im: { opens: 77, due: 91, last: 105 }, subq: { opens: 84, due: 91, last: 98 } } as const;
export const EC: { id: EcKind; label: string; hours: number }[] = [
  { id: 'levonorgestrel', label: 'Levonorgestrel pill', hours: 72 },
  { id: 'ulipristal', label: 'Ulipristal pill (ellaOne, ella)', hours: 120 },
  { id: 'copper_iud', label: 'Copper IUD fitted', hours: 120 },
];
export const isHormonal = (m: MethodId) => ['pill_combined', 'pill_progestin', 'patch', 'ring_monthly', 'ring_yearly', 'shot', 'implant', 'iud_hormonal'].includes(m);

// Calendar helpers on 'YYYY-MM-DD'
export function addMonths(day: string, n: number) {
  const d = parseDay(day);
  const target = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  d.setDate(Math.min(target, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return isoDay(d);
}
export const nowClock = (d = new Date()) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const minutesOf = (clock: string) => +clock.slice(0, 2) * 60 + +clock.slice(3, 5);
export const clockLabel = (clock: string) =>
  new Date(2000, 0, 1, +clock.slice(0, 2), +clock.slice(3, 5)).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
export const dayLabel = (day: string) => dayFmt.format(parseDay(day));
const longFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
export const longLabel = (day: string) => longFmt.format(parseDay(day));
function inDays(n: number) {
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  return n > 0 ? `in ${plural(n, 'day')}` : `${plural(-n, 'day')} ago`;
}

// One cell of the pack card: a day in the pack (pill) or in the 4-week cycle (patch, ring)
export type CellState = 'done' | 'missed' | 'unlogged' | 'worn' | 'break' | 'upcoming';
export interface Cell {
  date: string;
  n: number; // day of the pack or cycle, from 1
  state: CellState;
  today: boolean;
  step?: EventKind; // a day something is due (a pill, a change); tapping a past one logs it
}
export type Tone = 'rose' | 'emerald' | 'neutral';
export interface DateItem { date: string; label: string; tone?: Tone }
export interface Model {
  info: MethodInfo;
  line: string; // the meta line under the title
  badge: { tone: Tone; text: string } | null;
  sentence: string; // today, said the same way to either of you
  hint: string | null; // for the owner only
  action: { label: string; kind: EventKind } | null;
  pack: { title: string; caption: string; cells: Cell[]; legend: CellState[] } | null;
  track: { from: string; to: string; fromLabel: string; toLabel: string; pct: number; grace?: { to: string; pct: number }; aria: string } | null;
  stats: { label: string; value: string; sub: string } | null;
  missed: string[] | null; // what to do if one is missed or late
  dates: DateItem[]; // important dates, soonest first
  backupUntil: string | null;
}

const DAILY = new Set<EventKind>(['taken', 'missed']);
const ofMethod = (m: Method, events: ContraEvent[]) => events.filter((e) => e.method_id === m.id);
const tone = (days: number, soon = 7): Tone => (days <= soon ? 'rose' : 'neutral');

// The pill pack: where today falls, which days are in, and the backup window after a miss
function pillModel(m: Method, evs: ContraEvent[], todayIso: string, nowMin: number): Partial<Model> {
  const pack = m.method === 'pill_progestin' ? packInfo('28') : packInfo(m.details.pack);
  const pill = pillInfo(m.details.pill ?? (m.method === 'pill_progestin' ? 'pop_norethindrone' : 'combined_mono'));
  const L = pack.active + pack.brk;
  const since = daysBetween(m.started_on, todayIso);
  const name = pill.combined ? 'Pill' : 'Mini pill';
  const usual = m.details.usual_time;
  if (since < 0)
    return { line: `${name} · first pack starts ${dayLabel(m.started_on)}`, badge: { tone: 'neutral', text: `Starts ${inDays(-since)}` }, sentence: `The first pill is ${inDays(-since)}, on ${dayLabel(m.started_on)}.`, dates: [{ date: m.started_on, label: 'First pill' }] };

  const packNo = Math.floor(since / L);
  const packStart = addDays(m.started_on, packNo * L);
  const idx = since - packNo * L; // 0-based day in this pack
  const nextPack = addDays(packStart, L);
  const byDate = new Map(evs.filter((e) => DAILY.has(e.kind)).map((e) => [e.on_date, e]));
  const status = (date: string) => byDate.get(date)?.kind;

  // The visible window: the whole pack up to 4 rows, else the 4 rows around today
  const rows = Math.ceil(L / 7);
  const row0 = rows <= 4 ? 0 : Math.max(0, Math.min(Math.floor(idx / 7) - 1, rows - 4));
  const cells: Cell[] = [];
  for (let i = row0 * 7; i < Math.min(L, (row0 + 4) * 7); i++) {
    const date = addDays(packStart, i);
    const active = i < pack.active;
    const s = status(date);
    const state: CellState = date > todayIso ? (active ? 'upcoming' : 'break')
      : !active ? 'break'
      : s === 'taken' ? 'done' : s === 'missed' ? 'missed' : date === todayIso ? 'upcoming' : 'unlogged';
    cells.push({ date, n: i + 1, state, today: date === todayIso, step: active && date <= todayIso ? 'taken' : undefined });
  }

  // This pack so far: active days up to today
  const soFar = Array.from({ length: Math.min(idx + 1, pack.active) }, (_, i) => addDays(packStart, i));
  const taken = soFar.filter((d) => status(d) === 'taken').length;
  const missedN = soFar.filter((d) => status(d) === 'missed').length;
  const unlogged = soFar.filter((d) => !status(d) && d < todayIso).length;

  // Backup after a miss: combined, 2+ missed in a row needs 7 pills in a row; a mini pill 2 days (7 for drospirenone)
  const missedDays = [...byDate.values()].filter((e) => e.kind === 'missed').map((e) => e.on_date).sort();
  let backupUntil: string | null = null;
  for (const d of missedDays) {
    const needs = pill.combined ? missedDays.includes(addDays(d, -1)) || missedDays.includes(addDays(d, 1)) : true;
    if (!needs) continue;
    const until = addDays(d, pill.combined || pill.id === 'pop_drospirenone' ? 7 : 2);
    if (until >= todayIso && (!backupUntil || until > backupUntil)) backupUntil = until;
  }

  const inBreak = idx >= pack.active;
  const takenToday = status(todayIso) === 'taken';
  const takenAt = byDate.get(todayIso)?.at_time;
  const late = usual ? nowMin - minutesOf(usual) : 0; // minutes past the usual time
  const tomorrow = idx + 1 < pack.active || pack.brk === 0 ? `tomorrow${usual ? ` at ${clockLabel(usual)}` : ''}` : `on ${dayLabel(nextPack)}, with the next pack`;
  const caption = rows > 4 ? `Week ${Math.floor(idx / 7) + 1} of ${rows}` : pack.brk ? (inBreak ? 'Break' : `Week ${Math.floor(idx / 7) + 1} of ${rows}`) : `Day ${idx + 1} of ${L}`;

  const base: Partial<Model> = {
    line: `${name} · day ${idx + 1} of ${L}${takenAt ? ` · taken ${clockLabel(takenAt)}` : usual ? ` · usually ${clockLabel(usual)}` : ''}`,
    pack: { title: `${name} pack · started ${dayLabel(packStart)}`, caption, cells, legend: pack.brk ? ['done', 'missed', 'unlogged', 'break'] : ['done', 'missed', 'unlogged'] },
    // Today counts once it's logged; until then it isn't late yet
    stats: { label: 'This pack', value: `${taken} of ${soFar.filter((d) => d < todayIso || status(d)).length} taken`, sub: [`${missedN} missed`, unlogged ? `${unlogged} not logged` : null].filter(Boolean).join(' · ') },
    missed: pill.combined
      ? [
          'Less than 24 hours late: take it now, even if that means two in one day. Nothing else to do.',
          '24 hours or more late, or 2 or more missed: take the most recent one now, and use condoms until you have taken 7 in a row. If fewer than 7 are left before the break, skip the break.',
          'Had sex in the days before? Ask a pharmacist about emergency contraception.',
        ]
      : [
          `More than ${plural(pill.lateHours, 'hour')} late: take one now, then carry on at the usual time.`,
          `Use condoms for the next ${pill.id === 'pop_drospirenone' ? '7 days' : '2 days'}.`,
          'Had sex since the late pill? Ask a pharmacist about emergency contraception.',
        ],
    backupUntil,
  };
  const dates: DateItem[] = [];
  if (backupUntil) dates.push({ date: backupUntil, label: 'Use condoms until', tone: 'rose' });
  if (pack.brk && !inBreak) dates.push({ date: addDays(packStart, pack.active), label: pack.id === '21_7' ? 'Break week starts' : 'Placebo days start' });
  dates.push({ date: nextPack, label: 'Next pack starts' });
  base.dates = dates;

  if (inBreak)
    return { ...base, badge: { tone: 'neutral', text: pack.id === '21_7' ? 'Break week' : 'Placebo days' }, sentence: `No active pill today. The next pack starts ${dayLabel(nextPack)}, ${inDays(daysBetween(todayIso, nextPack))}.`, hint: 'Start it on time even if you are still bleeding.', action: null };
  if (takenToday)
    return { ...base, badge: { tone: 'emerald', text: 'Taken today' }, sentence: `Today's pill is in. The next one is ${tomorrow}.`, hint: null, action: null };
  if (status(todayIso) === 'missed')
    return { ...base, badge: { tone: 'rose', text: 'Missed today' }, sentence: "Today's pill is marked as missed.", hint: 'See what to do below.', action: { label: "I took today's pill", kind: 'taken' } };
  const overdue = usual && late > 0 && late >= pill.lateHours * 60;
  return {
    ...base,
    badge: overdue ? { tone: 'rose', text: 'Late' } : usual && late < 0 ? { tone: 'neutral', text: `Due ${clockLabel(usual)}` } : { tone: 'rose', text: 'Due now' },
    sentence: usual ? `Today's pill is due at ${clockLabel(usual)}.` : "Today's pill is due.",
    hint: overdue
      ? `It's more than ${plural(pill.lateHours, 'hour')} past your usual time, which counts as late for this pill. See what to do below.`
      : pill.lateHours >= 24 ? 'Taken within 24 hours of your usual time, it still counts.' : `Taken within ${plural(pill.lateHours, 'hour')} of your usual time, it still counts.`,
    action: { label: "I took today's pill", kind: 'taken' },
  };
}

// Patch and rings: a 28-day cycle from the start date, with the days something changes
function cycleMethodModel(m: Method, evs: ContraEvent[], todayIso: string): Partial<Model> {
  const patch = m.method === 'patch';
  const steps: [number, EventKind][] = patch ? [[0, 'changed'], [7, 'changed'], [14, 'changed'], [21, 'removed']] : [[0, 'ring_in'], [21, 'ring_out']];
  const thing = patch ? 'patch' : 'ring';
  const since = daysBetween(m.started_on, todayIso);
  if (since < 0)
    return { line: `${patch ? 'Patch' : 'Ring'} · starts ${dayLabel(m.started_on)}`, badge: { tone: 'neutral', text: `Starts ${inDays(-since)}` }, sentence: `The first ${thing} goes ${patch ? 'on' : 'in'} ${dayLabel(m.started_on)}.`, dates: [{ date: m.started_on, label: `First ${thing}` }] };
  const cycleNo = Math.floor(since / 28);
  const start = addDays(m.started_on, cycleNo * 28);
  const idx = since - cycleNo * 28;
  // A step counts as done when it was logged on its day or any day before the next step
  const stepsAt = steps.map(([d, kind], i) => ({ day: addDays(start, d), kind, until: addDays(start, (steps[i + 1]?.[0] ?? 28) - 1) }));
  const done = (s: (typeof stepsAt)[number]) => evs.some((e) => e.kind === s.kind && e.on_date >= s.day && e.on_date <= s.until);
  const cells: Cell[] = Array.from({ length: 28 }, (_, i) => {
    const date = addDays(start, i);
    const s = stepsAt.find((x) => x.day === date);
    const worn = i < 21;
    const state: CellState = s
      ? date > todayIso ? 'upcoming' : done(s) ? 'done' : date === todayIso ? 'upcoming' : 'unlogged'
      : !worn ? 'break' : date > todayIso ? 'upcoming' : 'worn';
    return { date, n: i + 1, state, today: date === todayIso, step: s && date <= todayIso ? s.kind : undefined };
  });

  const current = [...stepsAt].reverse().find((s) => s.day <= todayIso)!;
  const next = stepsAt.find((s) => s.day > todayIso) ?? { day: addDays(start, 28), kind: steps[0][1], until: '' };
  // A cycle's first patch goes on after the patch-free week; the next two are changes
  const verb = (s: { day: string; kind: EventKind }) =>
    s.kind === 'changed' ? ((daysBetween(start, s.day) % 28) === 0 ? 'New patch on' : 'Change the patch') : s.kind === 'removed' ? 'Patch off' : s.kind === 'ring_in' ? 'Ring in' : 'Ring out';
  const actionLabel = (k: EventKind) => (k === 'changed' ? 'Patch changed' : k === 'removed' ? 'Patch is off' : k === 'ring_in' ? 'Ring is in' : 'Ring is out');
  const stepsSoFar = stepsAt.filter((s) => s.day <= todayIso);
  const doneN = stepsSoFar.filter(done).length;
  const dates: DateItem[] = [{ date: next.day, label: verb(next) }];
  if (idx < 21) dates.push({ date: addDays(start, 21), label: patch ? 'Patch-free week starts' : 'Ring-free week starts' });
  if (m.method === 'ring_yearly') dates.push({ date: addDays(m.started_on, 13 * 28), label: 'Replace the ring (after 13 cycles)', tone: tone(daysBetween(todayIso, addDays(m.started_on, 13 * 28)), 28) });
  const late = !done(current) ? daysBetween(current.day, todayIso) : -1;
  if (late > 0 && current.kind !== 'removed' && current.kind !== 'ring_out') dates.unshift({ date: addDays(current.day, 2), label: 'Late limit (48 hours)', tone: 'rose' });

  const base: Partial<Model> = {
    line: `${methodInfo(m.method).label} · week ${Math.floor(idx / 7) + 1} of 4`,
    pack: { title: `${patch ? 'Patch' : 'Ring'} cycle · started ${dayLabel(start)}`, caption: idx < 21 ? `Day ${idx + 1} of 28` : `${patch ? 'Patch' : 'Ring'}-free week`, cells, legend: ['done', 'unlogged', 'worn', 'break'] },
    stats: { label: 'This cycle', value: `${doneN} of ${stepsSoFar.length} on time`, sub: `${plural(stepsAt.length - stepsSoFar.length, 'step')} left this cycle` },
    missed: patch
      ? ['Changed late, by less than 48 hours: put a new one on now. Nothing else to do.', 'More than 48 hours late, or off that long: put a new one on and use condoms for 7 days.', 'Left on into the patch-free week? Take it off and start the next cycle on the usual day.']
      : ['Out for less than 48 hours: rinse it and put it back.', 'Out for more than 48 hours, or put in late: put it back and use condoms for 7 days.'],
    dates,
  };
  if (!done(current))
    return { ...base, badge: { tone: 'rose', text: late === 0 ? 'Due today' : `${plural(late, 'day')} late` }, sentence: `${verb(current)} ${late === 0 ? 'today' : `was due ${dayLabel(current.day)}`}.`, hint: late >= 2 ? 'See what to do below.' : null, action: { label: actionLabel(current.kind), kind: current.kind } };
  if (current.day === todayIso)
    return { ...base, badge: { tone: 'emerald', text: 'Done today' }, sentence: `${verb(next)} ${dayLabel(next.day)}, ${inDays(daysBetween(todayIso, next.day))}.`, hint: null, action: null };
  return { ...base, badge: { tone: idx >= 21 ? 'neutral' : 'emerald', text: idx >= 21 ? `${patch ? 'Patch' : 'Ring'}-free week` : 'On track' }, sentence: `${verb(next)} ${dayLabel(next.day)}, ${inDays(daysBetween(todayIso, next.day))}.`, hint: null, action: null };
}

function shotModel(m: Method, evs: ContraEvent[], todayIso: string): Partial<Model> {
  const last = [m.started_on, ...evs.filter((e) => e.kind === 'shot').map((e) => e.on_date)].sort().slice(-1)[0];
  const w = SHOT_WINDOW[m.details.shot ?? 'im'];
  const since = daysBetween(last, todayIso);
  const opens = addDays(last, w.opens), due = addDays(last, w.due), lastDay = addDays(last, w.last);
  const toDue = daysBetween(todayIso, due);
  const weeks = Math.floor(since / 7);
  const track = {
    from: last, to: due, fromLabel: `Last shot ${dayLabel(last)}`, toLabel: `Due ${dayLabel(due)}`,
    pct: Math.min(1, since / w.due), grace: { to: lastDay, pct: Math.max(0, Math.min(1, (since - w.due) / (w.last - w.due))) },
    aria: `${plural(since, 'day')} since the last shot, due after ${w.due}`,
  };
  const base: Partial<Model> = {
    line: `Shot · ${m.details.shot === 'subq' ? 'self-injected' : 'injection'} · ${since === 0 ? 'given today' : `${weeks ? plural(weeks, 'week') : plural(since, 'day')} since the last`}`,
    track,
    stats: { label: 'Last shot', value: longLabel(last), sub: since === 0 ? 'Today' : `${weeks ? plural(weeks, 'week') : plural(since, 'day')} ago` },
    missed: [`More than ${w.last / 7} weeks since the last shot: you can still get one, but use condoms for 7 days after it.`, 'Had sex in that time? Ask about emergency contraception, and you may be asked for a pregnancy test.'],
    dates: [
      ...(since < w.opens ? [{ date: opens, label: 'Next shot window opens' }] : []),
      { date: due, label: 'Next shot due', tone: tone(toDue, 14) },
      { date: lastDay, label: 'Last day without backup', tone: since > w.due ? 'rose' : undefined },
    ],
  };
  if (since < 0) return { ...base, badge: { tone: 'neutral', text: 'Scheduled' }, sentence: `The shot is on ${dayLabel(last)}.`, action: null };
  if (since > w.last)
    return { ...base, badge: { tone: 'rose', text: 'Overdue' }, sentence: `The shot was due ${dayLabel(due)}, ${inDays(toDue)}.`, hint: 'Book one now and use condoms meanwhile.', action: { label: 'Shot done', kind: 'shot' } };
  if (since >= w.due)
    return { ...base, badge: { tone: 'rose', text: 'Due now' }, sentence: `The next shot is due. Get it by ${dayLabel(lastDay)} to stay covered without backup.`, hint: null, action: { label: 'Shot done', kind: 'shot' } };
  if (since >= w.opens)
    return { ...base, badge: { tone: 'rose', text: `Due ${inDays(toDue)}` }, sentence: `The next shot is due ${dayLabel(due)}. It can be given any day from now.`, hint: null, action: { label: 'Shot done', kind: 'shot' } };
  return { ...base, badge: { tone: tone(toDue, 14), text: `Due ${inDays(toDue)}` }, sentence: `The next shot is due ${dayLabel(due)}, ${inDays(toDue)}.`, hint: `It can be given from ${dayLabel(opens)}.`, action: null };
}

// Implants, IUDs and breastfeeding: one date they stop working
function untilModel(m: Method, todayIso: string): Partial<Model> {
  const lam = m.method === 'lam';
  const until = lam ? addMonths(m.started_on, 6) : addMonths(m.started_on, 12 * yearsOf(m));
  const left = daysBetween(todayIso, until);
  const total = daysBetween(m.started_on, until);
  const brand = BRANDS.find((b) => b.id === m.details.brand);
  const name = brand ? brand.label : methodInfo(m.method).label;
  const track = {
    from: m.started_on, to: until, fromLabel: `${lam ? 'Born' : 'In since'} ${longLabel(m.started_on)}`, toLabel: `${lam ? 'Until' : 'Replace by'} ${longLabel(until)}`,
    pct: Math.max(0, Math.min(1, daysBetween(m.started_on, todayIso) / total)), aria: `${lam ? 'Breastfeeding' : name}: ${inDays(left)} until ${lam ? 'it stops counting' : 'it needs replacing'}`,
  };
  const dates: DateItem[] = [];
  const since = daysBetween(m.started_on, todayIso);
  if (!lam && m.method !== 'implant' && since < 70) dates.push({ date: addDays(m.started_on, 42), label: 'Check-up, about 6 weeks after it went in' });
  dates.push({ date: until, label: lam ? 'Stops counting (6 months)' : 'Replace or remove by', tone: tone(left, lam ? 14 : 90) });
  const years = Math.floor(left / 365);
  const line = lam ? `Breastfeeding · baby is ${plural(Math.max(0, Math.floor(since / 7)), 'week')} old` : `${name} · in for ${since >= 365 ? plural(Math.floor(since / 365), 'year') : plural(Math.max(0, Math.floor(since / 30)), 'month')}`;
  const base: Partial<Model> = { line, track, dates, action: null };
  if (left < 0) return { ...base, badge: { tone: 'rose', text: lam ? 'Over 6 months' : 'Past its date' }, sentence: lam ? `Breastfeeding stopped counting as birth control on ${dayLabel(until)}.` : `It reached its date on ${longLabel(until)}.`, hint: lam ? 'Start another method.' : 'Book a replacement or removal, and use condoms meanwhile.' };
  if (left <= (lam ? 14 : 90)) return { ...base, badge: { tone: 'rose', text: `${lam ? 'Ends' : 'Replace'} ${inDays(left)}` }, sentence: `${lam ? 'It stops counting' : 'It needs replacing'} by ${longLabel(until)}.`, hint: lam ? null : 'Book the appointment now, so there is no gap.' };
  return { ...base, badge: { tone: 'emerald', text: 'On track' }, sentence: lam ? `It counts until ${longLabel(until)}, while the baby feeds only on breast milk and your period stays away.` : `Good until ${longLabel(until)}, ${years >= 1 ? `about ${plural(years, 'year')}` : plural(left, 'day')} from now.`, hint: null };
}

// Methods logged each time, or with nothing to schedule
function plainModel(m: Method, evs: ContraEvent[], todayIso: string): Partial<Model> {
  const info = methodInfo(m.method);
  if (m.method === 'vasectomy') {
    const test = addDays(m.started_on, 84);
    return m.details.confirmed
      ? { line: "Partner's vasectomy · confirmed", badge: { tone: 'emerald', text: 'Confirmed' }, sentence: 'A semen test confirmed it worked.', dates: [] }
      : { line: "Partner's vasectomy · waiting on the test", badge: { tone: 'rose', text: 'Not confirmed yet' }, sentence: `Use another method until a semen test confirms it, about ${dayLabel(test)}.`, dates: [{ date: test, label: 'Semen test, about 12 weeks after' }] };
  }
  if (m.method === 'tubal') return { line: 'Tubal ligation · permanent', badge: { tone: 'emerald', text: 'Permanent' }, sentence: `Done ${longLabel(m.started_on)}. Nothing to keep track of.`, dates: [] };
  if (m.method === 'fertility_awareness') return { line: 'Fertility awareness', badge: null, sentence: 'Your likely fertile days are on the cycle page.', dates: [] };
  const uses = evs.filter((e) => e.kind === 'used' && e.on_date >= addDays(todayIso, -29));
  const lastUse = evs.filter((e) => e.kind === 'used').map((e) => e.on_date).sort().slice(-1)[0] as string | undefined;
  return {
    line: `${info.label}${lastUse ? ` · last logged ${inDays(daysBetween(todayIso, lastUse))}` : ''}`,
    badge: { tone: 'neutral', text: `${uses.length} in 30 days` },
    sentence: lastUse ? `Last logged ${dayLabel(lastUse)}.` : 'Nothing logged yet.',
    hint: 'Logging is optional. It helps you spot a time worth following up.',
    action: info.use ? { label: info.use, kind: 'used' } : null,
    stats: { label: 'Last 30 days', value: plural(uses.length, 'time'), sub: lastUse ? `Last ${dayLabel(lastUse)}` : 'Nothing logged' },
    dates: [],
  };
}

export function contraceptionModel(m: Method, events: ContraEvent[], todayIso: string, nowMin: number): Model {
  const evs = ofMethod(m, events);
  const part = m.method === 'pill_combined' || m.method === 'pill_progestin' ? pillModel(m, evs, todayIso, nowMin)
    : m.method === 'patch' || m.method === 'ring_monthly' || m.method === 'ring_yearly' ? cycleMethodModel(m, evs, todayIso)
    : m.method === 'shot' ? shotModel(m, evs, todayIso)
    : m.method === 'implant' || m.method === 'iud_hormonal' || m.method === 'iud_copper' || m.method === 'lam' ? untilModel(m, todayIso)
    : plainModel(m, evs, todayIso);
  // Emergency contraception in the last 3 weeks: a pregnancy test if the period hasn't come by then
  const ecDates = events.filter((e) => e.kind === 'emergency' && daysBetween(e.on_date, todayIso) <= 21).map((e) => ({ date: addDays(e.on_date, 21), label: 'Pregnancy test if no period by then', tone: 'rose' as Tone }));
  const dates = [...(part.dates ?? []), ...ecDates].filter((d) => d.date >= todayIso).sort((a, b) => a.date.localeCompare(b.date));
  return {
    info: methodInfo(m.method), line: '', badge: null, sentence: '', hint: null, action: null, pack: null, track: null, stats: null, missed: null, backupUntil: null,
    ...part,
    dates,
  };
}

// Days up to two months, then months, then years
export const relativeLabel = (day: string, todayIso: string) => {
  const n = daysBetween(todayIso, day);
  const a = Math.abs(n);
  const span = a > 730 ? plural(Math.round(a / 365), 'year') : a > 60 ? plural(Math.round(a / 30.4), 'month') : null;
  const s = span ? (n > 0 ? `in ${span}` : `${span} ago`) : inDays(n);
  return s.charAt(0).toUpperCase() + s.slice(1);
};
// What a logged event says in the history list
export function eventLabel(e: ContraEvent) {
  switch (e.kind) {
    case 'taken': return `Pill taken${e.at_time ? ` at ${clockLabel(e.at_time)}` : ''}`;
    case 'missed': return 'Pill missed';
    case 'changed': return 'Patch changed';
    case 'removed': return 'Patch off';
    case 'ring_in': return 'Ring in';
    case 'ring_out': return 'Ring out';
    case 'shot': return 'Shot';
    case 'used': return 'Logged a use';
    case 'emergency': return `Emergency contraception${e.detail?.ec ? ` · ${EC.find((x) => x.id === e.detail!.ec)?.label}` : ''}`;
  }
}
