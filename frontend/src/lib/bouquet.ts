// Flowers in a letter: the catalog, the wraps, and where each stem sits in the bouquet.
// A bouquet is stored as its stems in the order they were added, the wrap and a seed, and is always
// drawn from those three alone, so the sender and the partner see exactly the same arrangement.
// The love-letters function keeps its own copy of the flower and wrap ids (scripts/bouquet.check.ts compares them).

export const MAX_STEMS = 12;

export const FLOWERS = [
  { id: 'garden-rose', name: 'Garden rose', one: 'a garden rose', many: 'garden roses', meaning: 'I love you. No hidden meaning.' },
  { id: 'peony', name: 'Peony', one: 'a peony', many: 'peonies', meaning: "Here's to a long, happy life together." },
  { id: 'ranunculus', name: 'Ranunculus', one: 'a ranunculus', many: 'ranunculus', meaning: 'I find you completely charming.' },
  { id: 'tulip', name: 'Tulip', one: 'a tulip', many: 'tulips', meaning: 'This is the real thing.' },
  { id: 'anemone', name: 'Anemone', one: 'an anemone', many: 'anemones', meaning: 'Counting the days until I see you.' },
  { id: 'cosmos', name: 'Cosmos', one: 'a cosmos', many: 'cosmos', meaning: 'You bring calm to my chaos.' },
  { id: 'daisy', name: 'Daisy', one: 'a daisy', many: 'daisies', meaning: 'Simple and true, like us.' },
  { id: 'carnation', name: 'Carnation', one: 'a carnation', many: 'carnations', meaning: "You're on my mind all the time." },
  { id: 'sweet-pea', name: 'Sweet pea', one: 'a sweet pea', many: 'sweet peas', meaning: 'Thank you for every lovely moment.' },
  { id: 'lily', name: 'Lily', one: 'a lily', many: 'lilies', meaning: "I'm so proud of you." },
  { id: 'snapdragon', name: 'Snapdragon', one: 'a snapdragon', many: 'snapdragons', meaning: 'For when you need a little nerve.' },
  { id: 'babys-breath', name: "Baby's breath", one: "a sprig of baby's breath", many: "sprigs of baby's breath", meaning: 'Forever, in small ways.' },
] as const;

export type FlowerId = (typeof FLOWERS)[number]['id'];

// Each wrap's paper in two tones (the lit and the shaded face of each fold), its back sheet, the crease, and the ribbon
export const WRAPS = [
  {
    id: 'kraft', name: 'Kraft', phrase: 'kraft paper', swatch: 'bg-amber-800',
    lit: 'fill-amber-800', shade: 'fill-amber-900', back: 'fill-amber-900', backShade: 'fill-amber-950', lip: 'fill-amber-700', crease: 'stroke-amber-950', ribbon: 'fill-amber-200', ribbonShade: 'fill-amber-300',
  },
  {
    id: 'wine', name: 'Wine', phrase: 'wine paper', swatch: 'bg-rose-900',
    lit: 'fill-rose-900', shade: 'fill-rose-950', back: 'fill-rose-950', backShade: 'fill-rose-950', lip: 'fill-rose-800', crease: 'stroke-rose-950', ribbon: 'fill-rose-300', ribbonShade: 'fill-rose-400',
  },
  {
    id: 'charcoal', name: 'Charcoal', phrase: 'charcoal paper', swatch: 'bg-neutral-700',
    lit: 'fill-neutral-700', shade: 'fill-neutral-800', back: 'fill-neutral-800', backShade: 'fill-neutral-800', lip: 'fill-neutral-600', crease: 'stroke-neutral-900', ribbon: 'fill-rose-400', ribbonShade: 'fill-rose-500',
  },
  {
    id: 'tissue', name: 'Tissue', phrase: 'cream tissue', swatch: 'bg-amber-50',
    lit: 'fill-amber-50', shade: 'fill-neutral-200', back: 'fill-neutral-300', backShade: 'fill-neutral-400', lip: 'fill-white', crease: 'stroke-neutral-300', ribbon: 'fill-rose-400', ribbonShade: 'fill-rose-500',
  },
] as const;

export type WrapId = (typeof WRAPS)[number]['id'];
export type Wrap = (typeof WRAPS)[number];

export interface Bouquet {
  v: 1;
  stems: FlowerId[];
  wrap: WrapId;
  seed: number;
}

export interface Placed {
  id: FlowerId;
  // position in `stems`, which is also the order they were added
  i: number;
  x: number;
  y: number;
  rotate: number;
  scale: number;
  // 0 front, 1 middle, 2 back
  depth: 0 | 1 | 2;
}

// Where the stems gather and the ribbon is tied, in the bouquet's 240 x 300 drawing
export const NECK = { x: 120, y: 258 };

// Twelve places on a dome over the neck, in the order they fill. Each pair mirrors the one before it,
// so a bouquet of any size stays balanced, and a new stem never moves the ones already placed.
const SLOTS: { x: number; y: number; depth: 0 | 1 | 2 }[] = [
  { x: 120, y: 126, depth: 0 },
  { x: 98, y: 100, depth: 1 },
  { x: 142, y: 100, depth: 1 },
  { x: 120, y: 74, depth: 2 },
  { x: 72, y: 126, depth: 0 },
  { x: 168, y: 126, depth: 0 },
  { x: 94, y: 56, depth: 2 },
  { x: 146, y: 56, depth: 2 },
  { x: 64, y: 90, depth: 1 },
  { x: 176, y: 90, depth: 1 },
  { x: 100, y: 152, depth: 0 },
  { x: 140, y: 152, depth: 0 },
];
const DEPTH_SCALE = [1.12, 1.05, 0.98];

// Leaves behind the blooms: where each sprig starts and which way it leans, filled in order like the slots
const SPRIGS = [
  { x: 120, y: 104, rotate: 0 },
  { x: 92, y: 112, rotate: -52 },
  { x: 148, y: 112, rotate: 52 },
  { x: 104, y: 96, rotate: -24 },
  { x: 136, y: 96, rotate: 24 },
  { x: 84, y: 132, rotate: -78 },
  { x: 156, y: 132, rotate: 78 },
];

// mulberry32: small, fast and the same everywhere, which is all a bouquet needs
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// A stream of its own for each stem, so one stem's wobble doesn't depend on how many came before it
const streamFor = (seed: number, i: number) => random(seed ^ Math.imul(i + 1, 0x9e3779b9));
const wobble = (next: () => number, by: number) => (next() * 2 - 1) * by;

export function arrange(stems: FlowerId[], seed: number): Placed[] {
  return stems.slice(0, MAX_STEMS).map((id, i) => {
    const slot = SLOTS[i];
    const next = streamFor(seed, i);
    return {
      id,
      i,
      x: slot.x + wobble(next, 3),
      y: slot.y + wobble(next, 3),
      rotate: wobble(next, 8),
      scale: DEPTH_SCALE[slot.depth],
      depth: slot.depth,
    };
  });
}

export type SprigKind = 'eucalyptus' | 'fern';

export function greenery(count: number, seed: number): { kind: SprigKind; x: number; y: number; rotate: number }[] {
  const n = count === 0 ? 0 : Math.min(SPRIGS.length, 3 + Math.floor(count / 3));
  return SPRIGS.slice(0, n).map((s, i) => {
    const next = streamFor(seed, 100 + i);
    return { kind: next() < 0.5 ? 'eucalyptus' : 'fern', x: s.x, y: s.y, rotate: s.rotate + wobble(next, 6) };
  });
}

export const newSeed = () => crypto.getRandomValues(new Uint32Array(1))[0] >>> 1;
export const emptyBouquet = (): Bouquet => ({ v: 1, stems: [], wrap: 'kraft', seed: newSeed() });

export const addStem = (b: Bouquet, id: FlowerId): Bouquet =>
  b.stems.length >= MAX_STEMS ? b : { ...b, stems: [...b.stems, id] };

export function removeStem(b: Bouquet, id: FlowerId): Bouquet {
  const at = b.stems.lastIndexOf(id);
  return at < 0 ? b : { ...b, stems: b.stems.filter((_, i) => i !== at) };
}

// New places for the same flowers: shuffle the order they fill the dome in, and a new wobble
export function rearrange(b: Bouquet): Bouquet {
  const seed = newSeed();
  const next = random(seed);
  const stems = [...b.stems];
  for (let i = stems.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [stems[i], stems[j]] = [stems[j], stems[i]];
  }
  return { ...b, stems, seed };
}

export const flowerOf = (id: FlowerId) => FLOWERS.find((f) => f.id === id)!;
export const wrapOf = (id: WrapId) => WRAPS.find((w) => w.id === id) ?? WRAPS[0];

// How many of each, in the order they were first picked
export function counts(stems: FlowerId[]): { id: FlowerId; n: number }[] {
  const seen = new Map<FlowerId, number>();
  for (const id of stems) seen.set(id, (seen.get(id) ?? 0) + 1);
  return [...seen].map(([id, n]) => ({ id, n }));
}

const phrase = (id: FlowerId, n: number) => (n === 1 ? flowerOf(id).one : `${n} ${flowerOf(id).many}`);

// "A lily", "4 lilies"
export function countLabel(id: FlowerId, n: number) {
  const p = phrase(id, n);
  return p.charAt(0).toUpperCase() + p.slice(1);
}

// "3 tulips, 2 peonies and a sprig of baby's breath"
export function listStems(stems: FlowerId[]) {
  const parts = counts(stems).map(({ id, n }) => phrase(id, n));
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0] ?? '';
}

// "3 tulips, 2 peonies and a sprig of baby's breath, wrapped in kraft paper"
export const describe = (b: Bouquet) => `${listStems(b.stems)}, wrapped in ${wrapOf(b.wrap).phrase}`;

const flowerIds = new Set<string>(FLOWERS.map((f) => f.id));
const wrapIds = new Set<string>(WRAPS.map((w) => w.id));

export function isBouquet(v: unknown): v is Bouquet {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const b = v as Record<string, unknown>;
  return (
    b.v === 1 &&
    Array.isArray(b.stems) &&
    b.stems.length >= 1 &&
    b.stems.length <= MAX_STEMS &&
    b.stems.every((s) => typeof s === 'string' && flowerIds.has(s)) &&
    typeof b.wrap === 'string' &&
    wrapIds.has(b.wrap) &&
    Number.isInteger(b.seed) &&
    (b.seed as number) >= 0 &&
    (b.seed as number) <= 2 ** 31 - 1
  );
}
