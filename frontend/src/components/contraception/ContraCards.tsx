import { useState } from 'react';
import { BookOpen, CalendarClock, CircleAlert, History as HistoryIcon, SlidersHorizontal, Trash2 } from 'lucide-react';
import { Badge, CardHeader, Modal, deleteButton, focusRing, field, iconButton, iconClass, keepButton, primaryButton, secondaryButton, surface, toggleRow, toggleRowOff, toggleRowOn } from '../Card';
import { useAction } from '../../hooks/useAction';
import { useOffline } from '../../hooks/useOffline';
import { daysBetween, parseDay, today } from '../../lib/cycle';
import {
  BRANDS, EC, dayLabel, eventLabel, isHormonal, longLabel, methodInfo, relativeLabel,
  type ContraEvent, type EcKind, type Method, type Model,
} from '../../lib/contraception';

const leafDay = new Intl.DateTimeFormat(undefined, { day: 'numeric' });
const leafWeekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const leafMonth = new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' });
const leafMonthShort = new Intl.DateTimeFormat(undefined, { month: 'short' });

// "Coming up": the dates that matter, soonest first, as calendar leaves split by quiet dividers,
// the day of the month large like a tear-off page
export function ComingUp({ model, todayIso }: { model: Model; todayIso: string }) {
  const dates = model.dates;
  const one = dates.length === 1;
  // Columns from the count, so no leaf is left alone on a row
  const cols = dates.length === 3 ? 'md:grid-cols-3' : dates.length === 2 || dates.length === 4 ? 'sm:grid-cols-2' : dates.length > 4 ? 'sm:grid-cols-2 md:grid-cols-3' : '';
  return (
    <section className={`${surface} p-6`} aria-labelledby="coming-up">
      <CardHeader icon={<CalendarClock className={iconClass} aria-hidden />} title={<span id="coming-up">Coming up</span>} />
      {dates.length ? (
        <ol className={`mt-5 grid gap-px rounded-xl overflow-hidden bg-neutral-800 border border-neutral-800 ${cols}`}>
          {dates.map((d) => {
            const n = daysBetween(todayIso, d.date);
            const date = parseDay(d.date);
            return (
              // One date reads as a single row; several as leaves side by side
              <li key={`${d.label}${d.date}`} className={`bg-neutral-900 p-4 md:p-5 flex flex-col ${one ? 'sm:flex-row sm:items-center sm:gap-6' : ''}`}>
                <time dateTime={d.date} className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white tabular-nums">{leafDay.format(date)}</span>
                  <span className="text-sm text-neutral-400">{leafWeekday.format(date)} · {(n > 300 ? leafMonth : leafMonthShort).format(date)}</span>
                </time>
                <p className={`mt-2 text-neutral-200 leading-snug ${one ? 'sm:mt-0' : ''}`}>{d.label}</p>
                <div className={`mt-auto pt-3 ${one ? 'sm:mt-0 sm:pt-0 sm:ml-auto' : ''}`}>
                  <Badge tone={d.tone ?? (n <= 7 ? 'rose' : 'neutral')}>{relativeLabel(d.date, todayIso)}</Badge>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-4 text-neutral-300">Nothing to schedule for this method.</p>
      )}
    </section>
  );
}

// One card, two columns: what to do when one is missed (yours only) beside the facts about the method
export function GuideCard({ model, method, mine, onEmergency }: { model: Model; method: Method; mine: boolean; onEmergency: () => void }) {
  const facts = [...model.info.facts];
  if (isHormonal(method.method)) facts.push('Bleeding on a hormonal method is often a withdrawal bleed, so period predictions on the cycle page are rougher.');
  const missed = mine && model.missed;
  const missedTitle = model.info.group === 'daily' ? 'If you miss one' : model.info.id === 'shot' ? 'If it runs late' : 'If it comes off or out';
  return (
    <section className={`${surface} p-6 md:p-8 grid grid-cols-[minmax(0,1fr)] gap-8 ${missed ? 'md:grid-cols-2 md:gap-10' : ''}`}>
      {missed && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm text-neutral-400"><CircleAlert className={iconClass} aria-hidden />{missedTitle}</h2>
            {model.backupUntil && <Badge tone="rose">Condoms until {dayLabel(model.backupUntil)}</Badge>}
          </div>
          <ul className="mt-4 space-y-3">
            {model.missed!.map((line) => <li key={line} className="text-neutral-200 leading-relaxed">{line}</li>)}
          </ul>
          <button type="button" onClick={onEmergency} className={`${secondaryButton} mt-6`}>Log emergency contraception</button>
        </div>
      )}
      <div className={missed ? 'md:border-l md:border-neutral-800 md:pl-10' : ''}>
        <h2 className="flex items-center gap-2 text-sm text-neutral-400"><BookOpen className={iconClass} aria-hidden />Good to know</h2>
        <ul className={`mt-4 ${missed ? 'space-y-3' : 'md:columns-2 md:gap-10'}`}>
          {facts.map((f) => (
            <li key={f} className={`flex gap-3 text-neutral-200 leading-relaxed ${missed ? '' : 'mb-3 last:mb-0 md:last:mb-3 break-inside-avoid'}`}>
              <span aria-hidden className="mt-2.5 w-1.5 h-1.5 shrink-0 rounded-full bg-rose-400/70" />
              {f}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// The quiet controls: what you use, sharing, changing and stopping
export function SettingsCard({ method, partnerName, onChange, onShare, onStop }: {
  method: Method;
  partnerName: string;
  onChange: () => void;
  onShare: (shared: boolean) => Promise<void>;
  onStop: () => Promise<void>;
}) {
  const offline = useOffline();
  const { busy, run, spin, alert } = useAction();
  const [stopping, setStopping] = useState(false);
  const brand = method.details.brand && method.details.brand !== 'other' ? BRANDS.find((b) => b.id === method.details.brand)?.label : null;
  return (
    <section className={`${surface} p-6`}>
      <CardHeader icon={<SlidersHorizontal className={iconClass} aria-hidden />} title="Method and sharing" />
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-white">{methodInfo(method.method).label}{brand ? ` · ${brand}` : ''}</p>
          <p className="text-sm text-neutral-400 mt-1">Since {longLabel(method.started_on)}</p>
        </div>
        <button type="button" onClick={onChange} className={secondaryButton}>Change method</button>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={method.shared}
        disabled={!!busy || offline}
        onClick={run('share', () => onShare(!method.shared))}
        className={`${toggleRow} ${method.shared ? toggleRowOn : `${toggleRowOff} border-neutral-800`} mt-5 flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4 disabled:opacity-50`}
      >
        <span className="min-w-0">
          <span className={`block font-semibold text-white ${method.shared ? '' : 'group-hover:text-rose-400'} transition`}>Share with {partnerName}</span>
          <span className="block text-sm text-neutral-400 mt-1">{partnerName} sees your method, today's status and what's coming up. Never your history or emergency contraception.</span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {spin('share')}
          <Badge tone={method.shared ? 'rose' : 'neutral'}>{method.shared ? `Shared with ${partnerName}` : 'Only you'}</Badge>
        </span>
      </button>
      <div className="mt-5 pt-4 border-t border-neutral-800">
        {stopping ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-neutral-200 mr-2">Stop tracking? Your history stays saved.</p>
            <button type="button" autoFocus onClick={() => setStopping(false)} className={keepButton}>Keep</button>
            <button type="button" disabled={!!busy || offline} onClick={run('stop', onStop)} className={deleteButton}>
              {spin('stop')}
              Stop tracking
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setStopping(true)} className={`text-sm font-medium text-neutral-400 hover:text-rose-400 transition rounded cursor-pointer ${focusRing}`}>Stop tracking</button>
        )}
      </div>
      {alert}
    </section>
  );
}

export function EmergencyModal({ onSave, onClose }: { onSave: (ec: EcKind, day: string) => Promise<void>; onClose: () => void }) {
  const offline = useOffline();
  const { busy, run, spin, alert } = useAction();
  const [ec, setEc] = useState<EcKind>('levonorgestrel');
  const [day, setDay] = useState(today());
  return (
    <Modal label="Log emergency contraception" onClose={onClose}>
      <h2 className="text-xl font-bold text-white pr-8">Emergency contraception</h2>
      <p className="text-sm text-neutral-400 mt-1">Only you see this, even when you share your method.</p>
      <form className="mt-5" onSubmit={(e) => { e.preventDefault(); run('save', async () => { await onSave(ec, day); onClose(); })(); }}>
        <div role="radiogroup" aria-label="Which one" className="space-y-2">
          {EC.map((x) => (
            <button key={x.id} type="button" role="radio" aria-checked={ec === x.id} onClick={() => setEc(x.id)} className={`${toggleRow} ${ec === x.id ? toggleRowOn : toggleRowOff}`}>
              <span className="flex items-center justify-between gap-3">
                <span className="font-semibold text-white">{x.label}</span>
                {ec === x.id && <Badge tone="rose">Chosen</Badge>}
              </span>
              <span className="block text-sm text-neutral-400 mt-1">Works up to {x.hours} hours after sex{x.id === 'copper_iud' ? ', and is the most effective' : ', sooner is better'}</span>
            </button>
          ))}
        </div>
        <label htmlFor="ec-day" className="block text-sm text-neutral-400 mb-2 mt-5">Taken on</label>
        <input id="ec-day" name="ec_day" type="date" required max={today()} value={day} onChange={(e) => setDay(e.target.value)} className={`${field} [color-scheme:dark]`} />
        <p className="text-sm text-neutral-400 mt-4">Threw up within 3 hours of the pill? Ask a pharmacist about taking another.</p>
        <button type="submit" disabled={!!busy || offline} className={`${primaryButton} w-full mt-5`}>
          {spin('save')}
          Log it
        </button>
        {alert}
      </form>
    </Modal>
  );
}

// Changes, shots, uses, emergency contraception and earlier methods, newest first. Daily pills live on the pack.
export function HistoryCard({ events, past, current, todayIso, onRemove, onEmergency }: {
  events: ContraEvent[];
  past: Method[];
  current: Method;
  todayIso: string;
  onRemove: (id: string) => Promise<void>;
  onEmergency?: () => void;
}) {
  const offline = useOffline();
  const { busy, run, spin, alert } = useAction();
  const [confirm, setConfirm] = useState<string | null>(null);
  const rows = [
    ...events.filter((e) => e.kind !== 'taken').map((e) => ({ key: e.id, date: e.on_date, label: eventLabel(e), event: e })),
    { key: current.id, date: current.started_on, label: `Started: ${methodInfo(current.method).label}`, event: null },
    ...past.map((m) => ({ key: m.id, date: m.started_on, label: `${methodInfo(m.method).label}, until ${dayLabel(m.ended_on!)}`, event: null })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

  return (
    <section className={`${surface} p-6`}>
      <CardHeader icon={<HistoryIcon className={iconClass} aria-hidden />} title="History" />
      <ul className="mt-3">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center gap-3 py-2 border-b border-neutral-800 last:border-0 min-h-14">
            <div className="flex-1 min-w-0">
              <p className="text-neutral-200 truncate">{r.label}</p>
              <p className="text-xs text-neutral-400 mt-0.5"><time dateTime={r.date}>{dayLabel(r.date)}</time> · {relativeLabel(r.date, todayIso)}</p>
            </div>
            {r.event && (confirm === r.key ? (
              <span className="flex gap-1">
                <button type="button" autoFocus onClick={() => setConfirm(null)} className={keepButton}>Keep</button>
                <button type="button" disabled={!!busy || offline} onClick={run(r.key, async () => { await onRemove(r.key); setConfirm(null); })} className={deleteButton}>
                  {spin(r.key)}
                  Delete
                </button>
              </span>
            ) : (
              <button type="button" aria-label={`Delete ${r.label}`} onClick={() => setConfirm(r.key)} className={`${iconButton} hover:text-rose-400`}>
                <Trash2 className="w-4 h-4" aria-hidden />
              </button>
            ))}
          </li>
        ))}
      </ul>
      {alert}
      {onEmergency && (
        <div className="mt-4 pt-4 border-t border-neutral-800">
          <button type="button" onClick={onEmergency} className={secondaryButton}>Log emergency contraception</button>
        </div>
      )}
    </section>
  );
}
