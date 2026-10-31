import { useState } from 'react';
import { CalendarClock, CircleAlert, History as HistoryIcon, Trash2 } from 'lucide-react';
import { Badge, CardHeader, Modal, deleteButton, field, iconButton, iconClass, keepButton, primaryButton, secondaryButton, surface, toggleRow, toggleRowOff, toggleRowOn } from '../Card';
import { useAction } from '../../hooks/useAction';
import { useOffline } from '../../hooks/useOffline';
import { daysBetween, today } from '../../lib/cycle';
import {
  EC, dayLabel, eventLabel, isHormonal, longLabel, methodInfo, relativeLabel,
  type ContraEvent, type EcKind, type Method, type Model,
} from '../../lib/contraception';

// "Keep in mind": the dates that matter for this method, soonest first, and a few facts about it
export function Insights({ model, method, todayIso }: { model: Model; method: Method; todayIso: string }) {
  const facts = [...model.info.facts];
  if (isHormonal(method.method)) facts.push('Bleeding on a hormonal method is often a withdrawal bleed, so period predictions on the cycle page are rougher.');
  return (
    <section className={`${surface} p-6`}>
      <CardHeader icon={<CalendarClock className={iconClass} aria-hidden />} title="Keep in mind" />
      {model.dates.length > 0 ? (
        <ul className="mt-4 space-y-1">
          {model.dates.map((d) => {
            const n = daysBetween(todayIso, d.date);
            return (
              <li key={`${d.label}${d.date}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
                <span className="text-neutral-200">{d.label}</span>
                <span className="flex items-center gap-3">
                  <time dateTime={d.date} className="text-white font-medium tabular-nums">{n > 300 ? longLabel(d.date) : dayLabel(d.date)}</time>
                  <Badge tone={d.tone ?? (n <= 7 ? 'rose' : 'neutral')}>{relativeLabel(d.date, todayIso)}</Badge>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 text-neutral-300">No dates to watch for this method.</p>
      )}
      <div className="mt-6 pt-6 border-t border-neutral-800">
        <h3 className="text-sm font-semibold text-white">Good to know</h3>
        <ul className="mt-3 space-y-2 list-disc pl-5 marker:text-neutral-600">
          {facts.map((f) => <li key={f} className="text-neutral-200">{f}</li>)}
        </ul>
        <p className="mt-4 text-xs text-neutral-400">General information, not medical advice. Check your leaflet or ask a pharmacist or doctor.</p>
      </div>
    </section>
  );
}

// What to do when one is missed or late, with the backup window if there is one
export function MissedCard({ model, onEmergency }: { model: Model; onEmergency?: () => void }) {
  if (!model.missed) return null;
  return (
    <section className={`${surface} p-6`}>
      <CardHeader
        icon={<CircleAlert className={iconClass} aria-hidden />}
        title={model.info.group === 'daily' ? 'If you miss one' : model.info.id === 'shot' ? 'If it runs late' : 'If it comes off or out'}
        badge={model.backupUntil && <Badge tone="rose">Condoms until {dayLabel(model.backupUntil)}</Badge>}
      />
      <ul className="mt-4 space-y-3">
        {model.missed.map((line) => <li key={line} className="text-sm text-neutral-200 leading-relaxed">{line}</li>)}
      </ul>
      {onEmergency && (
        <button type="button" onClick={onEmergency} className={`${secondaryButton} mt-5`}>Log emergency contraception</button>
      )}
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
        <input id="ec-day" type="date" required max={today()} value={day} onChange={(e) => setDay(e.target.value)} className={`${field} [color-scheme:dark]`} />
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
