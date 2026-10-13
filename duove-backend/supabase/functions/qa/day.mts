// Pure helpers for the daily Q&A. Check: node duove-backend/supabase/functions/qa/day.check.mts

// The caller's local date and seconds until their next midnight. Invalid/missing tz falls back to UTC.
export function clock(tz: string | null, now = new Date()): { today: string; secondsUntilNext: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz || "UTC",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(now);
  } catch {
    return clock("UTC", now);
  }
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return {
    today: `${p.year}-${p.month}-${p.day}`,
    // ponytail: ignores DST-shortened/lengthened days, off by an hour twice a year
    secondsUntilNext: 86400 - (Number(p.hour) * 3600 + Number(p.minute) * 60 + Number(p.second)),
  };
}

// Never-used questions first; once the pool is exhausted, the one used longest ago.
// `used` is the relationship's assignments, newest first.
export function pickQuestion<Q extends { id: string }>(
  pool: Q[],
  used: { question_id: string; assigned_date: string }[],
  exclude?: string,
  random = Math.random,
): Q | null {
  const candidates = pool.filter((q) => q.id !== exclude);
  if (!candidates.length) return null;
  const lastUsed = new Map<string, string>();
  for (const u of used) if (!lastUsed.has(u.question_id)) lastUsed.set(u.question_id, u.assigned_date);
  const fresh = candidates.filter((q) => !lastUsed.has(q.id));
  if (fresh.length) return fresh[Math.floor(random() * fresh.length)];
  return candidates.reduce((a, b) => (lastUsed.get(a.id)! <= lastUsed.get(b.id)! ? a : b));
}

// Answers belong to an assignment if they match its question and were submitted on its local day.
// The UTC window [date-1d, date+2d) covers every timezone, so a question that repeats later
// doesn't inherit old answers.
export function answerWindow(assignedDate: string): { from: string; to: string } {
  const d = new Date(`${assignedDate}T00:00:00Z`).getTime();
  return { from: new Date(d - 86400e3).toISOString(), to: new Date(d + 2 * 86400e3).toISOString() };
}

export function answersFor<A extends { question_id: string; submitted_at: string }>(
  assignment: { question_id: string; assigned_date: string },
  answers: A[],
): A[] {
  const { from, to } = answerWindow(assignment.assigned_date);
  return answers.filter((a) => {
    const t = Date.parse(a.submitted_at);
    return a.question_id === assignment.question_id && t >= Date.parse(from) && t < Date.parse(to);
  });
}
