// Stands in for src/lib/supabase: a signed-in user, profile reads, and no-op realtime.
import { me, partner } from './data';

const user = { id: me.id, email: me.email, user_metadata: {}, created_at: '2025-01-14T08:00:00Z' };
const session = { access_token: 'mock-token', user };
const profiles: Record<string, object> = { [me.id]: me, [partner.id]: partner };

function table(name: string) {
  let id: string | null = null;
  const result = () => ({ data: name === 'profiles' ? profiles[id ?? me.id] ?? null : null, error: null });
  const q = {
    select: () => q,
    eq: (_col: string, value: string) => { id = value; return q; },
    order: () => q,
    limit: () => q,
    update: () => q,
    upsert: () => q,
    single: async () => result(),
    maybeSingle: async () => result(),
    then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: [], error: null }),
  };
  return q;
}

const channel = { on: () => channel, subscribe: () => channel };

export const supabase = {
  auth: {
    getUser: async () => ({ data: { user }, error: null }),
    getSession: async () => ({ data: { session }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: async () => ({ error: null }),
    resetPasswordForEmail: async () => ({ error: null }),
  },
  from: table,
  channel: () => channel,
  removeChannel: () => {},
  storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: me.avatar_url } }) }) },
};
