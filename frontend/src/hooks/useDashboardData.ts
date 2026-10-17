import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { cycleModel, today, type Phase } from '../lib/cycle';
import { tracks, type Overview } from './useCycle';

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
  const [data, setData] = useState<Omit<DashboardData, 'loading' | 'error'>>({
    userName: '',
    userAvatar: null,
    partnerName: '',
    partnerAvatar: null,
    daysTogether: 0,
    since: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const set = (patch: Partial<typeof data>) => setData((prev) => ({ ...prev, ...patch }));

    const fetchAll = async () => {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const base = import.meta.env.VITE_BACKEND_URL;
      const headers = { Authorization: `Bearer ${session.access_token}` };
      const user = session.user;

      // Tiles: all start at once and fill in as each one lands
      axios
        .get<Overview>(`${base}/cycles/overview`, { headers })
        .then(({ data: o }) => {
          const who = tracks(o.me) ? o.me : tracks(o.partner) ? o.partner : null;
          const s = who && cycleModel(who.periods, today()).summary;
          set({
            cycle: s
              ? { phase: s.phase, daysUntilPeriod: s.daysUntil, cycleDay: s.day, length: s.length, whose: who === o.me ? null : o.partner.name }
              : null,
          });
        })
        // Not paired or not reachable: the tile shows its empty line
        .catch(() => set({ cycle: null }));

      axios
        .get(`${base}/love-letters?limit=1`, { headers })
        .then((res) => {
          const letter = res.data[0];
          set({ latestLetter: letter ? { heading: letter.heading, sender_name: letter.sender_name } : null });
        })
        .catch(() => {
          console.warn('Love letters not available');
          set({ latestLetter: null });
        });

      axios
        .get(`${base}/qa/current`, { headers, params: { tz: Intl.DateTimeFormat().resolvedOptions().timeZone } })
        .then((res) => {
          const qa = res.data;
          set({
            currentQuestion: qa?.question
              ? { question_text: qa.question.question_text, youAnswered: !!qa.yourAnswer, partnerAnswered: !!qa.partnerAnswered }
              : null,
          });
        })
        .catch(() => {
          console.warn('QA not available');
          set({ currentQuestion: null });
        });

      // Hero: my profile + relationship stats
      try {
        const [{ data: myProfile }, statsRes] = await Promise.all([
          supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).single(),
          axios.get(`${base}/relationships/stats`, { headers }),
        ]);
        const stats = statsRes.data;

        // Cravings need the relationship id, so they start once stats is back
        const relId = stats.relationship?.id;
        if (relId) {
          axios
            .get(`${base}/cravings?relationshipId=${relId}`, { headers })
            .then((res) => set({ cravings: (res.data || []).filter((c: { fulfilled: boolean }) => !c.fulfilled).slice(0, 3) }))
            .catch(() => {
              console.warn('Cravings not available');
              set({ cravings: [] });
            });
        } else {
          set({ cravings: [] });
        }

        const startDateStr = stats.relationship?.anniversary_date || stats.relationship?.paired_at;
        set({
          userName: myProfile?.display_name || user.email?.split('@')[0] || 'You',
          userAvatar: myProfile?.avatar_url || null,
          partnerName: stats.partner?.display_name || 'Your Partner',
          partnerAvatar: stats.partner?.avatar_url || null,
          daysTogether: startDateStr ? Math.floor((Date.now() - new Date(startDateStr).getTime()) / (1000 * 60 * 60 * 24)) : 0,
          since: startDateStr || null,
        });
      } catch (err: any) {
        // 404 means not paired yet: an expected state, not a failure
        if (err.response?.status === 404) {
          setError('No active relationship found. Pair with your partner first.');
        } else {
          console.error('Dashboard data fetch error:', err);
          setError('Failed to load dashboard data.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  return { ...data, loading, error };
}
