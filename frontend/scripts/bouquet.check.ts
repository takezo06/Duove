// Run: node frontend/scripts/bouquet.check.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  FLOWERS, WRAPS, MAX_STEMS, NECK, arrange, greenery, addStem, removeStem, rearrange, describe, countLabel, isBouquet,
  type Bouquet, type FlowerId,
} from '../src/lib/bouquet.ts';

const ids = FLOWERS.map((f) => f.id);
const full: FlowerId[] = Array.from({ length: MAX_STEMS }, (_, i) => ids[i % ids.length]);
const seeds = [0, 1, 42, 99999, 123456789, 2 ** 31 - 1];

// The same stems and seed always draw the same bouquet, so both of you see the same one
for (const seed of seeds) assert.deepEqual(arrange(full, seed), arrange(full, seed));

// Adding a stem never moves the ones already placed
for (const seed of seeds) {
  const all = arrange(full, seed);
  for (let n = 1; n < MAX_STEMS; n++) assert.deepEqual(arrange(full.slice(0, n), seed), all.slice(0, n));
}

// Every size of bouquet stays balanced over the neck, and no bloom hides another
for (const seed of seeds) {
  for (let n = 1; n <= MAX_STEMS; n++) {
    const placed = arrange(full.slice(0, n), seed);
    const meanX = placed.reduce((s, p) => s + p.x, 0) / n;
    assert.ok(Math.abs(meanX - NECK.x) <= 15, `${n} stems lean ${(meanX - NECK.x).toFixed(1)} off the neck (seed ${seed})`);
    for (let a = 0; a < n; a++)
      for (let b = a + 1; b < n; b++) {
        const d = Math.hypot(placed[a].x - placed[b].x, placed[a].y - placed[b].y);
        assert.ok(d >= 22, `blooms ${a} and ${b} sit ${d.toFixed(1)} apart (seed ${seed})`);
      }
    for (const p of placed) assert.ok(p.y < NECK.y - 60, 'every bloom sits above the wrap');
  }
}

// Twelve stems at most
assert.equal(arrange([...full, 'tulip', 'tulip'], 7).length, MAX_STEMS);
const twelve: Bouquet = { v: 1, stems: full, wrap: 'kraft', seed: 5 };
assert.equal(addStem(twelve, 'tulip').stems.length, MAX_STEMS);

// Adding appends; removing takes off the last one of that kind
const b: Bouquet = { v: 1, stems: ['tulip', 'peony', 'tulip'], wrap: 'wine', seed: 9 };
assert.deepEqual(addStem(b, 'lily').stems, ['tulip', 'peony', 'tulip', 'lily']);
assert.deepEqual(removeStem(b, 'tulip').stems, ['tulip', 'peony']);
assert.deepEqual(removeStem(b, 'daisy').stems, b.stems);

// Rearranging keeps the same flowers
const r = rearrange({ ...twelve, stems: [...full] });
assert.deepEqual([...r.stems].sort(), [...full].sort());
assert.ok(isBouquet(r));

// Greenery grows with the bouquet and is empty before the first stem
assert.equal(greenery(0, 1).length, 0);
assert.equal(greenery(1, 1).length, 3);
assert.equal(greenery(12, 1).length, 7);
assert.deepEqual(greenery(6, 3), greenery(6, 3));

// The words for it
assert.equal(
  describe({ v: 1, stems: ['tulip', 'tulip', 'tulip', 'peony', 'peony', 'babys-breath'], wrap: 'kraft', seed: 1 }),
  "3 tulips, 2 peonies and a sprig of baby's breath, wrapped in kraft paper",
);
assert.equal(describe({ v: 1, stems: ['anemone'], wrap: 'tissue', seed: 1 }), 'an anemone, wrapped in cream tissue');
assert.equal(describe({ v: 1, stems: ['lily', 'daisy'], wrap: 'charcoal', seed: 1 }), 'a lily and a daisy, wrapped in charcoal paper');
assert.equal(countLabel('lily', 1), 'A lily');
assert.equal(countLabel('lily', 4), '4 lilies');
assert.equal(countLabel('babys-breath', 2), "2 sprigs of baby's breath");

// Only a well-formed bouquet is accepted
assert.ok(isBouquet(b));
for (const bad of [
  null, 'roses', [], {},
  { ...b, v: 2 },
  { ...b, stems: [] },
  { ...b, stems: [...full, 'tulip'] },
  { ...b, stems: ['tulip', 'orchid'] },
  { ...b, wrap: 'gold' },
  { ...b, seed: 1.5 },
  { ...b, seed: -1 },
  { ...b, seed: 2 ** 31 },
  { ...b, seed: '9' },
]) assert.equal(isBouquet(bad), false, JSON.stringify(bad));

// The love-letters function checks bouquets against its own copy of the ids; keep the two lists the same
const fn = readFileSync(new URL('../../duove-backend/supabase/functions/love-letters/index.ts', import.meta.url), 'utf8');
const listed = (name: string) => [...(fn.match(new RegExp(`${name} = \\[([^\\]]*)\\]`))?.[1] ?? '').matchAll(/"([^"]+)"/g)].map((m) => m[1]);
assert.deepEqual(listed('FLOWER_IDS'), ids, 'love-letters FLOWER_IDS differs from src/lib/bouquet.ts');
assert.deepEqual(listed('WRAP_IDS'), WRAPS.map((w) => w.id), 'love-letters WRAP_IDS differs from src/lib/bouquet.ts');

console.log('bouquet: all checks passed');
