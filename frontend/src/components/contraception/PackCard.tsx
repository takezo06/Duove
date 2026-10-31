import { useState } from 'react';
import { CalendarRange, Pill } from 'lucide-react';
import { CardHeader, focusRing, iconClass, secondaryButton, surface } from '../Card';
import { useAction } from '../../hooks/useAction';
import { useOffline } from '../../hooks/useOffline';
import { dayLabel, type Cell, type CellState, type ContraEvent, type EventKind, type Model } from '../../lib/contraception';

// The pack as the object itself: round cells like a blister strip. Taken is a rose fill, missed a rose ring,
// not logged a light outline, the break a quiet fill. Today has a white ring.
const look: Record<CellState, string> = {
  done: 'bg-rose-500 border-rose-500 text-white',
  missed: 'border-2 border-rose-400 text-rose-300',
  unlogged: 'border border-neutral-500 text-neutral-200',
  worn: 'bg-neutral-700 border-neutral-700 text-neutral-200',
  break: 'bg-neutral-800 border-neutral-800 text-neutral-400',
  upcoming: 'border border-neutral-800 text-neutral-400',
};
const words: Record<CellState, string> = { done: 'Done', missed: 'Missed', unlogged: 'Not logged', worn: 'Worn', break: 'Break', upcoming: 'Coming up' };
const pillWords: Partial<Record<CellState, string>> = { done: 'Taken' };
const stepWord: Partial<Record<EventKind, string>> = { taken: 'Pill', changed: 'Patch change', removed: 'Patch off', ring_in: 'Ring in', ring_out: 'Ring out' };

function Swatch({ state }: { state: CellState }) {
  return <span aria-hidden className={`w-3.5 h-3.5 rounded-full border ${look[state]}`} />;
}

export function PackCard({ model, events, methodId, editable, onLog, onRemove }: {
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
  const pack = model.pack;
  const track = model.track;
  if (!pack && !track && !model.stats) return null;
  const pill = pack?.cells.some((c) => c.step === 'taken');
  const name = (s: CellState) => (pill && pillWords[s]) || words[s];
  const cell = pack?.cells.find((c) => c.date === picked && c.step);
  // What's logged on the picked day, so it can be cleared
  const logged = cell && events.find((e) => e.method_id === methodId && e.on_date === cell.date && (pill ? e.kind === 'taken' || e.kind === 'missed' : e.kind === cell.step));
  // The figures for this pack or stretch, under what they count
  const stats = model.stats && (
        <div className={pack || track ? 'mt-5 pt-4 border-t border-neutral-800' : 'mt-4'}>
          {(pack || track) && <p className="text-sm text-neutral-400">{model.stats.label}</p>}
          <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
            <span className="text-2xl font-bold text-white tabular-nums">{model.stats.value}</span>
            <span className="text-sm text-neutral-400 tabular-nums">{model.stats.sub}</span>
          </p>
        </div>
      );
  const ariaOf = (c: Cell) => `Day ${c.n}, ${dayLabel(c.date)}${c.today ? ', today' : ''}: ${c.step ? `${stepWord[c.step]}, ` : ''}${name(c.state).toLowerCase()}`;

  return (
    <section className={`${surface} p-6`}>
      <CardHeader
        icon={pack ? <Pill className={iconClass} aria-hidden /> : <CalendarRange className={iconClass} aria-hidden />}
        title={pack ? pack.title : track ? 'Timeline' : model.stats!.label}
        badge={pack && <span className="text-sm text-neutral-400 tabular-nums whitespace-nowrap">{pack.caption}</span>}
      />

      {pack && (
        <>
          {/* Each cell is a 40px-tall tap area holding the circle: 32px on phones, where seven don't fit at 40 */}
          <ol className="mt-5 grid grid-cols-7 gap-y-1 sm:gap-2 max-w-sm" aria-label={pack.title}>
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
          <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-neutral-400">
            {pack.legend.map((s) => (
              <li key={s} className="flex items-center gap-1.5"><Swatch state={s} />{name(s)}</li>
            ))}
            <li className="flex items-center gap-1.5"><span aria-hidden className="w-3.5 h-3.5 rounded-full ring-2 ring-white ring-offset-1 ring-offset-neutral-900" />Today</li>
          </ul>
          {stats}

          {editable && (
            <div className="mt-5 pt-4 border-t border-neutral-800" aria-live="polite">
              {cell ? (
                <>
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
                </>
              ) : (
                <p className="text-sm text-neutral-400">Tap a past day to fix what's logged for it.</p>
              )}
            </div>
          )}
        </>
      )}

      {track && (
        <div className="mt-5">
          <div role="progressbar" aria-label={track.aria} aria-valuenow={Math.round(track.pct * 100)} aria-valuemin={0} aria-valuemax={100} className="flex gap-0.5 h-2">
            <div className="h-full flex-[13] rounded-full bg-neutral-800 overflow-hidden">
              <div className="h-full rounded-full bg-rose-500" style={{ width: `${track.pct * 100}%` }} />
            </div>
            {track.grace && (
              <div className="h-full flex-[2] rounded-full bg-neutral-800 overflow-hidden" title="Grace period">
                <div className="h-full rounded-full bg-rose-300" style={{ width: `${track.grace.pct * 100}%` }} />
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-neutral-400">
            <span>{track.fromLabel}</span>
            <span className="text-white font-medium">{track.toLabel}</span>
          </div>
          {track.grace && <p className="mt-1 text-xs text-neutral-400 text-right">Grace until {dayLabel(track.grace.to)}</p>}
        </div>
      )}

      {!pack && stats}
    </section>
  );
}
