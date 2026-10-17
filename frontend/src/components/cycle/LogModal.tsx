import { useState, type FormEvent, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Chip, Modal, field, primaryButton, secondaryButton } from '../Card';
import { apiError } from '../../lib/apiError';
import type { LogInput, SymptomLog } from '../../hooks/useCycle';
import { BLEEDING, DISCHARGE, LEVELS, MOODS, SEX, SYMPTOMS, labelOf, longDay } from './constants';

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="block text-sm text-neutral-400 mb-2">{label}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

// One of a few: tap the chosen one again to clear it
function One({ label, options, value, onChange }: { label: string; options: string[]; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <Group label={label}>
      <div role="radiogroup" aria-label={label} className="contents">
        {options.map((o) => (
          <Chip key={o} type="button" role="radio" aria-checked={value === o} active={value === o} onClick={() => onChange(value === o ? null : o)}>
            {labelOf(o)}
          </Chip>
        ))}
      </div>
    </Group>
  );
}

function Many({ label, options, value, onChange }: { label: string; options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <Group label={label}>
      {options.map((o) => (
        <Chip
          key={o}
          type="button"
          aria-pressed={value.includes(o)}
          active={value.includes(o)}
          onClick={() => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o])}
        >
          {labelOf(o)}
        </Chip>
      ))}
    </Group>
  );
}

export function LogModal({ day, isToday, existing, onSave, onClose }: {
  day: string;
  isToday: boolean;
  existing: SymptomLog | undefined;
  onSave: (input: LogInput) => Promise<void>;
  onClose: () => void;
}) {
  const [log, setLog] = useState<LogInput>(() => ({
    bleeding_intensity: existing?.bleeding_intensity ?? null,
    physical_symptoms: existing?.physical_symptoms ?? [],
    moods: existing?.moods ?? [],
    discharge: existing?.discharge ?? null,
    sex_drive: existing?.sex_drive ?? null,
    sexual_activity: existing?.sexual_activity ?? [],
    lifestyle: { sleep_hours: existing?.lifestyle?.sleep_hours ?? null, stress: existing?.lifestyle?.stress ?? null, alcohol: !!existing?.lifestyle?.alcohol },
  }));
  const [sleep, setSleep] = useState(log.lifestyle.sleep_hours == null ? '' : String(log.lifestyle.sleep_hours));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<LogInput>) => setLog((l) => ({ ...l, ...patch }));
  const setLife = (patch: LogInput['lifestyle']) => setLog((l) => ({ ...l, lifestyle: { ...l.lifestyle, ...patch } }));

  const sleepHours = sleep.trim() === '' ? null : Number(sleep);
  const sleepInvalid = sleepHours !== null && !(sleepHours >= 0 && sleepHours <= 24);
  const empty =
    !log.bleeding_intensity && !log.discharge && !log.sex_drive && !log.lifestyle.stress && !log.lifestyle.alcohol && sleepHours === null &&
    !log.physical_symptoms.length && !log.moods.length && !log.sexual_activity.length;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (sleepInvalid || (empty && !existing)) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...log, lifestyle: { ...log.lifestyle, sleep_hours: sleepHours } });
      onClose();
    } catch (err) {
      setError(apiError(err, "Your log didn't save. Try again."));
      setSaving(false);
    }
  };

  return (
    <Modal label={`Log for ${longDay(day)}`} onClose={onClose} wide>
      <form onSubmit={save}>
        <h2 className="text-xl font-bold text-white pr-10">{isToday ? 'How are you today?' : longDay(day)}</h2>
        <p className="text-sm text-neutral-400 mt-1">Pick what fits. Tap again to clear.</p>

        <div className="mt-6 space-y-5">
          <One label="Bleeding" options={BLEEDING} value={log.bleeding_intensity} onChange={(v) => set({ bleeding_intensity: v })} />
          <Many label="Symptoms" options={SYMPTOMS} value={log.physical_symptoms} onChange={(v) => set({ physical_symptoms: v })} />
          <Many label="Mood" options={MOODS} value={log.moods} onChange={(v) => set({ moods: v })} />
          <One label="Discharge" options={DISCHARGE} value={log.discharge} onChange={(v) => set({ discharge: v })} />
          <One label="Sex drive" options={LEVELS} value={log.sex_drive} onChange={(v) => set({ sex_drive: v })} />
          <Many label="Sex" options={SEX} value={log.sexual_activity} onChange={(v) => set({ sexual_activity: v })} />
          <One label="Stress" options={LEVELS} value={log.lifestyle.stress ?? null} onChange={(v) => setLife({ stress: v })} />
          <div className="grid grid-cols-2 gap-4 items-end">
            <div>
              <label htmlFor="sleep-hours" className="block text-sm text-neutral-400 mb-2">Sleep (hours)</label>
              <input
                id="sleep-hours"
                type="number"
                inputMode="decimal"
                min={0}
                max={24}
                step={0.5}
                value={sleep}
                onChange={(e) => setSleep(e.target.value)}
                placeholder="8"
                aria-invalid={sleepInvalid}
                className={field}
              />
            </div>
            <div className="pb-1.5">
              <Chip type="button" aria-pressed={!!log.lifestyle.alcohol} active={!!log.lifestyle.alcohol} onClick={() => setLife({ alcohol: !log.lifestyle.alcohol })}>
                Had alcohol
              </Chip>
            </div>
          </div>
          {sleepInvalid && <p role="alert" className="text-sm text-rose-300">Sleep is between 0 and 24 hours.</p>}
        </div>

        <div className="mt-6 pt-6 border-t border-neutral-800 flex flex-col sm:flex-row gap-3">
          <button type="submit" disabled={saving || sleepInvalid || (empty && !existing)} className={primaryButton}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
            {saving ? 'Saving...' : empty && existing ? 'Clear this day' : 'Save'}
          </button>
          <button type="button" onClick={onClose} disabled={saving} className={secondaryButton}>
            Cancel
          </button>
        </div>
        {error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}
      </form>
    </Modal>
  );
}
