// Run: node scripts/relationshipYear.check.ts
import assert from 'node:assert/strict';
import { relationshipYear } from '../src/lib/relationshipYear.ts';

const d = (s: string) => new Date(`${s}T12:00:00`);

// Day one
let r = relationshipYear('2025-03-03', d('2025-03-03'));
assert.equal(r.yearNumber, 1); assert.equal(r.monthOfYear, 1); assert.equal(r.progress, 0);
assert.equal(r.daysToMonthsary, 31); assert.equal(r.isAnniversary, false); assert.equal(r.isMonthsary, false);

// Mid year 2, from an ISO timestamp
r = relationshipYear('2025-03-03T09:15:00.000Z', d('2026-10-12'));
assert.equal(r.yearNumber, 2); assert.equal(r.monthOfYear, 8);
assert.equal(r.daysToMonthsary, 22); assert.equal(r.daysToAnniversary, 142);
assert.equal(r.totalDays, 588);

// Anniversary and monthsary days
assert.equal(relationshipYear('2025-03-03', d('2026-03-03')).isAnniversary, true);
r = relationshipYear('2025-03-03', d('2025-05-03'));
assert.equal(r.isMonthsary, true); assert.equal(r.monthOfYear, 3);

// Jan 31 start: Feb monthsary clamps to the 28th, not March 3
r = relationshipYear('2026-01-31', d('2026-02-27'));
assert.equal(r.nextMonthsary.getDate(), 28); assert.equal(r.nextMonthsary.getMonth(), 1);
assert.equal(r.lastMonthsary.getDate(), 31); assert.equal(r.lastMonthsary.getMonth(), 0);
assert.equal(relationshipYear('2026-01-31', d('2026-02-28')).isMonthsary, true);

// Track ticks are ordered and inside the year
r = relationshipYear('2025-03-03', d('2026-10-12'));
assert.equal(r.monthsaries.length, 11);
assert.ok(r.monthsaries.every((t, i, a) => t > 0 && t < 1 && (i === 0 || t > a[i - 1])));
assert.ok(r.progress > 0.5 && r.progress < 1);

// A timestamp is an instant: it lands on the viewer's local day, not the UTC day
const paired = new Date(2026, 9, 12, 4, 0).toISOString(); // 4am local, Oct 12
assert.equal(relationshipYear(paired, d('2026-10-12')).start.getDate(), 12);

console.log('relationshipYear: ok');
