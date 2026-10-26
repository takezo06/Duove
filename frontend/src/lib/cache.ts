// Data several pages show, kept in memory and localStorage so a page paints it at once
// and refetches it quietly. Keys start with the user id; sign-out clears everything.
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

const PREFIX = 'duove:';
const mem = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();
const listeners = new Map<string, Set<() => void>>();
// Bumped on clear, so a request that started before sign-out can't write the old user's data back
let generation = 0;

export function peek<T>(key: string): T | undefined {
  if (mem.has(key)) return mem.get(key) as T;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw !== null) {
      const value = JSON.parse(raw);
      mem.set(key, value);
      return value;
    }
  } catch { /* storage blocked or bad JSON: memory only */ }
  return undefined;
}

export function put<T>(key: string, value: T) {
  mem.set(key, value);
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* memory only */ }
  listeners.get(key)?.forEach((l) => l());
}

// One request per key at a time: whoever asks while it's in flight shares it.
// `fresh` starts a new one (after a change) and the older answer is dropped.
export function load<T>(key: string, fetch: () => Promise<T>, fresh = false): Promise<T> {
  const running = inflight.get(key) as Promise<T> | undefined;
  if (running && !fresh) return running;
  const gen = generation;
  const p: Promise<T> = fetch()
    .then((value) => {
      if (gen === generation && inflight.get(key) === p) put(key, value);
      return value;
    })
    .finally(() => { if (inflight.get(key) === p) inflight.delete(key); });
  inflight.set(key, p);
  return p;
}

export function clearCache() {
  generation++;
  mem.clear();
  inflight.clear();
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k));
  } catch { /* nothing stored */ }
  listeners.forEach((set) => set.forEach((l) => l()));
}

// The cached value at once (undefined if never loaded), then the fresh one from `fetch`.
// A null key waits. `fetch` must be stable (module level or useCallback), or it refetches every render.
export function useCached<T>(key: string | null, fetch: () => Promise<T>) {
  const subscribe = useCallback((onChange: () => void) => {
    if (!key) return () => {};
    const set = listeners.get(key) ?? new Set();
    listeners.set(key, set);
    set.add(onChange);
    return () => { set.delete(onChange); };
  }, [key]);
  const data = useSyncExternalStore(subscribe, () => (key ? peek<T>(key) : undefined));
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!key) return;
    load(key, fetch).then(() => setError(null), setError);
  }, [key, fetch]);

  // Refetch now (after a change, or Try again); resolves once the fresh value is in
  const reload = useCallback(async () => {
    if (key) await load(key, fetch, true).then(() => setError(null), setError);
  }, [key, fetch]);
  // Takes a value or an updater; an updater that returns undefined (nothing loaded yet) changes nothing
  const set = useCallback((next: T | ((prev: T | undefined) => T | undefined)) => {
    if (!key) return;
    const value = typeof next === 'function' ? (next as (prev: T | undefined) => T | undefined)(peek<T>(key)) : next;
    if (value !== undefined) put(key, value);
  }, [key]);
  return { data, error, reload, set };
}
