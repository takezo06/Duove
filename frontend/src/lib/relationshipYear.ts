const DAY = 24 * 60 * 60 * 1000;

// "2025-03-31" (a calendar date) or an ISO timestamp (an instant) -> local midnight of that day
function parseDay(value: string) {
  if (value.length > 10) {
    const t = new Date(value);
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  }
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Same day-of-month n months later, clamped (Jan 31 + 1 month = Feb 28/29)
function addMonths(start: Date, n: number) {
  const target = new Date(start.getFullYear(), start.getMonth() + n, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(start.getDate(), lastDay));
  return target;
}

const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY);

export function relationshipYear(since: string, today = new Date()) {
  const start = parseDay(since);
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  let months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
  if (addMonths(start, months) > now) months--;
  months = Math.max(months, 0);

  const year = Math.floor(months / 12);
  const yearStart = addMonths(start, year * 12);
  const yearEnd = addMonths(start, (year + 1) * 12);
  const yearLength = daysBetween(yearStart, yearEnd);
  const nextMonthsary = addMonths(start, months + 1);

  return {
    start,
    yearStart,
    yearEnd,
    yearNumber: year + 1,
    monthOfYear: (months % 12) + 1,
    progress: daysBetween(yearStart, now) / yearLength,
    // where each monthsary falls on the year track, 0..1
    monthsaries: Array.from({ length: 11 }, (_, i) => daysBetween(yearStart, addMonths(start, year * 12 + i + 1)) / yearLength),
    nextMonthsary,
    daysToMonthsary: daysBetween(now, nextMonthsary),
    daysToAnniversary: daysBetween(now, yearEnd),
    isAnniversary: year > 0 && daysBetween(yearStart, now) === 0,
    isMonthsary: months > 0 && daysBetween(addMonths(start, months), now) === 0,
  };
}
