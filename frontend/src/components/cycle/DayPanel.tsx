import { useState, type ReactNode } from 'react';
import { CalendarDays, Loader2, Pencil, Plus } from 'lucide-react';
import { Badge, CardHeader, InlineBar, deleteButton, iconClass, keepButton, secondaryButton, surface } from '../Card';
import { apiError } from '../../lib/apiError';
import type { CycleModel, Period } from '../../lib/cycle';
import type { SymptomLog } from '../../hooks/useCycle';
import { dayRange, labelOf, longDay, phaseColors, relativeDay, shortDay } from './constants';

const list = (xs: string[] | undefined) => (xs?.length ? xs.map(labelOf).join(', ') : null);

function Row({ label, children }: { label: string; children: ReactNode }) {
  if (!children) return null;
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 text-sm text-neutral-400">{label}</dt>
      <dd className="min-w-0 text-neutral-200">{children}</dd>
    </div>
  );
}

export function DayPanel({ day, todayIso, model, periods, log, logsReady, logsError, retryLogs, editable, onLog, onStart, onUpdate, onRemove }: {
  day: string;
  todayIso: string;
  model: CycleModel;
  periods: Period[];
  log: SymptomLog | undefined;
  logsReady: boolean;
  logsError: string | null;
  retryLogs: () => void;
  editable: boolean; // your own cycle, not your partner's
  onLog: () => void;
  onStart: (day: string) => Promise<void>;
  onUpdate: (id: string, patch: Partial<Omit<Period, 'id'>>) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const info = model.day(day);
  const future = day > todayIso;
  const acts = editable ? model.actions(day) : {};
  // The period this day is part of (shown only on its days, not on the days it could be extended to)
  const period = periods.find((p) => p.id === acts.remove);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      setConfirming(false);
    } catch (err) {
      setError(apiError(err, "That didn't save. Try again."));
    } finally {
      setBusy(null);
    }
  };
  const spin = (key: string) => busy === key && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />;

  const badge =
    info?.period === 'logged' ? <Badge tone="neutral">Period day {info.day}</Badge>
    : info?.period === 'predicted' ? <Badge tone="neutral">Predicted period</Badge>
    : info?.ovulation ? <Badge tone="neutral">Ovulation</Badge>
    : info?.phase === 'fertile' ? <Badge tone="neutral">Fertile</Badge>
    : undefined;

  return (
    <section aria-label="Selected day" className={`${surface} p-6`}>
      <CardHeader icon={<CalendarDays className={iconClass} aria-hidden />} title={relativeDay(day, todayIso)} badge={badge} />
      <h3 className="text-lg font-semibold text-white leading-snug mt-4">{longDay(day)}</h3>
      <p className="text-sm text-neutral-400 mt-1">
        {info ? (
          <>
            Cycle day <span className="text-white font-medium tabular-nums">{info.day}</span>
            {info.phase && ` · ${phaseColors[info.phase].label} phase`}
            {future && ' · Predicted'}
          </>
        ) : periods.length ? (
          'Before the first logged period'
        ) : (
          'No periods logged yet'
        )}
      </p>

      <dl className="mt-5 space-y-2">
        {period && (
          <Row label="Period">{period.end_date ? dayRange(period.start_date, period.end_date) : `Since ${shortDay(period.start_date)}, no end logged`}</Row>
        )}
        {!future && log && (
          <>
            <Row label="Bleeding">{log.bleeding_intensity && labelOf(log.bleeding_intensity)}</Row>
            <Row label="Symptoms">{list(log.physical_symptoms)}</Row>
            <Row label="Mood">{list(log.moods)}</Row>
            <Row label="Discharge">{log.discharge && labelOf(log.discharge)}</Row>
            <Row label="Sex drive">{log.sex_drive && labelOf(log.sex_drive)}</Row>
            <Row label="Sex">{list(log.sexual_activity)}</Row>
            <Row label="Stress">{log.lifestyle?.stress && labelOf(log.lifestyle.stress)}</Row>
            <Row label="Sleep">{log.lifestyle?.sleep_hours != null && `${log.lifestyle.sleep_hours} hours`}</Row>
            <Row label="Alcohol">{log.lifestyle?.alcohol && 'Yes'}</Row>
          </>
        )}
      </dl>
      {future ? (
        <p className="text-sm text-neutral-400">This day hasn't come yet, so it shows predictions only.</p>
      ) : logsError ? (
        <div>
          <p role="alert" className="text-sm text-rose-300">{logsError}</p>
          <button onClick={retryLogs} className={`${secondaryButton} mt-3`}>Try again</button>
        </div>
      ) : !logsReady ? (
        <div className="flex flex-col gap-2" aria-busy="true"><InlineBar w="w-40" /><InlineBar w="w-28" /></div>
      ) : !log && (
        <p className="text-neutral-300">Nothing logged{editable ? '' : ' this day'}.</p>
      )}

      {editable && !future && (
        <div className="mt-6 pt-6 border-t border-neutral-800">
          {confirming && acts.remove ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <p className="text-sm text-neutral-200">Remove this period? Your daily logs stay.</p>
              <div className="flex gap-2">
                <button onClick={() => run('remove', () => onRemove(acts.remove!))} disabled={!!busy} className={deleteButton}>
                  {spin('remove')}
                  Remove
                </button>
                <button onClick={() => setConfirming(false)} disabled={!!busy} autoFocus className={keepButton}>Keep</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button onClick={onLog} disabled={!logsReady} className={secondaryButton}>
                {log ? <Pencil className="w-4 h-4" aria-hidden /> : <Plus className="w-4 h-4" aria-hidden />}
                {log ? 'Edit log' : 'Log this day'}
              </button>
              {acts.start && (
                <button
                  onClick={() => run('start', () => (acts.start === 'new' ? onStart(day) : onUpdate(acts.start!, { start_date: day })))}
                  disabled={!!busy}
                  className={secondaryButton}
                >
                  {spin('start')}
                  Period started this day
                </button>
              )}
              {acts.end && (
                <button onClick={() => run('end', () => onUpdate(acts.end!, { end_date: day }))} disabled={!!busy} className={secondaryButton}>
                  {spin('end')}
                  Period ended this day
                </button>
              )}
              {acts.remove && (
                <button onClick={() => setConfirming(true)} disabled={!!busy} className={secondaryButton}>
                  Remove this period
                </button>
              )}
            </div>
          )}
          {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
        </div>
      )}
    </section>
  );
}
