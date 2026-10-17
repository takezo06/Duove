import { useEffect, useRef, type KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { focusRing, iconButton, surface } from '../Card';
import { addDays, parseDay, type CycleModel } from '../../lib/cycle';
import { shiftMonth } from './constants';
import type { SymptomLog } from '../../hooks/useCycle';

const monthTitle = (month: string) => parseDay(`${month}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
// Sunday first, in the viewer's language (2026-10-04 is a Sunday)
const WEEKDAYS = Array.from({ length: 7 }, (_, i) => parseDay(addDays('2026-10-04', i)).toLocaleDateString(undefined, { weekday: 'short' }));
const KEYS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

export function CycleCalendar({ month, setMonth, selected, onSelect, model, logs, todayIso }: {
  month: string;
  setMonth: (m: string) => void;
  selected: string;
  onSelect: (day: string, tapped?: boolean) => void;
  model: CycleModel;
  logs: Record<string, SymptomLog> | undefined;
  todayIso: string;
}) {
  const first = `${month}-01`;
  const count = new Date(+month.slice(0, 4), +month.slice(5, 7), 0).getDate();
  const days = Array.from({ length: count }, (_, i) => addDays(first, i));
  const grid = useRef<HTMLDivElement>(null);
  const keyboard = useRef(false);
  const swipeX = useRef<number | null>(null);

  // After an arrow key, keep focus on the day it moved to (possibly in the next month)
  useEffect(() => {
    if (!keyboard.current) return;
    keyboard.current = false;
    grid.current?.querySelector<HTMLButtonElement>(`[data-day="${selected}"]`)?.focus();
  }, [selected, month]);

  const go = (day: string) => {
    if (day.slice(0, 7) !== month) setMonth(day.slice(0, 7));
    onSelect(day);
  };
  const onKey = (e: KeyboardEvent, day: string) => {
    const step = KEYS[e.key];
    const target = step ? addDays(day, step) : e.key === 'Home' ? first : e.key === 'End' ? days[count - 1] : null;
    if (!target) return;
    e.preventDefault();
    keyboard.current = true;
    go(target);
  };
  const tabbable = selected.slice(0, 7) === month ? selected : first;

  return (
    <section
      aria-label="Calendar"
      // Edge to edge on phones so each day is a 40px target beside the icon rail
      className={`${surface} px-1 py-4 sm:p-4 md:p-6`}
      onTouchStart={(e) => (swipeX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - (swipeX.current ?? e.changedTouches[0].clientX);
        swipeX.current = null;
        if (Math.abs(dx) > 60) setMonth(shiftMonth(month, dx < 0 ? 1 : -1));
      }}
    >
      <div className="px-3 sm:px-0 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-white" aria-live="polite">{monthTitle(month)}</h2>
        <div className="flex items-center gap-1">
          {month !== todayIso.slice(0, 7) && (
            <button
              onClick={() => go(todayIso)}
              className={`px-3 min-h-10 rounded-lg text-sm font-medium text-neutral-400 hover:text-rose-400 transition cursor-pointer ${focusRing}`}
            >
              Today
            </button>
          )}
          <button onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month" className={iconButton}>
            <ChevronLeft className="w-5 h-5" aria-hidden />
          </button>
          <button onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month" className={iconButton}>
            <ChevronRight className="w-5 h-5" aria-hidden />
          </button>
        </div>
      </div>

      <div ref={grid} role="group" aria-label={monthTitle(month)} className="mt-4 grid grid-cols-7 gap-y-1 sm:gap-1">
        {WEEKDAYS.map((d) => (
          <div key={d} aria-hidden className="pb-1 text-center text-xs text-neutral-400">
            {d}
          </div>
        ))}
        {Array.from({ length: parseDay(first).getDay() }, (_, i) => (
          <div key={`pad${i}`} aria-hidden />
        ))}
        {days.map((day) => {
          const info = model.day(day);
          const isToday = day === todayIso;
          const isSelected = day === selected;
          const logged = !!logs?.[day];
          const label = [
            parseDay(day).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }),
            isToday && 'today',
            info?.period === 'logged' && 'period',
            info?.period === 'predicted' && 'predicted period',
            info?.ovulation ? 'predicted ovulation' : info?.phase === 'fertile' && 'fertile window',
            logged && 'logged',
          ].filter(Boolean).join(', ');
          return (
            <button
              key={day}
              data-day={day}
              aria-pressed={isSelected}
              aria-current={isToday ? 'date' : undefined}
              aria-label={label}
              tabIndex={day === tabbable ? 0 : -1}
              onClick={() => onSelect(day, true)}
              onKeyDown={(e) => onKey(e, day)}
              className={`relative h-11 md:h-12 rounded-xl border flex flex-col items-center justify-center gap-1 text-sm tabular-nums transition cursor-pointer ${focusRing} ${
                info?.period === 'logged'
                  ? 'bg-red-500/20 border-red-500/40 text-red-100'
                  : info?.period === 'predicted'
                    ? 'border-red-500/50 text-red-200'
                    : info?.ovulation
                      ? 'border-rose-300/60 text-white'
                      : isToday
                        ? 'bg-neutral-800 border-neutral-700 text-white'
                        : 'border-transparent text-neutral-300 hover:bg-neutral-800/60'
              } ${isToday ? 'font-bold' : ''} ${isSelected ? 'ring-2 ring-inset ring-rose-400' : ''}`}
            >
              {+day.slice(8)}
              <span aria-hidden className={`w-1 h-1 rounded-full ${info?.phase === 'fertile' ? 'bg-rose-300' : 'bg-transparent'}`} />
              {logged && <span aria-hidden className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-neutral-300" />}
            </button>
          );
        })}
      </div>

      <ul className="mx-3 sm:mx-0 mt-4 pt-4 border-t border-neutral-800 flex flex-wrap gap-x-4 gap-y-2 text-xs text-neutral-400">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="w-3.5 h-3.5 rounded-full bg-red-500/20 border border-red-500/40" />
          Period
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="w-3.5 h-3.5 rounded-full border border-red-500/50" />
          Predicted period
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-rose-300" />
          Fertile
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="w-3.5 h-3.5 rounded-full border border-rose-300/60" />
          Ovulation
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
          Logged
        </li>
      </ul>
    </section>
  );
}
