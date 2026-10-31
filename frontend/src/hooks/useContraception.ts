import { useEffect, useState } from 'react';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import { apiError } from '../lib/apiError';
import { nowClock, type ContraEvent, type Details, type EcKind, type EventKind, type Method, type MethodId } from '../lib/contraception';

export interface ContraOverview {
  me: { method: Method | null; past: Method[]; events: ContraEvent[] };
  partner: { shared: boolean; method?: Method; events?: ContraEvent[] };
}

const api = import.meta.env.VITE_BACKEND_URL;
const headers = async () => ({ Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` });
const PILL_DAY: EventKind[] = ['taken', 'missed'];

// Your method and its logs, and your partner's when they share it. Never kept on the device:
// it's health data, so it loads fresh each visit.
export function useContraception() {
  // undefined = loading, null = not paired
  const [data, setData] = useState<ContraOverview | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await axios.get<ContraOverview>(`${api}/contraception/overview`, { headers: await headers() });
        if (live) setData(res.data);
      } catch (err) {
        if (!live) return;
        if (apiError(err, '') === 'No active relationship') setData(null);
        else setError(apiError(err, "Couldn't load your contraception. Try again."));
      }
    })();
    return () => { live = false; };
  }, [attempt]);

  const setMe = (change: (me: ContraOverview['me']) => ContraOverview['me']) => setData((d) => d && { ...d, me: change(d.me) });

  // The same method again only changes its details, so its logs stay with it
  const start = async (method: MethodId, details: Details, started_on: string) => {
    const current = data?.me.method;
    if (current && current.method === method) {
      const res = await axios.patch<Method>(`${api}/contraception/method/${current.id}`, { details, started_on }, { headers: await headers() });
      setMe((me) => ({ ...me, method: res.data }));
      return;
    }
    const res = await axios.post<{ method: Method }>(`${api}/contraception/method`, { method, details, started_on }, { headers: await headers() });
    setMe((me) => ({ ...me, method: res.data.method, past: current ? [{ ...current, ended_on: [current.started_on, started_on].sort()[1] }, ...me.past] : me.past }));
  };
  const update = async (patch: Partial<Pick<Method, 'shared' | 'ended_on'>>) => {
    const current = data?.me.method;
    if (!current) return;
    const res = await axios.patch<Method>(`${api}/contraception/method/${current.id}`, patch, { headers: await headers() });
    setMe((me) => (res.data.ended_on ? { ...me, method: null, past: [res.data, ...me.past] } : { ...me, method: res.data }));
  };
  const log = async (kind: EventKind, on_date: string, ec?: EcKind) => {
    const res = await axios.post<ContraEvent>(
      `${api}/contraception/events`,
      { kind, on_date, at_time: kind === 'emergency' ? null : nowClock(), detail: ec ? { ec } : null },
      { headers: await headers() },
    );
    const e = res.data;
    setMe((me) => ({
      ...me,
      // A day's pill is taken or missed, never both, and a repeated change comes back as the same log
      events: [...me.events.filter((x) => x.id !== e.id && !(PILL_DAY.includes(kind) && PILL_DAY.includes(x.kind) && x.method_id === e.method_id && x.on_date === on_date)), e]
        .sort((a, b) => a.on_date.localeCompare(b.on_date)),
    }));
  };
  const remove = async (id: string) => {
    await axios.delete(`${api}/contraception/events/${id}`, { headers: await headers() });
    setMe((me) => ({ ...me, events: me.events.filter((x) => x.id !== id) }));
  };

  return { data, error, retry: () => { setError(null); setAttempt((a) => a + 1); }, start, update, log, remove };
}
