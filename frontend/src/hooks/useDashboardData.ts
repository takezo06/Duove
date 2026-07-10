import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import axios from 'axios';

export interface DashboardData {
  userName: string;
  userAvatar: string | null;
  partnerName: string;
  partnerAvatar: string | null;
  daysTogether: number;
  cycle: {
    phase: string;
    daysUntilPeriod: number;
    cycleDay: number;
  } | null;
  latestLetter: {
    heading: string;
    sender_name: string;
  } | null;
  currentQuestion: {
    question_text: string;
    youAnswered: boolean;
    partnerAnswered: boolean;
  } | null;
  cravings: {
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
    cycle: null,
    latestLetter: null,
    currentQuestion: null,
    cravings: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        // 1. Get my own profile (display_name + avatar_url)
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;
        let myDisplayName = user?.email?.split('@')[0] || 'You';
        let myAvatarUrl: string | null = null;
        if (userId) {
          const { data: myProfile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', userId)
            .single();
          if (myProfile) {
            if (myProfile.display_name) myDisplayName = myProfile.display_name;
            if (myProfile.avatar_url) myAvatarUrl = myProfile.avatar_url;
          }
        }

        // 2. Relationship stats (partner name, id, dates)
        const statsRes = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/relationships/stats`,
          { headers }
        );
        const stats = statsRes.data;
        console.log('Partner avatar_url:', stats.partner?.avatar_url);
        const partnerId = stats.partner?.id;
        const partnerName = stats.partner?.display_name || 'Your Partner';

        // Compute days together from anniversary or paired_at
        let daysTogether = 0;
        const startDateStr = stats.relationship?.anniversary_date || stats.relationship?.paired_at;
        if (startDateStr) {
          const startDate = new Date(startDateStr);
          const now = new Date();
          const diffTime = now.getTime() - startDate.getTime();
          daysTogether = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }

        // 3. Partner avatar from stats response
        let partnerAvatarUrl = stats.partner?.avatar_url || null;

        // 4. Cycle prediction
        let cycleData = null;
        try {
          const cycleRes = await axios.get(
            `${import.meta.env.VITE_BACKEND_URL}/api/cycles/stats`,
            { headers }
          );
          const pred = cycleRes.data.prediction;
          if (pred) {
            cycleData = {
              phase: pred.phase,
              daysUntilPeriod: pred.daysUntilPeriod,
              cycleDay: pred.cycleDay,
            };
          }
        } catch (e) {
          console.warn('Cycle data not available');
        }

        // 5. Latest love letter
        let latestLetter = null;
        try {
          const lettersRes = await axios.get(
            `${import.meta.env.VITE_BACKEND_URL}/api/love-letters?limit=1`,
            { headers }
          );
          const letters = lettersRes.data;
          if (letters.length > 0) {
            latestLetter = {
              heading: letters[0].heading,
              sender_name: letters[0].sender_name,
            };
          }
        } catch (e) {
          console.warn('Love letters not available');
        }

        // 6. Current QA question
        let currentQuestion = null;
        try {
          const qaRes = await axios.get(
            `${import.meta.env.VITE_BACKEND_URL}/api/qa/current`,
            { headers }
          );
          const qa = qaRes.data;
          if (qa && qa.question) {
            currentQuestion = {
              question_text: qa.question.question_text,
              youAnswered: !!qa.yourAnswer,
              partnerAnswered: !!qa.partnerAnswer,
            };
          }
        } catch (e) {
          console.warn('QA not available');
        }

        // 7. Cravings (recent unfulfilled)
        let cravings: any[] = [];
        try {
          const relId = stats.relationship?.id;
          if (relId) {
            const cravingsRes = await axios.get(
              `${import.meta.env.VITE_BACKEND_URL}/api/cravings?relationshipId=${relId}`,
              { headers }
            );
            const allCravings = cravingsRes.data || [];
            cravings = allCravings
              .filter((c: any) => !c.fulfilled)
              .slice(0, 3);
          }
        } catch (e) {
          console.warn('Cravings not available');
        }

        setData({
          userName: myDisplayName,
          userAvatar: myAvatarUrl,
          partnerName,
          partnerAvatar: partnerAvatarUrl,
          daysTogether,
          cycle: cycleData,
          latestLetter,
          currentQuestion,
          cravings,
        });
      } catch (err: any) {
        console.error('Dashboard data fetch error:', err);
        if (err.response?.status === 404) {
          setError('No active relationship found. Pair with your partner first.');
        } else {
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
