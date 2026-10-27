import { NECK, arrange, describe, greenery, wrapOf, type Bouquet as BouquetValue } from '../../lib/bouquet';
import { Bloom, Sprig } from './FlowerArt';

interface BouquetProps {
  bouquet: BouquetValue;
  // the names on the tag; the thumbnail has no tag
  to?: string;
  from?: string;
  size?: 'full' | 'thumb';
  // the stem just added, which settles into place
  settle?: number;
  className?: string;
}

// A wrapped bouquet, drawn back to front: the back sheet, greenery, stems, blooms (back row first),
// the two front flaps, the ribbon, and the tag on its string. Drawn from the stems, wrap and seed alone,
// so it looks the same to both of you. The drawing is 240 x 300; the full size leaves room on the right
// for the tag, which is HTML so its type stays on Duove's scale.
export function Bouquet({ bouquet, to, from, size = 'full', settle, className = '' }: BouquetProps) {
  const wrap = wrapOf(bouquet.wrap);
  const placed = arrange(bouquet.stems, bouquet.seed);
  const drawOrder = [...placed].sort((a, b) => b.depth - a.depth || a.y - b.y);
  const thumb = size === 'thumb';
  const tagged = !thumb && (to || from);

  const art = (
    <svg
      viewBox={thumb ? '0 0 240 300' : '-30 0 300 300'}
      className="w-full h-full overflow-visible"
      {...(thumb ? { 'aria-hidden': true } : { role: 'img', 'aria-label': placed.length ? `Bouquet: ${describe(bouquet)}` : 'An empty bouquet wrap' })}
    >
      <path d="M120 262L22 112Q46 84 76 98Q96 64 120 80Z" className={wrap.back} />
      <path d="M120 262L120 80Q144 64 164 98Q194 84 218 112Z" className={wrap.backShade} />

      {greenery(placed.length, bouquet.seed).map((s, i) => (
        <g key={i} transform={`translate(${s.x} ${s.y}) rotate(${s.rotate}) scale(1.25)`}>
          <Sprig kind={s.kind} />
        </g>
      ))}

      {placed.map((p) => {
        const end = NECK.x + (p.x - NECK.x) * 0.1;
        return (
          <path
            key={`${p.i}-${p.id}`}
            d={`M${p.x} ${p.y}Q${p.x + (NECK.x - p.x) * 0.15} ${(p.y + NECK.y) / 2} ${end} ${NECK.y - 6}`}
            className="fill-none stroke-emerald-800"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        );
      })}

      {drawOrder.map((p) => (
        <g key={`${p.i}-${p.id}`} transform={`translate(${p.x} ${p.y}) rotate(${p.rotate}) scale(${p.scale})`}>
          {/* the settle animation moves this inner group, so it doesn't fight the placement above */}
          <g className={settle === p.i ? 'animate-settle' : undefined}>
            <Bloom id={p.id} />
          </g>
        </g>
      ))}

      <path d="M34 156L160 180L120 296Z" className={wrap.lit} />
      <path d="M34 156L160 180L158 185L35 162Z" className={wrap.lip} />
      <path d="M206 156L80 180L120 296Z" className={wrap.shade} />
      <path d="M206 156L80 180L82 185L205 162Z" className={wrap.lip} />
      <path d="M100 186L120 290" className={`fill-none ${wrap.crease}`} strokeWidth={1.2} strokeLinecap="round" />

      <path d="M94 250L146 250L143 262L97 262Z" className={wrap.ribbon} />
      <path d="M120 256C106 242 92 250 100 260C104 265 114 262 120 256Z" className={wrap.ribbon} />
      <path d="M120 256C134 242 148 250 140 260C136 265 126 262 120 256Z" className={wrap.ribbonShade} />
      <path d="M118 258L108 286L114 284L121 260Z" className={wrap.ribbonShade} />
      <path d="M122 258L134 284L128 287L119 260Z" className={wrap.ribbon} />
      <circle cx={120} cy={256} r={4} className={wrap.ribbonShade} />

      {tagged && <path d="M123 259C134 274 148 278 164 270" className="fill-none stroke-neutral-300" strokeWidth={1.2} strokeLinecap="round" />}
    </svg>
  );

  if (!tagged) return <div className={className}>{art}</div>;

  return (
    <div className={`relative ${className}`}>
      {art}
      {/* the tag hangs where the string ends: (164, 270) in the drawing, 64% across and 90% down the full view */}
      <div className="absolute left-[64%] top-[90%] max-w-28 -translate-y-1/2 -rotate-6 origin-left" aria-hidden>
        <div className="flex items-center gap-2 rounded-lg bg-neutral-200 pl-2 pr-3 py-1.5 text-xs leading-tight text-neutral-900">
          <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-neutral-900" />
          <span className="min-w-0">
            {to && <span className="block truncate font-semibold">For {to}</span>}
            {from && <span className="block truncate">from {from}</span>}
          </span>
        </div>
      </div>
    </div>
  );
}
