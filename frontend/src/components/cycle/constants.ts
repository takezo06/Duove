import { daysBetween, isoDay, parseDay } from '../../lib/cycle';
import { plural } from '../../lib/plural';

export const phaseColors = {
  menstrual: { text: 'text-red-500', dot: 'bg-red-500', border: 'border-red-500', label: 'Menstrual' },
  follicular: { text: 'text-teal-300', dot: 'bg-teal-300', border: 'border-teal-300', label: 'Follicular' },
  fertile: { text: 'text-rose-300', dot: 'bg-rose-300', border: 'border-rose-300', label: 'Fertile' },
  luteal: { text: 'text-purple-300', dot: 'bg-purple-300', border: 'border-purple-300', label: 'Luteal' },
};

// What a day's log can hold. Values are what the backend stores.
export const BLEEDING = ['spotting', 'light', 'medium', 'heavy'];
export const SYMPTOMS = ['cramps', 'bloating', 'headache', 'backache', 'breast tenderness', 'acne', 'fatigue', 'nausea'];
export const MOODS = ['happy', 'calm', 'energetic', 'emotional', 'moody', 'irritable', 'anxious', 'sad'];
export const DISCHARGE = ['dry', 'sticky', 'creamy', 'watery', 'eggwhite'];
export const LEVELS = ['low', 'medium', 'high'];
export const SEX = ['protected', 'unprotected', 'masturbation'];

const LABELS: Record<string, string> = { eggwhite: 'Egg white', masturbation: 'Solo' };
export const labelOf = (v: string) => LABELS[v] ?? v.charAt(0).toUpperCase() + v.slice(1);

// Dates for cycle copy, in the viewer's locale
const short = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
export const shortDay = (day: string) => short.format(parseDay(day));
export const longDay = (day: string) => parseDay(day).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
export const dayRange = (a: string, b: string) => (a === b ? shortDay(a) : short.formatRange(parseDay(a), parseDay(b)));
export function relativeDay(day: string, todayIso: string) {
  const n = daysBetween(todayIso, day);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  return n > 0 ? `In ${plural(n, 'day')}` : `${plural(-n, 'day')} ago`;
}

// 'YYYY-MM' plus or minus n months
export const shiftMonth = (month: string, n: number) => isoDay(new Date(+month.slice(0, 4), +month.slice(5, 7) - 1 + n, 1)).slice(0, 7);
