// Run: node scripts/contraception.check.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  BRAND_IDS, EC_KINDS, EVENT_KINDS, METHOD_IDS, METHODS, PACK_IDS, PILL_KINDS, SHOT_KINDS,
  addMonths, contraceptionModel, type ContraEvent, type Method,
} from '../src/lib/contraception.ts';
import { addDays } from '../src/lib/cycle.ts';

const T = '2026-11-01';
const m = (method: Method['method'], started_on: string, details: Method['details'] = {}): Method => ({ id: 'm1', method, details, started_on, ended_on: null, shared: false });
let n = 0;
const ev = (kind: ContraEvent['kind'], on_date: string, extra: Partial<ContraEvent> = {}): ContraEvent => ({ id: `e${n++}`, method_id: 'm1', kind, on_date, at_time: null, detail: null, ...extra });
const dateOf = (model: ReturnType<typeof contraceptionModel>, label: string) => model.dates.find((d) => d.label.startsWith(label))?.date;
const noon = 12 * 60;

// Every method in the catalog, once
assert.deepEqual(METHODS.map((x) => x.id), [...METHOD_IDS]);
assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
assert.equal(addMonths('2024-02-29', 12), '2025-02-28');

// Combination pill, 21+7, started 20 Oct: today is day 13, break on 10 Nov, next pack 17 Nov
{
  const pill = m('pill_combined', '2026-10-20', { pack: '21_7', usual_time: '08:00' });
  const days = Array.from({ length: 12 }, (_, i) => addDays('2026-10-20', i));
  const model = contraceptionModel(pill, days.map((d) => ev('taken', d)), T, noon);
  assert.equal(model.line.startsWith('Pill · day 13 of 28'), true, model.line);
  assert.equal(dateOf(model, 'Break week starts'), '2026-11-10');
  assert.equal(dateOf(model, 'Next pack starts'), '2026-11-17');
  assert.equal(model.badge?.text, 'Due now');
  assert.equal(model.action?.kind, 'taken');
  assert.equal(model.stats?.value, '12 of 12 taken');
  assert.equal(model.pack?.cells.length, 28);
  assert.equal(model.pack?.cells.filter((c) => c.state === 'done').length, 12);
  assert.equal(model.pack?.cells.filter((c) => c.state === 'break').length, 7);
  assert.equal(model.pack?.cells.find((c) => c.today)?.n, 13);

  // Taken today: no action, emerald
  const taken = contraceptionModel(pill, [...days, T].map((d) => ev('taken', d, { at_time: '08:04' })), T, noon);
  assert.equal(taken.badge?.tone, 'emerald');
  assert.equal(taken.action, null);
  assert.equal(taken.stats?.value, '13 of 13 taken');

  // Before the usual time: neutral
  assert.equal(contraceptionModel(pill, [], T, 7 * 60).badge?.tone, 'neutral');

  // One missed pill on its own: no backup. Two in a row: condoms for 7 days after the second
  const one = contraceptionModel(pill, [ev('missed', '2026-10-30')], T, noon);
  assert.equal(one.backupUntil, null);
  const two = contraceptionModel(pill, [ev('missed', '2026-10-30'), ev('missed', '2026-10-31')], T, noon);
  assert.equal(two.backupUntil, '2026-11-07');
  assert.equal(two.dates[0].label, 'Use condoms until');

  // In the break week: no pill due
  const brk = contraceptionModel(pill, [], '2026-11-12', noon);
  assert.equal(brk.action, null);
  assert.equal(brk.badge?.text, 'Break week');
  assert.equal(dateOf(brk, 'Next pack starts'), '2026-11-17');

  // The second pack begins on day 29
  const p2 = contraceptionModel(pill, [], '2026-11-17', noon);
  assert.equal(p2.line.startsWith('Pill · day 1 of 28'), true);
  assert.equal(dateOf(p2, 'Next pack starts'), '2026-12-15');
}

// Extended pack: 91 days, only 4 rows of it at a time
{
  const ext = contraceptionModel(m('pill_combined', '2026-09-01', { pack: '84_7' }), [], T, noon);
  assert.equal(ext.pack?.cells.length, 28);
  assert.equal(ext.pack?.cells.some((c) => c.today), true);
  assert.equal(dateOf(ext, 'Placebo days start'), '2026-11-24');
  assert.equal(dateOf(ext, 'Next pack starts'), '2026-12-01');
}

// Mini pill: no break, and late after 3 hours for norethindrone, 12 for desogestrel
{
  const nor = m('pill_progestin', '2026-10-20', { pill: 'pop_norethindrone', usual_time: '08:00' });
  assert.equal(contraceptionModel(nor, [], T, 10 * 60).badge?.text, 'Due now');
  assert.equal(contraceptionModel(nor, [], T, 11 * 60 + 1).badge?.text, 'Late');
  const deso = m('pill_progestin', '2026-10-20', { pill: 'pop_desogestrel', usual_time: '08:00' });
  assert.equal(contraceptionModel(deso, [], T, 19 * 60).badge?.text, 'Due now');
  assert.equal(contraceptionModel(deso, [], T, 20 * 60 + 1).badge?.text, 'Late');
  const model = contraceptionModel(nor, [ev('missed', '2026-10-31')], T, noon);
  assert.equal(model.backupUntil, '2026-11-02'); // 2 days
  assert.equal(model.pack?.cells.some((c) => c.state === 'break'), false);
  assert.equal(dateOf(model, 'Next pack starts'), '2026-11-17');
}

// Patch: new on 27 Oct (a cycle start), so the change is due 3 Nov and the patch-free week starts 17 Nov
{
  const patch = m('patch', '2026-10-27');
  const model = contraceptionModel(patch, [ev('changed', '2026-10-27')], T, noon);
  assert.equal(model.badge?.text, 'On track');
  assert.equal(dateOf(model, 'Change the patch'), '2026-11-03');
  assert.equal(dateOf(model, 'Patch-free week starts'), '2026-11-17');
  // Change day not logged: due, and 2 days later the 48-hour limit shows
  const due = contraceptionModel(patch, [ev('changed', '2026-10-27')], '2026-11-03', noon);
  assert.equal(due.action?.kind, 'changed');
  const late = contraceptionModel(patch, [ev('changed', '2026-10-27')], '2026-11-04', noon);
  assert.equal(late.badge?.text, '1 day late');
  assert.equal(dateOf(late, 'Late limit'), '2026-11-05');
  // Logged a day late still counts for that change
  assert.equal(contraceptionModel(patch, [ev('changed', '2026-10-27'), ev('changed', '2026-11-04')], '2026-11-05', noon).badge?.text, 'On track');
}

// Rings: out on day 22, a yearly ring replaced after 13 cycles
{
  const ring = contraceptionModel(m('ring_monthly', '2026-10-20'), [ev('ring_in', '2026-10-20')], T, noon);
  assert.equal(dateOf(ring, 'Ring out'), '2026-11-10');
  const yearly = contraceptionModel(m('ring_yearly', '2026-01-06'), [], T, noon);
  assert.equal(dateOf(yearly, 'Replace the ring'), addDays('2026-01-06', 364));
}

// Shot: due at 13 weeks; IM grace to 15 weeks, subQ to 14
{
  const im = contraceptionModel(m('shot', '2026-08-10', { shot: 'im' }), [], T, noon);
  assert.equal(dateOf(im, 'Next shot due'), '2026-11-09');
  assert.equal(dateOf(im, 'Last day without backup'), '2026-11-23');
  assert.equal(im.action?.kind, 'shot'); // window opened 26 Oct
  const subq = contraceptionModel(m('shot', '2026-08-10', { shot: 'subq' }), [], T, noon);
  assert.equal(dateOf(subq, 'Last day without backup'), '2026-11-16');
  // A newer shot resets the clock
  const again = contraceptionModel(m('shot', '2026-05-11', { shot: 'im' }), [ev('shot', '2026-08-10')], T, noon);
  assert.equal(dateOf(again, 'Next shot due'), '2026-11-09');
  assert.equal(contraceptionModel(m('shot', '2026-07-01', { shot: 'im' }), [], T, noon).badge?.text, 'Overdue');
}

// Implant and IUDs: years by brand, editable
{
  assert.equal(dateOf(contraceptionModel(m('iud_hormonal', '2024-03-14', { brand: 'mirena' }), [], T, noon), 'Replace or remove by'), '2032-03-14');
  assert.equal(dateOf(contraceptionModel(m('iud_hormonal', '2024-03-14', { brand: 'kyleena' }), [], T, noon), 'Replace or remove by'), '2029-03-14');
  assert.equal(dateOf(contraceptionModel(m('iud_copper', '2024-03-14', {}), [], T, noon), 'Replace or remove by'), '2034-03-14');
  assert.equal(dateOf(contraceptionModel(m('implant', '2024-03-14', { years: 5 }), [], T, noon), 'Replace or remove by'), '2029-03-14');
  const fresh = contraceptionModel(m('iud_copper', '2026-10-01'), [], T, noon);
  assert.equal(dateOf(fresh, 'Check-up'), '2026-11-12');
  assert.equal(contraceptionModel(m('implant', '2023-12-01'), [], T, noon).badge?.text, 'Replace in 30 days');
}

// Breastfeeding counts for 6 months; a vasectomy needs its test
{
  assert.equal(dateOf(contraceptionModel(m('lam', '2026-07-15'), [], T, noon), 'Stops counting'), '2027-01-15');
  assert.equal(dateOf(contraceptionModel(m('vasectomy', '2026-10-01'), [], T, noon), 'Semen test'), '2026-12-24');
}

// Emergency contraception: a pregnancy test date 3 weeks later, whatever the method
{
  const model = contraceptionModel(m('condom_external', '2026-01-01'), [ev('emergency', '2026-10-25', { method_id: null, detail: { ec: 'levonorgestrel' } })], T, noon);
  assert.equal(dateOf(model, 'Pregnancy test'), '2026-11-15');
  assert.equal(model.action?.kind, 'used');
}

// The contraception function checks against its own copy of the ids; keep the lists the same
const fn = readFileSync(new URL('../../duove-backend/supabase/functions/contraception/index.ts', import.meta.url), 'utf8');
const listed = (name: string) => [...(fn.match(new RegExp(`${name} = \\[([^\\]]*)\\]`))?.[1] ?? '').matchAll(/"([^"]+)"/g)].map((x) => x[1]);
assert.deepEqual(listed('METHOD_IDS'), [...METHOD_IDS], 'contraception METHOD_IDS differs');
assert.deepEqual(listed('EVENT_KINDS'), [...EVENT_KINDS], 'contraception EVENT_KINDS differs');
assert.deepEqual(listed('PILL_KINDS'), [...PILL_KINDS], 'contraception PILL_KINDS differs');
assert.deepEqual(listed('PACK_IDS'), [...PACK_IDS], 'contraception PACK_IDS differs');
assert.deepEqual(listed('BRAND_IDS'), [...BRAND_IDS], 'contraception BRAND_IDS differs');
assert.deepEqual(listed('SHOT_KINDS'), [...SHOT_KINDS], 'contraception SHOT_KINDS differs');
assert.deepEqual(listed('EC_KINDS'), [...EC_KINDS], 'contraception EC_KINDS differs');

console.log('contraception: all checks passed');
