import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Minus, Plus, Shuffle } from 'lucide-react';
import { Chip, focusRing, iconButton, primaryButton, secondaryButton, toggleRowOn } from '../Card';
import { FLOWERS, MAX_STEMS, WRAPS, addStem, emptyBouquet, rearrange, removeStem, type Bouquet as BouquetValue, type FlowerId } from '../../lib/bouquet';
import { Bouquet } from './Bouquet';
import { FlowerIcon } from './FlowerArt';

interface BouquetBuilderProps {
  // the flowers already on the letter, if any; the builder works on a copy until you use it
  initial: BouquetValue | null;
  partnerName: string;
  // the names from the letter, for the tag
  to: string;
  from: string;
  onUse: (bouquet: BouquetValue) => void;
  onBack: () => void;
}

// The builder view inside the letter modal: the bouquet stays in view at the top while you pick
// stems and a wrap underneath, and "Use these flowers" puts it on the letter.
export function BouquetBuilder({ initial, partnerName, to, from, onUse, onBack }: BouquetBuilderProps) {
  const [bouquet, setBouquet] = useState<BouquetValue>(() => initial ?? emptyBouquet());
  // the stem just added settles in; nothing else moves
  const [settle, setSettle] = useState<number>();
  const heading = useRef<HTMLHeadingElement>(null);
  const total = bouquet.stems.length;
  const full = total >= MAX_STEMS;

  // Start at the top of the builder, with focus on its heading
  useEffect(() => {
    const el = heading.current;
    el?.focus({ preventScroll: true });
    el?.closest('[role="dialog"]')?.scrollTo({ top: 0 });
  }, []);

  const add = (id: FlowerId) => {
    if (full) return;
    setSettle(total);
    setBouquet((b) => addStem(b, id));
  };
  const remove = (id: FlowerId) => {
    setSettle(undefined);
    setBouquet((b) => removeStem(b, id));
  };

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className={`group -ml-1 px-1 min-h-10 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-400 hover:text-rose-400 transition rounded cursor-pointer ${focusRing}`}
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 motion-reduce:transform-none" aria-hidden />
        Back to your letter
      </button>
      <h2 ref={heading} tabIndex={-1} className="mt-1 text-xl font-bold text-white pr-10 focus:outline-none">
        Flowers for <span className="text-rose-400">{partnerName}</span>
      </h2>
      <p className="text-neutral-400 mt-1">Pick a few stems. Each one says something.</p>

      {/* Stays in view while the list scrolls under it, so every tap shows in the bouquet.
          The bottom border is DESIGN.md's divider and shows where the list slides under. */}
      <div className="sticky -top-6 z-10 -mx-6 mt-4 px-6 pt-4 pb-4 bg-neutral-900 border-b border-neutral-800">{/* taste-skill-ignore */}
        <Bouquet bouquet={bouquet} to={to} from={from} settle={settle} className="mx-auto h-52 sm:h-64 aspect-square" />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p aria-live="polite" className="text-sm text-neutral-400">
            {total === 0 ? (
              'Your bouquet starts with one stem.'
            ) : (
              <><span className="text-white font-medium tabular-nums">{total}</span> of {MAX_STEMS} stems</>
            )}
          </p>
          <button
            type="button"
            onClick={() => { setSettle(undefined); setBouquet(rearrange); }}
            disabled={total < 2}
            className={`${secondaryButton} shrink-0 disabled:cursor-not-allowed`}
          >
            <Shuffle className="w-4 h-4" aria-hidden />
            Rearrange
          </button>
        </div>
      </div>

      <section aria-labelledby="bouquet-flowers" className="mt-6">
        <h3 id="bouquet-flowers" className="flex items-baseline justify-between text-sm px-1 mb-2">
          <span className="font-semibold text-white">Flowers</span>
          <span className="text-neutral-400">{full ? "That's a full bouquet" : 'Tap to add'}</span>
        </h3>
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {FLOWERS.map((f) => {
            const n = bouquet.stems.filter((s) => s === f.id).length;
            return (
              <li
                key={f.id}
                className={`flex flex-col rounded-xl border transition ${
                  n > 0 ? toggleRowOn : 'bg-neutral-800/40 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => add(f.id)}
                  disabled={full}
                  aria-label={`Add ${f.one}`}
                  aria-describedby={`meaning-${f.id}`}
                  className={`group relative flex-1 w-full text-left p-3 rounded-xl cursor-pointer disabled:cursor-not-allowed ${focusRing}`}
                >
                  <Plus className="absolute top-3 right-3 w-4 h-4 text-neutral-400 group-hover:text-rose-400 group-disabled:opacity-40 transition" aria-hidden />
                  <FlowerIcon id={f.id} className="w-16 h-16" />
                  <span className="mt-2 block text-sm font-semibold text-white">{f.name}</span>
                  <span id={`meaning-${f.id}`} className="mt-0.5 block text-xs text-neutral-400 line-clamp-2">{f.meaning}</span>
                </button>
                {n > 0 && (
                  <div className="flex items-center justify-between gap-2 pl-3 pr-1 pb-1">
                    <span className="text-xs text-neutral-300">
                      <span className="text-white font-medium tabular-nums">{n}</span> picked
                    </span>
                    <button type="button" onClick={() => remove(f.id)} aria-label={`Remove ${f.one}`} className={iconButton}>
                      <Minus className="w-4 h-4" aria-hidden />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="bouquet-wrap" className="mt-6">
        <h3 id="bouquet-wrap" className="flex items-baseline justify-between text-sm px-1 mb-2">
          <span className="font-semibold text-white">Wrap</span>
        </h3>
        <div role="radiogroup" aria-labelledby="bouquet-wrap" className="flex flex-wrap gap-2">
          {WRAPS.map((w) => (
            <Chip
              key={w.id}
              type="button"
              role="radio"
              aria-checked={bouquet.wrap === w.id}
              active={bouquet.wrap === w.id}
              onClick={() => { setSettle(undefined); setBouquet((b) => ({ ...b, wrap: w.id })); }}
            >
              <span className={`w-3 h-3 rounded-full border border-neutral-600 ${w.swatch}`} aria-hidden />
              {w.name}
            </Chip>
          ))}
        </div>
      </section>

      <button type="button" onClick={() => onUse(bouquet)} disabled={total === 0} className={`${primaryButton} w-full mt-6`}>
        <Check className="w-4 h-4" aria-hidden />
        Use these flowers
      </button>
    </div>
  );
}
