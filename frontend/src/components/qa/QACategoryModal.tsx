import { useState } from 'react';
import { Loader2, Shuffle } from 'lucide-react';
import { Badge, Modal, iconClass, toggleRow, toggleRowOff, toggleRowOn } from '../Card';
import { topicIcon, topicName, type Topic } from '../../lib/qaTopics';

interface QACategoryModalProps {
  topics: Topic[];
  selectedId: string | null;
  error: string;
  onSelect: (id: string | null) => Promise<void>;
  onClose: () => void;
}

// Pick the topic new questions come from. Random leaves it to chance.
export function QACategoryModal({ topics, selectedId, error, onSelect, onClose }: QACategoryModalProps) {
  // The option being saved; undefined while nothing is
  const [pending, setPending] = useState<string | null | undefined>(undefined);
  const options = [
    { id: null, name: 'Random', description: 'A different topic each day', icon: <Shuffle className={iconClass} aria-hidden /> },
    ...topics.map((t) => ({ id: t.id, name: topicName(t), description: t.description, icon: topicIcon(t.icon, iconClass) })),
  ];

  const pick = async (id: string | null) => {
    if (id === selectedId) return onClose();
    setPending(id);
    await onSelect(id);
    setPending(undefined);
  };

  return (
    <Modal label="Choose a topic" onClose={onClose}>
      <h2 className="text-xl font-bold text-white pr-10">Choose a topic</h2>
      <p className="text-sm text-neutral-400 mt-1">
        New questions come from this topic. If neither of you has answered today's yet, it changes too.
      </p>
      <div role="radiogroup" aria-label="Topic" className="mt-6 space-y-2">
        {options.map(({ id, name, description, icon }) => {
          const on = id === selectedId;
          return (
            <button
              key={id ?? 'random'}
              role="radio"
              aria-checked={on}
              onClick={() => pick(id)}
              disabled={pending !== undefined}
              className={`${toggleRow} ${on ? toggleRowOn : toggleRowOff} disabled:cursor-wait`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className={`flex items-center gap-2 font-semibold text-white transition ${on ? '' : 'group-hover:text-rose-400'}`}>
                  {pending === id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-rose-400" aria-hidden />
                  ) : (
                    icon
                  )}
                  {name}
                </span>
                {on && <Badge tone="neutral">Current</Badge>}
              </span>
              {description && <span className="block mt-1 text-sm text-neutral-400">{description}</span>}
            </button>
          );
        })}
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}
    </Modal>
  );
}
