import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Badge, Chip, focusRing, inset, primaryButton, secondaryButton, surface } from '../Card';
import { useAction } from '../../hooks/useAction';
import { useOffline } from '../../hooks/useOffline';
import type { Who } from '../../hooks/useCycle';
import { daysBetween, parseDay } from '../../lib/cycle';
import { dayLabel, type Cell, type CellState, type ContraEvent, type EventKind, type Method, type Model } from '../../lib/contraception';

const textAction = `group inline-flex items-center gap-2 text-sm font-medium text-neutral-400 hover:text-rose-400 transition rounded ${focusRing}`;

export function BackToCycle() {
  return (
    <Link to="/cycle" className={textAction}>
      <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 motion-reduce:transform-none" aria-hidden />
      Cycle tracker
    </Link>
  );
}

// Whose method to show, when both of you track a cycle
export function WhoChips({ who, options, partnerName, setWho }: { who: Who; options: Who[]; partnerName: string; setWho: (w: Who) => void }) {
  if (options.length < 2) return null;
  return (
    <div role="radiogroup" aria-label="Whose contraception" className="flex gap-2">
      {options.map((o) => (
        <Chip key={o} role="radio" aria-checked={who === o} active={who === o} onClick={() => setWho(o)}>
          {o === 'me' ? 'You' : partnerName}
        </Chip>
      ))}
    </div>
  );
}

// The pack drawn like the real thing: a plate of round cells, a row per week, the weekday printed over
// each column as real packs do. Taken is a rose fill, missed a rose ring, not logged a light outline,
// worn (patch or ring days) a mid fill, the break a quiet fill, and today a white ring.
const look: Record<CellState, string> = {
  done: 'bg-rose-500 border-rose-500 text-white',
  missed: 'border-2 border-rose-400 text-rose-300',
  unlogged: 'border border-neutral-500 text-neutral-200',
  worn: 'bg-neutral-700 border-neutral-700 text-neutral-200',
  break: 'bg-neutral-800 border-neutral-800 text-neutral-400',
  upcoming: 'border border-neutral-700 text-neutral-400',
};
const words: Record<CellState, string> = { done: 'Done', missed: 'Missed', unlogged: 'Not logged', worn: 'Worn', break: 'Break', upcoming: 'Coming up' };
const pillWords: Partial<Record<CellState, string>> = { done: 'Taken' };
const stepWord: Partial<Record<EventKind, string>> = { taken: 'Pill', changed: 'Patch change', removed: 'Patch off', ring_in: 'Ring in', ring_out: 'Ring out' };
const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' });

function PackObject({ model, events, methodId, editable, onLog, onRemove }: {
  model: Model;
  events: ContraEvent[];
  methodId: string;
  editable: boolean;
  onLog: (kind: EventKind, day: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const offline = useOffline();
  const { busy, run, spin, alert } = useAction();
  const [picked, setPicked] = useState<string | null>(null);
  const pack = model.pack!;
  const pill = pack.cells.some((c) => c.step === 'taken');
  const name = (s: CellState) => (pill && pillWords[s]) || words[s];
  const cell = pack.cells.find((c) => c.date === picked && c.step);
  // What's logged on the picked day, so it can be cleared
  const logged = cell && events.find((e) => e.method_id === methodId && e.on_date === cell.date && (pill ? e.kind === 'taken' || e.kind === 'missed' : e.kind === cell.step));
  const ariaOf = (c: Cell) => `Day ${c.n}, ${dayLabel(c.date)}${c.today ? ', today' : ''}: ${c.step ? `${stepWord[c.step]}, ` : ''}${name(c.state).toLowerCase()}`;

  return (
    <div className="w-full lg:w-[23rem]">
      <div className={inset}>
        <div className="flex items-baseline justify-between gap-3 text-xs text-neutral-400">
          <span className="truncate">{pack.title}</span>
          <span className="tabular-nums whitespace-nowrap">{pack.caption}</span>
        </div>
        {/* The weekday over each column, from the day the pack started */}
        <div aria-hidden className="mt-3 grid grid-cols-7 text-center text-xs text-neutral-400">
          {pack.cells.slice(0, 7).map((c) => <span key={c.date}>{weekday.format(parseDay(c.date)).slice(0, 2)}</span>)}
        </div>
        {/* Each cell is a 40px-tall tap area holding the circle: 32px on phones, where seven don't fit at 40 */}
        <ol className="mt-1 grid grid-cols-7 gap-y-1 sm:gap-x-2" aria-label={pack.title}>
          {pack.cells.map((c) => {
            const circle = `w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-medium tabular-nums transition ${look[c.state]} ${
              c.date === picked ? 'ring-2 ring-rose-400 ring-offset-2 ring-offset-neutral-900' : c.today ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-900' : ''
            }`;
            return (
              <li key={c.date} className="flex justify-center">
                {editable && c.step ? (
                  <button type="button" aria-label={ariaOf(c)} aria-pressed={c.date === picked} onClick={() => setPicked(c.date === picked ? null : c.date)}
                    className={`group w-full h-10 flex items-center justify-center rounded-full cursor-pointer ${focusRing}`}>
                    <span aria-hidden className={`${circle} group-hover:border-rose-400`}>{c.n}</span>
                  </button>
                ) : (
                  <span className="h-10 flex items-center">
                    <span role="img" aria-label={ariaOf(c)} className={circle}>{c.n}</span>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-neutral-400">
        {pack.legend.map((s) => (
          <li key={s} className="flex items-center gap-1.5"><span aria-hidden className={`w-3 h-3 rounded-full border ${look[s]}`} />{name(s)}</li>
        ))}
        <li className="flex items-center gap-1.5"><span aria-hidden className="w-3 h-3 rounded-full ring-2 ring-white ring-offset-1 ring-offset-neutral-900" />Today</li>
      </ul>
      {editable && (
        <div className="mt-4" aria-live="polite">
          {cell ? (
            <div className={inset}>
              <p className="text-sm text-neutral-200">
                <span className="text-white font-medium">{dayLabel(cell.date)}</span> · {stepWord[cell.step!]} · {name(cell.state).toLowerCase()}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(pill ? (['taken', 'missed'] as EventKind[]) : [cell.step!]).map((k) => (
                  <button key={k} type="button" disabled={!!busy || offline || logged?.kind === k} onClick={run(k, () => onLog(k, cell.date))} className={secondaryButton}>
                    {spin(k)}
                    {k === 'taken' ? 'Taken' : k === 'missed' ? 'Missed' : 'Done'}
                  </button>
                ))}
                {logged && (
                  <button type="button" disabled={!!busy || offline} onClick={run('clear', () => onRemove(logged.id))} className={secondaryButton}>
                    {spin('clear')}
                    Clear
                  </button>
                )}
              </div>
              {alert}
            </div>
          ) : (
            <p className="text-sm text-neutral-400">Tap a past day to fix it.</p>
          )}
        </div>
      )}
    </div>
  );
}

// Methods with one date ahead (shot, implant, IUD, breastfeeding): how long is left, large, over its track
function span(days: number): [string, string] {
  const a = Math.abs(days);
  if (a > 730) return [String(Math.round(a / 365)), 'years'];
  if (a > 60) return [String(Math.round(a / 30.4)), 'months'];
  return [String(a), a === 1 ? 'day' : 'days'];
}
function TrackObject({ model, todayIso }: { model: Model; todayIso: string }) {
  const track = model.track!;
  const left = daysBetween(todayIso, track.to);
  const [n, unit] = span(left);
  return (
    <div className="w-full lg:w-[23rem]">
      <p className="text-sm text-neutral-400">{left >= 0 ? track.toLabel : `Past ${track.toLabel.toLowerCase()}`}</p>
      <p className="mt-2">
        <span className="text-4xl md:text-5xl font-bold text-white tabular-nums">{n}</span>{' '}
        <span className="text-2xl md:text-3xl font-semibold text-neutral-300">{unit}{left < 0 ? ' late' : ''}</span>
      </p>
      <div role="progressbar" aria-label={track.aria} aria-valuenow={Math.round(track.pct * 100)} aria-valuemin={0} aria-valuemax={100} className="mt-6 flex gap-0.5 h-2">
        <div className="h-full flex-[13] rounded-full bg-neutral-800 overflow-hidden">
          <div className="h-full rounded-full bg-rose-500" style={{ width: `${track.pct * 100}%` }} />
        </div>
        {track.grace && (
          <div className="h-full flex-[2] rounded-full bg-neutral-800 overflow-hidden">
            <div className="h-full rounded-full bg-rose-300" style={{ width: `${track.grace.pct * 100}%` }} />
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-neutral-400">
        <span>{track.fromLabel}</span>
        {track.grace && <span>Grace until {dayLabel(track.grace.to)}</span>}
      </div>
    </div>
  );
}

// Methods logged each time: the count is the object
function CountObject({ model }: { model: Model }) {
  const s = model.stats!;
  const [n, ...rest] = s.value.split(' ');
  return (
    <div className="w-full lg:w-[23rem]">
      <p className="text-sm text-neutral-400">{s.label}</p>
      <p className="mt-2">
        <span className="text-4xl md:text-5xl font-bold text-white tabular-nums">{n}</span>{' '}
        <span className="text-2xl md:text-3xl font-semibold text-neutral-300">{rest.join(' ')}</span>
      </p>
      <p className="mt-3 text-sm text-neutral-400">{s.sub}</p>
    </div>
  );
}

// The first card: what today asks of you on the left, the method's own object on the right
export function ContraHero({ model, method, mine, partnerName, todayIso, events, onLog, onRemove }: {
  model: Model;
  method: Method;
  mine: boolean;
  partnerName: string;
  todayIso: string;
  events: ContraEvent[];
  onLog: (kind: EventKind, day: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const offline = useOffline();
  const { busy, run, spin, alert } = useAction();
  const object: ReactNode = model.pack
    ? <PackObject key={method.id} model={model} events={events} methodId={method.id} editable={mine} onLog={onLog} onRemove={onRemove} />
    : model.track ? <TrackObject model={model} todayIso={todayIso} />
    : model.stats ? <CountObject model={model} />
    : null;

  return (
    <section className={`${surface} p-6 md:p-8 grid grid-cols-[minmax(0,1fr)] gap-8 lg:gap-10 ${object ? 'lg:grid-cols-[minmax(0,1fr)_auto]' : ''}`}>
      <div className="min-w-0 flex flex-col">
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          {mine ? 'Your contraception' : <><span className="text-rose-400">{partnerName}</span>'s contraception</>}
        </h1>
        <p className="text-neutral-400 mt-1 tabular-nums">{model.line}</p>
        {/* The pack's or the stretch's figures, beside the object they count */}
        {model.stats && (model.pack || model.track) && (
          <div className="mt-8">
            <p className="text-sm text-neutral-400">{model.stats.label}</p>
            <p className="text-2xl font-bold text-white tabular-nums mt-1">{model.stats.value}</p>
            <p className="text-sm text-neutral-400 mt-1 tabular-nums">{model.stats.sub}</p>
          </div>
        )}

        <div className="mt-8 lg:mt-auto lg:pt-10">
          {model.badge && <Badge tone={model.badge.tone}>{model.badge.text}</Badge>}
          <p className="mt-3 text-xl font-bold text-white leading-snug text-balance">{model.sentence}</p>
          {mine && model.hint && <p className="text-sm text-neutral-400 mt-2">{model.hint}</p>}
          {method.method === 'fertility_awareness' && (
            <Link to="/cycle" className={`${textAction} mt-4`}>
              Open the cycle tracker
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden />
            </Link>
          )}
          {mine && model.action && (
            <button type="button" onClick={run('log', () => onLog(model.action!.kind, todayIso))} disabled={!!busy || offline} className={`${primaryButton} mt-6 w-full sm:w-auto`}>
              {spin('log')}
              {model.action.label}
            </button>
          )}
          {alert}
        </div>
      </div>
      {object}
    </section>
  );
}

export function HeroSkeleton() {
  return (
    <section className={`${surface} p-6 md:p-8 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_23rem]`} aria-busy="true">
      <div>
        <div className="h-8 w-56 rounded bg-neutral-800 animate-pulse" />
        <div className="mt-3 h-4 w-44 rounded bg-neutral-800 animate-pulse" />
        <div className="mt-16 h-5 w-20 rounded-full bg-neutral-800 animate-pulse" />
        <div className="mt-3 h-6 w-64 rounded bg-neutral-800 animate-pulse" />
      </div>
      <div className="h-64 rounded-xl bg-neutral-800/60 animate-pulse" />
    </section>
  );
}

