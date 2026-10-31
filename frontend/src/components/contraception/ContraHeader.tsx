import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Badge, Chip, deleteButton, focusRing, keepButton, primaryButton, secondaryButton, toggleRow, toggleRowOff, toggleRowOn } from '../Card';
import { HeaderShell } from '../cycle/CycleHeader';
import { useAction } from '../../hooks/useAction';
import { useOffline } from '../../hooks/useOffline';
import type { Who } from '../../hooks/useCycle';
import type { EventKind, Method, Model } from '../../lib/contraception';

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

export function ContraHeader({ model, method, mine, partnerName, aside, todayIso, onLog, onChange, onShare, onStop }: {
  model: Model;
  method: Method;
  mine: boolean;
  partnerName: string;
  aside?: ReactNode;
  todayIso: string;
  onLog?: (kind: EventKind, day: string) => Promise<void>;
  onChange?: () => void;
  onShare?: (shared: boolean) => Promise<void>;
  onStop?: () => Promise<void>;
}) {
  const offline = useOffline();
  const { busy, run, spin, alert } = useAction();
  const [stopping, setStopping] = useState(false);
  const fam = method.method === 'fertility_awareness';

  return (
    <HeaderShell
      title={mine ? 'Your contraception' : <><span className="text-rose-400">{partnerName}</span>'s contraception</>}
      subtitle={<span className="tabular-nums">{model.line}</span>}
      aside={aside ?? (model.badge && <Badge tone={model.badge.tone}>{model.badge.text}</Badge>)}
    >
      <div className="mt-6 pt-6 border-t border-neutral-800">
        {aside && model.badge && <div className="mb-3"><Badge tone={model.badge.tone}>{model.badge.text}</Badge></div>}
        <p className="text-neutral-200">{model.sentence}</p>
        {mine && model.hint && <p className="text-sm text-neutral-400 mt-1">{model.hint}</p>}
        {fam && (
          <Link to="/cycle" className={`${textAction} mt-3`}>
            Open the cycle tracker
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden />
          </Link>
        )}
        {mine && (
          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            {model.action && onLog && (
              <button type="button" onClick={run('log', () => onLog(model.action!.kind, todayIso))} disabled={!!busy || offline} className={primaryButton}>
                {spin('log')}
                {model.action.label}
              </button>
            )}
            <button type="button" onClick={onChange} className={secondaryButton}>Change method</button>
          </div>
        )}
        {alert}
      </div>

      {mine && onShare && onStop && (
        <div className="mt-6 pt-6 border-t border-neutral-800 space-y-3">
          <button
            type="button"
            role="switch"
            aria-checked={method.shared}
            disabled={!!busy || offline}
            onClick={run('share', () => onShare(!method.shared))}
            className={`${toggleRow} ${method.shared ? toggleRowOn : toggleRowOff} flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4 disabled:opacity-50`}
          >
            <span className="min-w-0">
              <span className={`block font-semibold text-white ${method.shared ? '' : 'group-hover:text-rose-400'} transition`}>Share with {partnerName}</span>
              <span className="block text-sm text-neutral-400 mt-1">
                {partnerName} sees your method, today's status and the dates to keep in mind. Never your history or emergency contraception.
              </span>
            </span>
            <span className="flex items-center gap-2 shrink-0">
              {spin('share')}
              <Badge tone={method.shared ? 'rose' : 'neutral'}>{method.shared ? `Shared with ${partnerName}` : 'Only you'}</Badge>
            </span>
          </button>
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
            <button type="button" onClick={() => setStopping(true)} className={textAction}>Stop tracking</button>
          )}
        </div>
      )}
    </HeaderShell>
  );
}
