// Run: node scripts/cycle.check.ts
import assert from 'node:assert/strict';
import { addDays, cycleModel, daysBetween, isoDay, showsCycle } from '../src/lib/cycle.ts';

const p = (id: string, start_date: string, end_date: string | null = null) => ({ id, start_date, end_date });

// Local calendar days, never UTC: 23:30 local is still that day
assert.equal(isoDay(new Date(2026, 9, 17, 23, 30)), '2026-10-17');
assert.equal(isoDay(new Date(2026, 9, 17, 0, 5)), '2026-10-17');
assert.equal(addDays('2026-10-30', 3), '2026-11-02');
assert.equal(addDays('2026-03-01', -1), '2026-02-28');
assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2); // across a DST change
assert.equal(daysBetween('2026-10-17', '2026-10-10'), -7);

// No periods: nothing to predict
assert.equal(cycleModel([], '2026-10-17').summary, null);

// Two logged periods, 27 days apart, 5 days each
const two = [p('b', '2026-09-21', '2026-09-25'), p('a', '2026-08-25', '2026-08-29')]; // unsorted on purpose
let m = cycleModel(two, '2026-10-17');
let s = m.summary!;
assert.equal(s.length, 27); assert.equal(s.bleed, 5); assert.equal(s.basedOn, 1);
assert.equal(s.start, '2026-09-21'); assert.equal(s.day, 27);
assert.equal(s.nextStart, '2026-10-18'); assert.equal(s.daysUntil, 1);
assert.equal(s.late, false); assert.equal(s.stale, false);
assert.equal(s.phase, 'luteal');
// Ovulation 14 days before the next period (day 13), fertile window the 6 days ending on it
assert.deepEqual(s.layout, { length: 27, bleed: 5, fertileStart: 8, ovulation: 13 });
// This cycle's window has passed, so it shows the next one
assert.deepEqual(s.fertile, { start: '2026-10-25', end: '2026-10-30', ovulation: '2026-10-30' });
assert.equal(s.openPeriod, null);

// Days: logged period, predicted period, phases, ovulation, before any data
assert.deepEqual(m.day('2026-09-23'), { day: 3, phase: 'menstrual', ovulation: false, period: 'logged' });
assert.deepEqual(m.day('2026-10-18'), { day: 1, phase: 'menstrual', ovulation: false, period: 'predicted' });
assert.deepEqual(m.day('2026-10-22'), { day: 5, phase: 'menstrual', ovulation: false, period: 'predicted' });
assert.deepEqual(m.day('2026-10-23'), { day: 6, phase: 'follicular', ovulation: false, period: null });
assert.deepEqual(m.day('2026-10-25'), { day: 8, phase: 'fertile', ovulation: false, period: null });
assert.deepEqual(m.day('2026-10-30'), { day: 13, phase: 'fertile', ovulation: true, period: null });
assert.deepEqual(m.day('2026-10-31'), { day: 14, phase: 'luteal', ovulation: false, period: null });
assert.deepEqual(m.day('2026-11-14'), { day: 1, phase: 'menstrual', ovulation: false, period: 'predicted' }); // two cycles ahead
assert.equal(m.day('2026-08-24'), null);
// A past cycle uses its own length (27), not a projection from today
assert.equal(m.day('2026-09-06')!.ovulation, true);
assert.equal(m.day('2026-09-07')!.phase, 'luteal');

// Today inside the fertile window shows this cycle's window
s = cycleModel(two, '2026-09-30').summary!;
assert.deepEqual(s.fertile, { start: '2026-09-28', end: '2026-10-03', ovulation: '2026-10-03' });
assert.equal(s.phase, 'fertile');

// Predicted start day: due today, not late
m = cycleModel(two, '2026-10-18');
s = m.summary!;
assert.equal(s.daysUntil, 0); assert.equal(s.late, false);
assert.deepEqual(m.day('2026-10-18'), { day: 28, phase: null, ovulation: false, period: 'predicted' }); // same count as the header
assert.deepEqual(m.day('2026-10-19'), { day: 2, phase: 'menstrual', ovulation: false, period: 'predicted' });

// One open period: defaults, and it can be ended
m = cycleModel([p('a', '2026-10-10')], '2026-10-17');
s = m.summary!;
assert.equal(s.length, 28); assert.equal(s.bleed, 5); assert.equal(s.basedOn, 0);
assert.equal(s.day, 8); assert.equal(s.phase, 'menstrual'); // still open on day 8: still a period
assert.equal(s.openPeriod?.id, 'a');
assert.equal(m.day('2026-10-17')!.period, 'logged');
assert.equal(m.day('2026-10-18')!.period, null);
assert.deepEqual(m.actions('2026-10-16'), { end: 'a', remove: 'a' });
// Ten days in, it stops asking and falls back to the average
m = cycleModel([p('a', '2026-10-10')], '2026-10-20');
assert.equal(m.summary!.openPeriod, null);
assert.equal(m.day('2026-10-15')!.period, null);
// An open period that starts today is still in progress: today logged, the rest predicted
m = cycleModel([p('a', '2026-10-17')], '2026-10-17');
assert.equal(m.day('2026-10-17')!.period, 'logged');
assert.equal(m.day('2026-10-18')!.period, 'predicted');

// Late: no predictions past the expected start, days counted on
const late = [p('a', '2026-08-04', '2026-08-08'), p('b', '2026-09-01', '2026-09-05')];
m = cycleModel(late, '2026-10-17');
s = m.summary!;
assert.equal(s.nextStart, '2026-09-29'); assert.equal(s.daysUntil, -18);
assert.equal(s.late, true); assert.equal(s.stale, false);
assert.equal(s.day, 47); assert.equal(s.phase, null); assert.equal(s.fertile, null);
assert.deepEqual(m.day('2026-10-05'), { day: 35, phase: null, ovulation: false, period: null });
assert.deepEqual(m.day('2026-10-20'), { day: 50, phase: null, ovulation: false, period: null });
// A whole cycle overdue reads as stale
assert.equal(cycleModel(late, '2026-12-20').summary!.stale, true);

// Gaps from a missed log don't count toward the average, and a long gap has no phases past the average
const gap = [p('a', '2026-03-01', '2026-03-05'), p('b', '2026-05-01', '2026-05-05'), p('c', '2026-05-29', '2026-06-02')];
m = cycleModel(gap, '2026-06-10');
assert.equal(m.summary!.length, 28); assert.equal(m.summary!.basedOn, 1);
assert.equal(m.day('2026-04-10')!.phase, null); // day 41 of a 61-day gap
assert.equal(m.day('2026-03-08')!.phase, 'follicular'); // day 8 of an assumed 28

// Average uses the last 6 cycles, bleeding uses closed periods of 1 to 10 days
// 44 days, then six of 26: all seven would average 29
const many = ['2025-11-01', '2025-12-15', '2026-01-10', '2026-02-05', '2026-03-03', '2026-03-29', '2026-04-24', '2026-05-20']
  .map((d, i) => p(`m${i}`, d, addDays(d, i === 7 ? 11 : 3))); // last one 12 days: ignored
s = cycleModel(many, '2026-05-22').summary!;
assert.equal(s.length, 26); assert.equal(s.basedOn, 6); assert.equal(s.bleed, 4);
// Futures don't count
s = cycleModel([...two, p('f', '2026-10-30')], '2026-10-17').summary!;
assert.equal(s.start, '2026-09-21');

// Short cycle: the fertile window starts after bleeding, ovulation never inside it
assert.deepEqual(cycleModel([p('a', '2026-09-01', '2026-09-07'), p('b', '2026-09-22', '2026-09-28')], '2026-09-30').summary!.layout,
  { length: 21, bleed: 7, fertileStart: 8, ovulation: 8 });

// What you can do on a day
m = cycleModel([p('a', '2026-09-21', '2026-09-25')], '2026-10-17');
assert.deepEqual(m.actions('2026-10-18'), {}); // the future
assert.deepEqual(m.actions('2026-10-10'), { start: 'new' });
assert.deepEqual(m.actions('2026-09-21'), { remove: 'a' });
assert.deepEqual(m.actions('2026-09-23'), { end: 'a', remove: 'a' });
assert.deepEqual(m.actions('2026-09-25'), { remove: 'a' }); // already the end
assert.deepEqual(m.actions('2026-09-30'), { end: 'a' }); // just after: extend it
assert.deepEqual(m.actions('2026-09-15'), { start: 'a' }); // just before: move the start
assert.deepEqual(m.actions('2026-09-12'), { start: 'a' }); // 14 days with the end
assert.deepEqual(m.actions('2026-09-11'), {}); // open, it would reach past 21 Sep, and moving would make 15 days
assert.deepEqual(m.actions('2026-09-08'), {});
assert.deepEqual(m.actions('2026-09-07'), { start: 'new' });
// Moving the start can't make a period longer than 14 days
m = cycleModel([p('a', '2026-09-21', '2026-09-30')], '2026-10-17');
assert.deepEqual(m.actions('2026-09-15'), {});
// An open period can be ended on any of its first 14 days
m = cycleModel([p('a', '2026-10-10')], '2026-10-30');
assert.deepEqual(m.actions('2026-10-23'), { end: 'a' });
assert.deepEqual(m.actions('2026-10-24'), { start: 'new' });

// Past cycles, newest first
assert.deepEqual(cycleModel(two, '2026-10-17').history, [
  { start: '2026-09-21', length: null, bleed: 5 },
  { start: '2026-08-25', length: 27, bleed: 5 },
]);

// Whose cycle shows: anyone who said yes; without an answer, only with 2 or more logged periods
assert.equal(showsCycle(true, 0), true);
assert.equal(showsCycle(false, 5), false);
assert.equal(showsCycle(null, 0), false);
assert.equal(showsCycle(null, 1), false);
assert.equal(showsCycle(null, 2), true);

console.log('cycle: all checks passed');
