import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import { apiError } from '../lib/apiError';
import { addDays, isoDay, showsCycle, today, type Period } from '../lib/cycle';

export type Who = 'me' | 'partner';
export interface Person {
  name: string;
  hasPeriods: boolean | null; // their answer to "Do you have periods?", null until asked
  periods: Period[];
}
export interface Overview {
  me: Person;
  partner: Person;
}
export interface SymptomLog {
  log_date: string;
  bleeding_intensity: string | null;
  physical_symptoms: string[];
  moods: string[];
  discharge: string | null;
  sex_drive: string | null;
  sexual_activity: string[];
  lifestyle: { sleep_hours?: number | null; stress?: string | null; alcohol?: boolean };
}
export type LogInput = Omit<SymptomLog, 'log_date'>;

// Whose cycle there is to show (the rule is showsCycle in lib/cycle.ts)
export const tracks = (p: Person) => showsCycle(p.hasPeriods, p.periods.length);
// Not answered yet and not enough history to go on: ask before showing anything
export const mustAsk = (p: Person) => p.hasPeriods === null && !tracks(p);

const api = import.meta.env.VITE_BACKEND_URL;
const headers = async () => ({ Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` });
const monthStart = (day: string) => `${day.slice(0, 7)}-01`;
// Logs load six months at a time, so the calendar and the "most logged" card share them
const firstLoadFrom = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 5);
  return isoDay(d);
};

// `pick` is whose cycle the viewer chose; it falls back to whoever tracks, you first
export function useCycle(pick: Who | null, month: string) {
  // undefined = loading, null = not paired
  const [overview, setOverview] = useState<Overview | null | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  // Each person's logs by day, and the first day they cover
  const [logs, setLogs] = useState<Partial<Record<Who, { from: string; byDay: Record<string, SymptomLog> }>>>({});
  const [logsError, setLogsError] = useState<{ who: Who; message: string } | null>(null);
  const [logsAttempt, setLogsAttempt] = useState(0);
  const loadingLogs = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${api}/cycles/overview`, { headers: await headers() });
        if (!cancelled) setOverview(res.data);
      } catch (err) {
        if (cancelled) return;
        // Only "No active relationship" means not paired. Any other 404 (say, a function not yet
        // deployed with this route) is an error, not a reason to send a paired couple to pairing.
        if (apiError(err, '') === 'No active relationship') setOverview(null);
        else setError(apiError(err, "Couldn't load your cycle. Try again."));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const options = overview ? (['me', 'partner'] as const).filter((w) => tracks(overview[w])) : [];
  const who: Who | null = pick && options.includes(pick) ? pick : (options[0] ?? null);

  // Load logs back to the month on screen (never the future: nothing is logged there)
  const have = who ? logs[who] : undefined;
  const want = [firstLoadFrom(), monthStart(month)].sort()[0];
  useEffect(() => {
    if (!who || !overview || (have && have.from <= want) || loadingLogs.current || logsError?.who === who) return;
    loadingLogs.current = true;
    const to = have ? addDays(have.from, -1) : today();
    (async () => {
      try {
        const res = await axios.get(`${api}/cycles/${who === 'me' ? '' : 'partner/'}symptoms`, {
          headers: await headers(),
          params: { from: want, to },
        });
        const byDay = Object.fromEntries((res.data as SymptomLog[]).map((l) => [l.log_date, l]));
        // Days saved while this loaded are newer than what it read, so they win
        setLogs((prev) => ({ ...prev, [who]: { from: want, byDay: { ...byDay, ...prev[who]?.byDay } } }));
        // Run again: the view may have moved on (another person or month) while this loaded
        setLogsAttempt((a) => a + 1);
      } catch (err) {
        setLogsError({ who, message: apiError(err, "Couldn't load the logged days. Try again.") });
      } finally {
        loadingLogs.current = false;
      }
    })();
  }, [who, overview, have, want, logsAttempt, logsError]);

  const setMine = useCallback((change: (periods: Period[]) => Period[]) => {
    setOverview((o) => o && { ...o, me: { ...o.me, periods: change(o.me.periods) } });
  }, []);

  const startPeriod = async (start_date: string) => {
    const res = await axios.post(`${api}/cycles/log`, { start_date }, { headers: await headers() });
    setMine((ps) => [...ps, res.data]);
  };
  const updatePeriod = async (id: string, patch: Partial<Omit<Period, 'id'>>) => {
    const res = await axios.patch(`${api}/cycles/log/${id}`, patch, { headers: await headers() });
    setMine((ps) => ps.map((p) => (p.id === id ? res.data : p)));
  };
  const removePeriod = async (id: string) => {
    await axios.delete(`${api}/cycles/log/${id}`, { headers: await headers() });
    setMine((ps) => ps.filter((p) => p.id !== id));
  };
  // An empty log clears the day; the server answers null
  const saveLog = async (log_date: string, input: LogInput) => {
    const res = await axios.post(`${api}/cycles/symptoms`, { log_date, ...input }, { headers: await headers() });
    setLogs((prev) => {
      // Logging waits for the logs to load; if they somehow haven't, the load brings the saved day
      if (!prev.me) return prev;
      const byDay = { ...prev.me.byDay };
      if (res.data) byDay[log_date] = res.data;
      else delete byDay[log_date];
      return { ...prev, me: { from: prev.me.from, byDay } };
    });
  };
  const answerTracks = async (value: boolean) => {
    await axios.patch(`${api}/profile`, { has_periods: value }, { headers: await headers() });
    setOverview((o) => o && { ...o, me: { ...o.me, hasPeriods: value } });
  };

  return {
    overview,
    who,
    options,
    error,
    retry: () => {
      setError(null);
      setAttempt((a) => a + 1);
    },
    logs: who ? logs[who]?.byDay : undefined,
    logsFrom: have?.from,
    logsError: logsError?.who === who ? logsError.message : null,
    retryLogs: () => {
      setLogsError(null);
      setLogsAttempt((a) => a + 1);
    },
    startPeriod,
    updatePeriod,
    removePeriod,
    saveLog,
    answerTracks,
  };
}
