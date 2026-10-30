// The data several pages share: your profile, the relationship and partner, the stats,
// the cravings list and the cycle overview. Each paints from the cache, then refreshes.
import { useCallback } from 'react';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import { apiError } from '../lib/apiError';
import { load, useCached } from '../lib/cache';
import { useAuth } from '../context/AuthContext';
import type { Overview } from './useCycle';

export interface MyProfile { display_name: string | null; avatar_url: string | null }
export interface Relationship {
  relationship: { id: string; partner_id: string; anniversary_date: string | null; paired_at: string | null };
  partner: { id: string; display_name: string };
}
export interface Stats {
  user: { id: string; account_created: string; account_age: string };
  relationship: {
    id: string;
    paired_at: string | null;
    anniversary_date: string | null;
    together_duration: string;
    together_conversion: string;
    anniversary_duration: string;
    anniversary_conversion: string;
    next_anniversary: string | null;
    days_until_anniversary: number | null;
    next_monthsary: string | null;
    days_until_monthsary: number | null;
    status: string;
  };
  partner: { id: string; display_name: string; avatar_url?: string | null; account_created?: string | null };
  stats: { cravings: number; letters_sent: number; letters_received: number };
}
export interface Craving {
  id: string;
  content: string;
  category: string;
  fulfilled: boolean;
  user_id: string;
  partner_id: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

const api = import.meta.env.VITE_BACKEND_URL;
const session = async () => (await supabase.auth.getSession()).data.session;
const get = async <T>(path: string, params?: object) =>
  (await axios.get<T>(`${api}${path}`, { headers: { Authorization: `Bearer ${(await session())?.access_token}` }, params })).data;
// 404 means not paired yet: cached as null, not an error
const unpairedAsNull = (err: unknown) => {
  if ((err as { response?: { status?: number } }).response?.status === 404) return null;
  throw err;
};

const fetchProfile = async (): Promise<MyProfile | null> => {
  const { data, error } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', (await session())?.user.id ?? '').maybeSingle();
  if (error) throw error;
  return data;
};
// Pages read relationship.id unguarded: a body without it (an empty "" mid-deploy) is an error, never cached
const fetchRelationship = () => get<Relationship>('/relationships/me')
  .then((r) => {
    if (!r?.relationship) throw new Error('Unexpected relationship response');
    return r;
  })
  .catch(unpairedAsNull);
// Every page reads stats.relationship unguarded: a body without it is an error, never cached
const fetchStats = () => get<Stats>('/relationships/stats', { _t: Date.now() })
  .then((s) => {
    if (!s?.relationship) throw new Error('Unexpected stats response');
    return s;
  })
  .catch(unpairedAsNull);
const fetchOverview = () =>
  get<Overview>('/cycles/overview').catch((err) => {
    // Only "No active relationship" means not paired; any other 404 (a route not deployed yet) is an error
    if (apiError(err, '') === 'No active relationship') return null;
    throw err;
  });

const useKey = (name: string | null) => {
  const id = useAuth().user?.id;
  return id && name ? `${id}:${name}` : null;
};

export const useMyProfile = () => useCached(useKey('profile'), fetchProfile);
export const useRelationship = () => {
  const r = useCached(useKey('relationship'), fetchRelationship);
  // A cached copy without the relationship (an empty body "" saved before the check above) counts as not loaded yet; null is unpaired
  return r.data !== null && !r.data?.relationship ? { ...r, data: undefined } : r;
};
export const useStats = () => {
  const s = useCached(useKey('stats'), fetchStats);
  // A cached copy without the relationship (an older build's, or an empty body "") counts as not loaded yet; null is unpaired
  return s.data !== null && !s.data?.relationship ? { ...s, data: undefined } : s;
};
export const useOverview = () => useCached(useKey('overview'), fetchOverview);

// Waits for the relationship id; `reload` refetches after a change
export function useCravings(relationshipId: string | null | undefined) {
  const fetch = useCallback(() => get<Craving[]>('/cravings', { relationshipId }), [relationshipId]);
  return useCached(useKey(relationshipId ? `cravings:${relationshipId}` : null), fetch);
}

// After pairing, leaving or a new anniversary: refetch everything that hangs off the relationship.
// The change itself already went through, so a failed refetch here isn't an error.
export async function refreshRelationship() {
  const id = (await session())?.user.id;
  if (!id) return;
  await Promise.allSettled([load(`${id}:relationship`, fetchRelationship, true), load(`${id}:stats`, fetchStats, true)]);
}
