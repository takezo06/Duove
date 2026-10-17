import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { daysBetween, today, type Phase } from '../lib/cycle';

const FALLBACK = 'Listen to your body and go easy on yourself today.';

// One tip per phase per day: the same all day, a different one tomorrow.
// No phase (a late period) reads the general tips.
export function useDailyTip(phase: Phase | null, audience: 'self' | 'partner') {
  const [tip, setTip] = useState<{ key: string; text: string } | null>(null);
  const dbPhase = phase === 'fertile' ? 'ovulatory' : phase ?? 'general';
  const key = `${dbPhase}:${audience}`;

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('cycle_tips')
      .select('tip_text')
      .eq('phase', dbPhase)
      .eq('target_audience', audience)
      .order('id')
      .then(({ data }) => {
        if (cancelled) return;
        const tips = (data ?? []) as { tip_text: string }[];
        const n = daysBetween('2026-01-01', today());
        setTip({ key, text: tips.length ? tips[((n % tips.length) + tips.length) % tips.length].tip_text : FALLBACK });
      });
    return () => {
      cancelled = true;
    };
  }, [dbPhase, audience, key]);

  // undefined while the tip for this phase is loading
  return tip?.key === key ? tip.text : undefined;
}
