import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useDailyTip(phase: string | null, targetAudience: string = 'self') {
  const [tip, setTip] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!phase) {
      setTip(null);
      return;
    }

    let cancelled = false;

    const fetchTip = async () => {
      setLoading(true);
      try {
        // Correct table name: cycle_tips
        const { data, error } = await supabase
          .from('cycle_tips')                        // ← was 'tips'
          .select('tip_text')
          .eq('phase', phase)
          .eq('target_audience', targetAudience);

        if (cancelled) return;

        if (error) throw error;

        if (data && data.length > 0) {
          const randomIndex = Math.floor(Math.random() * data.length);
          setTip(data[randomIndex].tip_text);
        } else {
          setTip('Listen to your body and take care of yourself today.');
        }
      } catch (err) {
        console.error('useDailyTip error:', err);
        if (!cancelled) setTip('Listen to your body and take care of yourself today.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTip();
    return () => { cancelled = true; };
  }, [phase, targetAudience]);

  return { tip, loading };
}
