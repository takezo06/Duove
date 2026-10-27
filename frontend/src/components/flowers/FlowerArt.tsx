import type { ReactNode } from 'react';
import type { FlowerId, SprigKind } from '../../lib/bouquet';

// The flowers, drawn in one language: flat fills from Duove's own ramps (rose, amber, warm whites,
// neutral for dark centers, emerald for leaves), light from a lit and a shaded face of each petal
// instead of gradients, one stem weight (2.5) and one fine-line weight (1.2). Each bloom has a
// silhouette, its inner petals, and one small detail that rewards a second look.
// Blooms are drawn around (0,0) within a radius of about 28; sprigs grow up from (0,0).

const STEM = 2.5;
const FINE = 1.2;

// A petal is drawn whole in its shaded tone, then its left half again in its lit tone
type Shape = readonly [whole: string, litHalf: string];
const ROUND: Shape = ['M0 0C-10 -4 -12 -20 0 -26C12 -20 10 -4 0 0Z', 'M0 0C-10 -4 -12 -20 0 -26Z'];
const NARROW: Shape = ['M0 0C-4 -6 -5 -21 0 -26C5 -21 4 -6 0 0Z', 'M0 0C-4 -6 -5 -21 0 -26Z'];
const POINTED: Shape = ['M0 0C-8 -6 -8 -20 0 -30C8 -20 8 -6 0 0Z', 'M0 0C-8 -6 -8 -20 0 -30Z'];
const NOTCHED: Shape = [
  'M0 -1C-7 -6 -9 -19 -6 -25L-2.5 -22L0 -26.5L2.5 -22L6 -25C9 -19 7 -6 0 -1Z',
  'M0 -1C-7 -6 -9 -19 -6 -25L-2.5 -22L0 -26.5Z',
];
const FRILL: Shape = [
  'M0 0L-13 -17L-11 -21L-8 -18.5L-5 -23L-2 -19.5L0 -24L2 -19.5L5 -23L8 -18.5L11 -21L13 -17Z',
  'M0 0L-13 -17L-11 -21L-8 -18.5L-5 -23L-2 -19.5L0 -24Z',
];

function Petal({ shape, lit, shade, s = 1 }: { shape: Shape; lit: string; shade: string; s?: number }) {
  return (
    <g transform={s === 1 ? undefined : `scale(${s})`}>
      <path d={shape[0]} className={shade} />
      <path d={shape[1]} className={lit} />
    </g>
  );
}

// n copies of something, turned evenly around the center
function Around({ n, offset = 0, children }: { n: number; offset?: number; children: ReactNode }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <g key={i} transform={`rotate(${offset + (i * 360) / n})`}>
          {children}
        </g>
      ))}
    </>
  );
}

const line = (className: string, width = FINE) => ({ className: `fill-none ${className}`, strokeWidth: width, strokeLinecap: 'round' as const });

function GardenRose() {
  return (
    <>
      <Around n={5}><Petal shape={ROUND} lit="fill-rose-500" shade="fill-rose-700" /></Around>
      <Around n={5} offset={36}><Petal shape={ROUND} s={0.72} lit="fill-rose-400" shade="fill-rose-600" /></Around>
      <circle r={9.5} className="fill-rose-600" />
      <circle r={6.5} cx={-1} cy={-1} className="fill-rose-500" />
      <path d="M-1 -1C3 -5 7 1 2 4.5C-3 7.5 -7.5 2 -4.5 -3C-1.5 -7.5 6 -7.5 7.5 -2.5" {...line('stroke-rose-800')} />
    </>
  );
}

function Peony() {
  return (
    <>
      <Around n={7}><Petal shape={ROUND} s={1.04} lit="fill-rose-200" shade="fill-rose-300" /></Around>
      <Around n={7} offset={25}><Petal shape={ROUND} s={0.74} lit="fill-rose-100" shade="fill-rose-200" /></Around>
      <Around n={5} offset={10}><Petal shape={ROUND} s={0.42} lit="fill-rose-200" shade="fill-rose-300" /></Around>
      <Around n={6} offset={15}><circle cy={-5} r={1.3} className="fill-amber-300" /></Around>
    </>
  );
}

function Ranunculus() {
  return (
    <>
      <Around n={10}><Petal shape={ROUND} lit="fill-rose-300" shade="fill-rose-400" /></Around>
      <Around n={9} offset={18}><Petal shape={ROUND} s={0.78} lit="fill-rose-200" shade="fill-rose-300" /></Around>
      <Around n={8} offset={7}><Petal shape={ROUND} s={0.56} lit="fill-rose-100" shade="fill-rose-200" /></Around>
      <Around n={7} offset={25}><Petal shape={ROUND} s={0.34} lit="fill-rose-50" shade="fill-rose-100" /></Around>
      {/* the green eye at the heart of a ranunculus */}
      <circle r={3.2} className="fill-emerald-800" />
      <circle r={1.6} cx={-0.6} cy={-0.6} className="fill-emerald-600" />
    </>
  );
}

function Tulip() {
  return (
    <>
      <path d="M-14 2C-16 -14 -10 -26 0 -28C10 -26 16 -14 14 2C8 10 -8 10 -14 2Z" className="fill-rose-800" />
      <path d="M-15 -4C-14 -20 -6 -27 -1 -26C2 -16 2 -2 0 9C-8 9 -15 5 -15 -4Z" className="fill-rose-500" />
      <path d="M15 -4C14 -20 6 -27 1 -26C-2 -16 -2 -2 0 9C8 9 15 5 15 -4Z" className="fill-rose-600" />
      <path d="M-7 4C-9 -6 -8 -16 -5 -22" {...line('stroke-rose-400')} />
      <path d="M7 4C9 -6 8 -16 5 -22" {...line('stroke-rose-700')} />
    </>
  );
}

function Anemone() {
  return (
    <>
      <Around n={6}><Petal shape={ROUND} s={1.02} lit="fill-neutral-50" shade="fill-neutral-200" /></Around>
      <Around n={6}><path d="M0 -11L0 -20" {...line('stroke-neutral-300')} /></Around>
      <circle r={9} className="fill-neutral-900" />
      <Around n={16}><circle cy={-11.5} r={1.3} className="fill-neutral-800" /></Around>
      <circle r={4.5} className="fill-neutral-700" />
      <circle r={2} cx={-1} cy={-1} className="fill-neutral-600" />
    </>
  );
}

function Cosmos() {
  return (
    <>
      <Around n={8} offset={22.5}><Petal shape={NOTCHED} lit="fill-rose-300" shade="fill-rose-400" /></Around>
      <Around n={8} offset={22.5}><path d="M0 -7L0 -19" {...line('stroke-rose-500')} /></Around>
      <circle r={6.5} className="fill-amber-500" />
      <Around n={8}><circle cy={-4.2} r={1.1} className="fill-amber-300" /></Around>
      <circle r={2.6} className="fill-amber-700" />
    </>
  );
}

function Daisy() {
  return (
    <>
      <Around n={18}><Petal shape={NARROW} lit="fill-neutral-50" shade="fill-neutral-300" /></Around>
      <circle r={7.5} className="fill-amber-500" />
      <circle r={5.5} cx={-1.2} cy={-1.2} className="fill-amber-400" />
      {[[2, 1], [-1, 3], [3, -2], [-2.5, -0.5], [0.5, -3]].map(([x, y]) => (
        <circle key={`${x},${y}`} cx={x} cy={y} r={0.8} className="fill-amber-700" />
      ))}
    </>
  );
}

function Carnation() {
  return (
    <>
      <Around n={7}><Petal shape={FRILL} lit="fill-rose-400" shade="fill-rose-600" /></Around>
      <Around n={6} offset={26}><Petal shape={FRILL} s={0.7} lit="fill-rose-300" shade="fill-rose-500" /></Around>
      <Around n={5} offset={9}><Petal shape={FRILL} s={0.42} lit="fill-rose-200" shade="fill-rose-400" /></Around>
      <Around n={5} offset={45}><path d="M0 -2L0 -7" {...line('stroke-rose-700')} /></Around>
    </>
  );
}

// One sweet pea blossom: the round standard petal, the two wings and the keel under them
function PeaBlossom({ x, y, s, r }: { x: number; y: number; s: number; r: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <path d="M0 2C-13 0 -13 -16 0 -17C13 -16 13 0 0 2Z" className="fill-rose-400" />
      <path d="M0 2C-13 0 -13 -16 0 -17Z" className="fill-rose-300" />
      <path d="M-7 -6C-3 -9 3 -9 7 -6" {...line('stroke-rose-500')} />
      <ellipse cx={-5} cy={2} rx={5} ry={3.6} className="fill-rose-500" />
      <ellipse cx={5} cy={2} rx={5} ry={3.6} className="fill-rose-600" />
      <ellipse cy={4} rx={2.4} ry={2.6} className="fill-rose-700" />
    </g>
  );
}

function SweetPea() {
  return (
    <>
      <path d="M0 12C2 -4 -3 -20 1 -38" {...line('stroke-emerald-800', STEM)} />
      <path d="M1 -38C4 -42 8 -40 7 -36C6 -33 3 -34 4 -36" {...line('stroke-emerald-600')} />
      <PeaBlossom x={2} y={-2} s={1} r={-8} />
      <PeaBlossom x={-3} y={-18} s={0.85} r={10} />
      <PeaBlossom x={2} y={-31} s={0.68} r={-6} />
    </>
  );
}

function Lily() {
  return (
    <>
      <Around n={3}><Petal shape={POINTED} lit="fill-neutral-100" shade="fill-neutral-300" /></Around>
      <Around n={3} offset={60}><Petal shape={POINTED} lit="fill-white" shade="fill-amber-100" /></Around>
      <Around n={6}><path d="M0 -4L0 -22" {...line('stroke-rose-300')} /></Around>
      {/* freckles on the front petals */}
      <Around n={3} offset={60}>
        {[[-2, -10], [2, -13], [-1.5, -16], [1.5, -8]].map(([x, y]) => (
          <circle key={`${x},${y}`} cx={x} cy={y} r={0.9} className="fill-rose-500" />
        ))}
      </Around>
      <Around n={5} offset={15}>
        <path d="M0 -2L0 -15" {...line('stroke-emerald-700')} />
        <ellipse cy={-16} rx={1.5} ry={2.6} className="fill-amber-600" />
      </Around>
      <circle r={2.4} className="fill-emerald-700" />
    </>
  );
}

// One snapdragon floret: the hooded upper lip, the lower lip, and the pale throat between them
function Floret({ x, y, s, flip }: { x: number; y: number; s: number; flip: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <path d="M-8 0C-9 -8 -3 -11 0 -9C3 -11 9 -8 8 0Z" className="fill-rose-400" />
      <path d="M-8 0C-9 -8 -3 -11 0 -9L0 0Z" className="fill-rose-300" />
      <ellipse cy={2} rx={6.5} ry={3.6} className="fill-rose-500" />
      <ellipse cy={0.5} rx={2.6} ry={1.4} className="fill-amber-200" />
    </g>
  );
}

function Snapdragon() {
  return (
    <>
      <path d="M0 14C1 -6 -1 -26 0 -44" {...line('stroke-emerald-800', STEM)} />
      <ellipse cy={-45} rx={2.2} ry={4} className="fill-emerald-700" />
      <ellipse cx={0.6} cy={-46} rx={1.1} ry={2.4} className="fill-rose-300" />
      <Floret x={-3} y={6} s={1} flip={false} />
      <Floret x={3} y={-6} s={0.9} flip />
      <Floret x={-3} y={-17} s={0.8} flip={false} />
      <Floret x={2.5} y={-27} s={0.66} flip />
      <Floret x={-1.5} y={-36} s={0.52} flip={false} />
    </>
  );
}

const BREATH = [[-15, -20], [-7, -28], [3, -27], [12, -19], [17, -8], [-18, -8], [-9, -14], [7, -13], [0, -35], [-3, -6], [10, -30], [-13, -32]];

function BabysBreath() {
  return (
    <>
      {BREATH.map(([x, y]) => (
        <path key={`b${x},${y}`} d={`M0 12Q${x * 0.3} -2 ${x} ${y}`} {...line('stroke-emerald-700')} />
      ))}
      {BREATH.map(([x, y]) => (
        <g key={`f${x},${y}`}>
          <circle cx={x - 2.5} cy={y + 3} r={1.6} className="fill-neutral-200" />
          <circle cx={x} cy={y} r={2.6} className="fill-neutral-300" />
          <circle cx={x - 0.5} cy={y - 0.5} r={1.8} className="fill-neutral-50" />
        </g>
      ))}
    </>
  );
}

const BLOOMS: Record<FlowerId, () => ReactNode> = {
  'garden-rose': GardenRose,
  peony: Peony,
  ranunculus: Ranunculus,
  tulip: Tulip,
  anemone: Anemone,
  cosmos: Cosmos,
  daisy: Daisy,
  carnation: Carnation,
  'sweet-pea': SweetPea,
  lily: Lily,
  snapdragon: Snapdragon,
  'babys-breath': BabysBreath,
};

export function Bloom({ id }: { id: FlowerId }) {
  const Art = BLOOMS[id];
  return <Art />;
}

// Each flower framed on its own (square, so every tile shows its flower at the same size)
const BOX: Partial<Record<FlowerId, string>> = {
  tulip: '-24 -34 48 48',
  'sweet-pea': '-29 -46 58 58',
  snapdragon: '-32 -50 64 64',
  'babys-breath': '-27 -40 54 54',
};

export function FlowerIcon({ id, className = '' }: { id: FlowerId; className?: string }) {
  return (
    <svg viewBox={BOX[id] ?? '-30 -30 60 60'} className={className} aria-hidden>
      <Bloom id={id} />
    </svg>
  );
}

function Eucalyptus() {
  const leaves = [[-7, -16, 6.5], [7, -27, 6], [-6.5, -38, 5.6], [6, -49, 5], [-5, -59, 4.4], [4.5, -68, 3.8], [0, -77, 3.2]];
  return (
    <>
      <path d="M0 0C2 -26 -3 -52 0 -78" {...line('stroke-emerald-800', STEM)} />
      {leaves.map(([x, y, r]) => (
        <g key={y}>
          <circle cx={x} cy={y} r={r} className="fill-emerald-800" />
          <circle cx={x - r * 0.25} cy={y - r * 0.25} r={r * 0.68} className="fill-emerald-700" />
        </g>
      ))}
    </>
  );
}

function Fern() {
  const pairs = Array.from({ length: 9 }, (_, k) => ({ y: -8 - k * 8.5, l: 15 - k * 1.3 }));
  return (
    <>
      <path d="M0 0C1 -28 -2 -54 0 -80" {...line('stroke-emerald-800', STEM)} />
      {pairs.map(({ y, l }) => {
        const leaf = `M0 0Q${l / 2} -3.2 ${l} -1Q${l / 2} 2.6 0 0Z`;
        return (
          <g key={y} transform={`translate(0 ${y})`}>
            <path d={leaf} transform="rotate(-28)" className="fill-emerald-800" />
            <path d={leaf} transform="scale(-1 1) rotate(-28)" className="fill-emerald-700" />
          </g>
        );
      })}
      <ellipse cy={-82} rx={2} ry={4} className="fill-emerald-700" />
    </>
  );
}

export function Sprig({ kind }: { kind: SprigKind }) {
  return kind === 'fern' ? <Fern /> : <Eucalyptus />;
}
