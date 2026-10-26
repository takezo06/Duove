import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { cycleModel, today, type Phase } from '../lib/cycle';
import { tracks } from './useCycle';
import { useCravings, useMyProfile, useOverview, useStats } from './useShared';
import { useAuth } from '../context/AuthContext';

// Per-tile fields: undefined = still loading, null / [] = loaded, nothing there
export interface DashboardData {
  userName: string;
  userAvatar: string | null;
  partnerName: string;
  partnerAvatar: string | null;
  daysTogether: number;
  since: string | null; // anniversary date, or pairing date if none set
  // The cycle the tracker opens on: yours if you track one, else your partner's (`whose` is their name)
  cycle?: {
    phase: Phase | null;
    daysUntilPeriod: number;
    cycleDay: number;
    length: number;
    whose: string | null;
  } | null;
  latestLetter?: {
    heading: string;
    sender_name: string;
  } | null;
  currentQuestion?: {
    question_text: string;
    youAnswered: boolean;
    partnerAnswered: boolean;
  } | null;
  cravings?: {
    id: string;
    content: string;
    category: string;
    fulfilled: boolean;
  }[];
  loading: boolean;
  error: string | null;
}

export function useDashboardData(): DashboardData {
  const { user } = useAuth();
  const profile = useMyProfile();
  const stats = useStats();
  const overview = useOverview();
  const relId = stats.data?.relationship.id;
  const cravings = useCravings(relId);
  const [latestLetter, setLatestLetter] = useState<DashboardData['latestLetter']>();
  const [currentQuestion, setCurrentQuestion] = useState<DashboardData['currentQuestion']>();
  const [now] = useState(() => Date.now());

  // Tiles only this page shows: they start at once and fill in as each one lands
  useEffect(() => {
    const load = async () => {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;
      const base = import.meta.env.VITE_BACKEND_URL;
      const headers = { Authorization: `Bearer ${session.access_token}` };

      axios
        .get(`${base}/love-letters?limit=1`, { headers })
        .then((res) => {
          const letter = res.data[0];
          setLatestLetter(letter ? { heading: letter.heading, sender_name: letter.sender_name } : null);
        })
        .catch(() => {
          console.warn('Love letters not available');
          setLatestLetter(null);
        });

      axios
        .get(`${base}/qa/current`, { headers, params: { tz: Intl.DateTimeFormat().resolvedOptions().timeZone } })
        .then((res) => {
          const qa = res.data;
          setCurrentQuestion(
            qa?.question
              ? { question_text: qa.question.question_text, youAnswered: !!qa.yourAnswer, partnerAnswered: !!qa.partnerAnswered }
              : null,
          );
        })
        .catch(() => {
          console.warn('QA not available');
          setCurrentQuestion(null);
        });
    };
    load();
  }, []);

  // Cycle tile: yours if you track one, else your partner's. Not paired or not reachable: its empty line.
  const o = overview.data;
  const who = o ? (tracks(o.me) ? o.me : tracks(o.partner) ? o.partner : null) : null;
  const s = who && cycleModel(who.periods, today()).summary;
  const cycle = o === undefined && !overview.error ? undefined
    : s && o ? { phase: s.phase, daysUntilPeriod: s.daysUntil, cycleDay: s.day, length: s.length, whose: who === o.me ? null : o.partner.name }
    : null;

  // Cravings need the relationship id, so they start once stats is known
  const openCravings = !relId ? (stats.data === undefined && !stats.error ? undefined : [])
    : cravings.data ? cravings.data.filter((c) => !c.fulfilled).slice(0, 3)
    : cravings.error ? [] : undefined;

  // Hero: my profile + relationship stats. A cached copy shows at once while they refresh.
  const st = stats.data;
  const startDateStr = st?.relationship.anniversary_date || st?.relationship.paired_at;
  const loading = (st === undefined && !stats.error) || (profile.data === undefined && !profile.error);
  // null stats means not paired yet: an expected state, not a failure
  const error = st === null ? 'No active relationship found. Pair with your partner first.'
    : st === undefined && stats.error ? 'Failed to load dashboard data.'
    : null;

  return {
    userName: profile.data?.display_name || user?.email?.split('@')[0] || 'You',
    userAvatar: profile.data?.avatar_url || null,
    partnerName: st?.partner.display_name || 'Your Partner',
    partnerAvatar: st?.partner.avatar_url || null,
    daysTogether: startDateStr ? Math.floor((now - new Date(startDateStr).getTime()) / (1000 * 60 * 60 * 24)) : 0,
    since: startDateStr || null,
    cycle,
    latestLetter,
    currentQuestion,
    cravings: openCravings,
    loading,
    error,
  };
}
