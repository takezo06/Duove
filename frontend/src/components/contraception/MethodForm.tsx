import { useState } from 'react';
import { Chip, field, primaryButton, secondaryButton, toggleRow, toggleRowOff, toggleRowOn, Badge } from '../Card';
import { useAction } from '../../hooks/useAction';
import { useOffline } from '../../hooks/useOffline';
import { today } from '../../lib/cycle';
import {
  BRANDS, GROUPS, METHODS, PACKS, PILLS, brandsFor, methodInfo,
  type BrandId, type Details, type Group, type Method, type MethodId, type PackId, type PillKind,
} from '../../lib/contraception';

const label = 'block text-sm text-neutral-400 mb-2';
const PILL_METHODS: MethodId[] = ['pill_combined', 'pill_progestin'];
const LONG: MethodId[] = ['implant', 'iud_hormonal', 'iud_copper'];

// What setting a method up asks, by method. The default fills in what most people use.
function defaults(method: MethodId, from?: Method): Details {
  if (from?.method === method) return from.details;
  if (method === 'pill_combined') return { pill: 'combined_mono', pack: '21_7', usual_time: '08:00' };
  if (method === 'pill_progestin') return { pill: 'pop_norethindrone', usual_time: '08:00' };
  if (method === 'shot') return { shot: 'im' };
  if (LONG.includes(method)) {
    const brand = brandsFor(method)[0];
    return { brand: brand.id, years: brand.years };
  }
  return {};
}

// Single choice as chips (role radio); `wrap` lays long labels out as rows
function Radio<T extends string>({ name, value, options, onChange, rows = false }: {
  name: string;
  value: T | undefined;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  rows?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={name} className={rows ? 'space-y-1' : 'flex flex-wrap gap-2'}>
      {options.map((o) =>
        rows ? (
          <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)} className={`${toggleRow} ${value === o.id ? toggleRowOn : toggleRowOff} flex items-center justify-between gap-3`}>
            <span className={`text-sm ${value === o.id ? 'text-white font-medium' : 'text-neutral-200'}`}>{o.label}</span>
            {value === o.id && <Badge tone="rose">Chosen</Badge>}
          </button>
        ) : (
          <Chip key={o.id} type="button" role="radio" aria-checked={value === o.id} active={value === o.id} onClick={() => onChange(o.id)}>
            {o.label}
          </Chip>
        ),
      )}
    </div>
  );
}

// Pick a group, then a method, then the few details its schedule needs
export function MethodForm({ current, onSave, onCancel }: {
  current: Method | null; // the method being changed, if any
  onSave: (method: MethodId, details: Details, started_on: string) => Promise<void>;
  onCancel?: () => void;
}) {
  const offline = useOffline();
  const { busy, run, spin, alert } = useAction();
  const [group, setGroup] = useState<Group>(current ? methodInfo(current.method).group : 'daily');
  const [method, setMethod] = useState<MethodId | null>(current?.method ?? null);
  const [details, setDetails] = useState<Details>(current ? current.details : {});
  const [start, setStart] = useState(current?.started_on ?? today());
  const set = (patch: Details) => setDetails((d) => ({ ...d, ...patch }));
  const pick = (m: MethodId) => {
    setMethod(m);
    setDetails(defaults(m, current ?? undefined));
    if (current?.method !== m) setStart(today());
  };
  const info = method && methodInfo(method);
  const same = !!current && current.method === method;

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (method) run('save', () => onSave(method, details, start))(); }}>
      <h2 className="text-lg font-semibold text-white leading-snug">{current ? 'Change your method' : 'What do you use?'}</h2>
      <p className="text-sm text-neutral-400 mt-1">Pick the one you rely on. Condoms and emergency contraception can be logged on top of any method.</p>

      <div role="radiogroup" aria-label="Kind of method" className="mt-5 flex flex-wrap gap-2">
        {GROUPS.map((g) => (
          <Chip key={g.id} type="button" role="radio" aria-checked={group === g.id} active={group === g.id} onClick={() => setGroup(g.id)}>
            {g.label}
          </Chip>
        ))}
      </div>

      <div role="radiogroup" aria-label="Method" className="mt-4 grid sm:grid-cols-2 gap-2">
        {METHODS.filter((m) => m.group === group).map((m) => {
          const on = method === m.id;
          return (
            <button key={m.id} type="button" role="radio" aria-checked={on} onClick={() => pick(m.id)} className={`${toggleRow} ${on ? toggleRowOn : `${toggleRowOff} border-neutral-800`}`}>
              <span className="flex items-center justify-between gap-3">
                <span className={`font-semibold ${on ? 'text-white' : 'text-white group-hover:text-rose-400'} transition`}>{m.label}</span>
                {on && <Badge tone="rose">Chosen</Badge>}
              </span>
              <span className="block text-sm text-neutral-400 mt-1">{m.hint}</span>
            </button>
          );
        })}
      </div>

      {info && method && (
        <div className="mt-6 pt-6 border-t border-neutral-800 space-y-5">
          {PILL_METHODS.includes(method) && (
            <div>
              <p className={label}>Which pill</p>
              <Radio name="Which pill" rows value={details.pill} onChange={(v: PillKind) => set({ pill: v })}
                options={PILLS.filter((p) => p.combined === (method === 'pill_combined'))} />
            </div>
          )}
          {method === 'pill_combined' && (
            <div>
              <p className={label}>Pack</p>
              <Radio name="Pack" rows value={details.pack} onChange={(v: PackId) => set({ pack: v })} options={PACKS} />
            </div>
          )}
          {method === 'shot' && (
            <div>
              <p className={label}>Which shot</p>
              <Radio name="Which shot" rows value={details.shot} onChange={(v) => set({ shot: v })}
                options={[{ id: 'im', label: 'Given by a clinician, in the arm or bottom' }, { id: 'subq', label: 'Under the skin, often self-injected (Sayana Press)' }]} />
            </div>
          )}
          {LONG.includes(method) && (
            <div className="grid sm:grid-cols-[minmax(0,1fr)_8rem] gap-4 items-start">
              <div>
                <p className={label}>Brand</p>
                <Radio name="Brand" rows value={details.brand}
                  onChange={(v: BrandId) => set({ brand: v, years: BRANDS.find((b) => b.id === v)?.years ?? details.years })}
                  options={[...brandsFor(method).map((b) => ({ id: b.id, label: `${b.label} · ${b.years} years` })), { id: 'other' as BrandId, label: 'Another brand' }]} />
              </div>
              <div>
                <label htmlFor="years" className={label}>Good for (years)</label>
                <input id="years" name="years" type="number" inputMode="numeric" min={1} max={12} required value={details.years ?? ''}
                  onChange={(e) => set({ years: e.target.value ? Math.max(1, Math.min(12, Math.round(+e.target.value))) : undefined })}
                  className={`${field} tabular-nums`} aria-describedby="years-hint" />
                <p id="years-hint" className="text-xs text-neutral-400 mt-2">From your clinic's card</p>
              </div>
            </div>
          )}
          {method === 'vasectomy' && (
            <Radio name="Semen test" value={details.confirmed ? 'yes' : 'no'} onChange={(v) => set({ confirmed: v === 'yes' })}
              options={[{ id: 'no', label: 'Waiting on the test' }, { id: 'yes', label: 'A test confirmed it' }]} />
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="started" className={label}>{info.starts}</label>
              <input id="started" name="started_on" type="date" required value={start} max={PILL_METHODS.includes(method) || method === 'patch' || method.startsWith('ring') ? undefined : today()}
                onChange={(e) => setStart(e.target.value)} className={`${field} [color-scheme:dark]`} />
            </div>
            {PILL_METHODS.includes(method) && (
              <div>
                <label htmlFor="usual" className={label}>Usual time</label>
                <input id="usual" name="usual_time" type="time" value={details.usual_time ?? ''} onChange={(e) => set({ usual_time: e.target.value || undefined })}
                  className={`${field} [color-scheme:dark]`} aria-describedby="usual-hint" />
                <p id="usual-hint" className="text-xs text-neutral-400 mt-2">Used to tell when a pill is late</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button type="submit" disabled={!method || !!busy || offline} className={primaryButton}>
          {spin('save')}
          {same ? 'Save changes' : current ? 'Switch method' : 'Start tracking'}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className={secondaryButton}>Cancel</button>}
      </div>
      {alert}
    </form>
  );
}
