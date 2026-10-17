import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { usePageTitle } from '../hooks/usePageTitle';
import { Avatar, Badge, CategoryPill, focusRing, primaryButton, secondaryButton, surface } from '../components/Card';
import { categoryFor } from '../lib/cravingCategories';
import { apiError } from '../lib/apiError';
import { when } from '../lib/when';
import { ArrowRight, Check, ListPlus, Mail, MessageCircle, Bell, Loader2 } from 'lucide-react';

interface Notification {
  id: string;
  type: 'craving_added' | 'craving_fulfilled' | 'letter_received' | 'qa_answered';
  message: string;
  created_at: string;
  link: string;
  reference_id: string;
}

const NO_RELATIONSHIP = 'No active relationship found.';
const PAGE = 30;

// One page of notifications, newest first. `before` is the created_at of the oldest one already shown.
async function fetchNotifications(before?: string): Promise<Notification[]> {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/notifications`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { limit: PAGE, before, _t: Date.now() },
  });
  return res.data;
}

function dayLabel(iso: string) {
  const d = new Date(iso).toDateString();
  if (d === new Date().toDateString()) return 'Today';
  if (d === new Date(Date.now() - 86_400_000).toDateString()) return 'Yesterday';
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

function groupByDay(items: Notification[]) {
  const groups = new Map<string, Notification[]>();
  for (const n of items) {
    const key = dayLabel(n.created_at);
    groups.set(key, [...(groups.get(key) ?? []), n]);
  }
  return [...groups];
}

const typeMeta = {
  craving_added: { icon: ListPlus, color: 'text-neutral-300', action: 'See craving' },
  craving_fulfilled: { icon: Check, color: 'text-emerald-400', action: 'See craving' },
  letter_received: { icon: Mail, color: 'text-rose-400', action: 'Read letter' },
  qa_answered: { icon: MessageCircle, color: 'text-neutral-300', action: 'See answer' },
};

// 'Mika added a craving: "Spicy ramen"' -> headline + quoted craving on its own line
function splitMessage(message: string) {
  const m = message.match(/^(.*?): "(.*)"$/);
  return m ? { headline: m[1], quote: m[2] } : { headline: message, quote: null };
}

export function Notifications() {
  usePageTitle('Notifications');
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  // undefined = still loading, null = couldn't load
  const [partner, setPartner] = useState<{ display_name: string } | null | undefined>(undefined);
  const [categoryById, setCategoryById] = useState<Record<string, string>>({});
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState('');
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        navigate('/login');
        return;
      }

      const base = import.meta.env.VITE_BACKEND_URL;
      const headers = { Authorization: `Bearer ${session.access_token}` };
      const api = (path: string) => axios.get(`${base}${path}`, { headers });

      // Extras only decorate the list: they fill in when they land and the page works if they fail.
      // Cravings need the relationship id, so they start once /relationships/me is back.
      api('/relationships/me')
        .then(({ data: rel }) => {
          setPartner(rel.partner ?? null);
          return rel.relationship?.id && api(`/cravings?relationshipId=${rel.relationship.id}`);
        })
        .then((res) => {
          if (res && Array.isArray(res.data))
            setCategoryById(Object.fromEntries(res.data.map((c: { id: string; category: string }) => [c.id, c.category])));
        })
        .catch(() => setPartner((p) => p ?? null));

      try {
        // Unread count must be read before marking everything read below
        const [page, unreadRes] = await Promise.all([
          fetchNotifications(),
          api('/notifications/unread-count').then((r) => r.data).catch(() => null),
        ]);
        setNotifications(page);
        setHasMore(page.length === PAGE);
        setUnread(unreadRes?.count ?? 0);
        setLoading(false);

        // Mark as read in the background, then tell the sidebar to refresh its badge
        axios
          .post(`${base}/notifications/read`, {}, { headers })
          .then(() => window.dispatchEvent(new Event('notifications-read')))
          .catch((err) => console.warn('Could not mark notifications read', err));
      } catch (err: any) {
        // 404 means not paired yet: an expected state, not a failure
        if (err.response?.status !== 404) console.error('Error fetching notifications:', err);
        setError(err.response?.status === 404 ? NO_RELATIONSHIP : "Couldn't load your notifications.");
        setLoading(false);
      }
    };

    load();
  }, [navigate]);

  const loadMore = useCallback(async () => {
    if (busy.current || notifications.length === 0) return;
    busy.current = true;
    setLoadingMore(true);
    setMoreError('');
    try {
      const page = await fetchNotifications(notifications[notifications.length - 1].created_at);
      setNotifications((prev) => [...prev, ...page]);
      setHasMore(page.length === PAGE);
    } catch (err) {
      setMoreError(apiError(err, "Couldn't load older notifications. Try again."));
    } finally {
      busy.current = false;
      setLoadingMore(false);
    }
  }, [notifications]);

  // Lazy loading: fetch the next page while the end is still 600px below the fold.
  // Re-observing after every page keeps filling a tall screen until it can scroll.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || moreError) return;
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && loadMore(), {
      root: el.closest('main'),
      rootMargin: '0px 0px 600px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, moreError, loadMore]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse" aria-busy="true">
        <div className={`${surface} p-6 md:p-8`}>
          <div className="h-8 w-48 rounded bg-neutral-800" />
          <div className="h-4 w-64 max-w-full rounded bg-neutral-800 mt-3" />
        </div>
        <div>
          <div className="h-4 w-16 rounded bg-neutral-800 mx-1 mb-3" />
          <div className={`${surface} p-2`}>
            {['w-3/4', 'w-1/2', 'w-2/3'].map((w) => (
              <div key={w} className="flex items-start gap-3 md:gap-4 p-3 md:p-4">
                <div className="w-9 h-9 rounded-full bg-neutral-800 shrink-0" />
                <div className="flex-1 space-y-2.5 pt-1">
                  <div className={`h-4 ${w} rounded bg-neutral-800`} />
                  <div className="h-3.5 w-24 rounded bg-neutral-800" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error === NO_RELATIONSHIP) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className={`${surface} p-8 md:p-12 text-center`}>
          <div className="flex justify-center -space-x-4 mb-5">
            <Avatar src={null} name="You" />
            <Avatar src={null} name="Your partner" dashed />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Nothing to hear about yet</h1>
          <p className="text-neutral-400 max-w-md mx-auto">
            Once you connect with your partner, their letters and cravings show up here.
          </p>
          <button onClick={() => navigate('/partner')} className={`${primaryButton} mt-6`}>
            Connect with your partner
          </button>
        </div>
      </div>
    );
  }

  const partnerName = partner?.display_name || 'your partner';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <section className={`${surface} p-6 md:p-8`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Notifications</h1>
            <p className="text-neutral-400 mt-1">
              What{' '}
              {partner === undefined ? (
                <span className="inline-block h-4 w-14 rounded bg-neutral-800 animate-pulse align-middle" aria-hidden />
              ) : (
                <span className="text-rose-400 font-semibold">{partnerName}</span>
              )}{' '}
              has been up to lately.
            </p>
          </div>
          {unread > 0 ? (
            <Badge tone="rose">{unread.toLocaleString()} new</Badge>
          ) : (
            notifications.length > 0 && <Badge tone="emerald">All caught up</Badge>
          )}
        </div>

        {error && (
          <div className="mt-6 pt-6 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
            <p role="alert" className="text-sm text-rose-300">{error}</p>
            <button onClick={() => window.location.reload()} className={secondaryButton}>
              Try again
            </button>
          </div>
        )}

        {!error && notifications.length === 0 && (
          <div className="mt-6 pt-6 border-t border-neutral-800">
            <p className="text-neutral-200">Quiet so far.</p>
            <p className="text-sm text-neutral-400 mt-1">
              When {partnerName} sends a letter or adds a craving, it lands here. Why not go first?
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={() => navigate('/letters')} className={primaryButton}>
                {partner ? `Write ${partnerName} a letter` : 'Write a letter'}
              </button>
              <button onClick={() => navigate('/cravings')} className={secondaryButton}>
                Add a craving
              </button>
            </div>
          </div>
        )}

      </section>

      {groupByDay(notifications).map(([day, items]) => {
        const offset = notifications.indexOf(items[0]);
        return (
          <section key={day} aria-label={day}>
            <h2 className="text-sm font-semibold text-white px-1 mb-2">{day}</h2>
            <ul className={`${surface} p-2`}>
              {items.map((item, i) => {
                const { icon: TypeIcon, color, action } = typeMeta[item.type] ?? { icon: Bell, color: 'text-neutral-300', action: 'Open' };
                const cat = item.type.startsWith('craving') && categoryById[item.reference_id]
                  ? categoryFor(categoryById[item.reference_id])
                  : null;
                const Icon = item.type === 'craving_added' && cat ? cat.icon : TypeIcon;
                const iconColor = item.type === 'craving_added' && cat ? cat.iconColor : color;
                const isNew = offset + i < unread;
                const { headline, quote } = splitMessage(item.message);
                const last = i === items.length - 1;
                return (
                  <li key={item.id} className="relative">
                    {/* Thread line joining this update to the next one of the day */}
                    {!last && <span className="absolute left-[33px] top-14 bottom-0 w-px bg-neutral-800" aria-hidden />}
                    <button
                      onClick={() => navigate(item.link, { state: { highlightId: item.reference_id } })}
                      className={`group w-full text-left flex items-start gap-3 md:gap-4 p-3 md:p-4 rounded-xl hover:bg-neutral-800/50 transition cursor-pointer ${focusRing}`}
                    >
                      <span className="relative z-10 w-9 h-9 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0">
                        <Icon className={`w-4 h-4 ${iconColor}`} aria-hidden />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-neutral-200">{headline}</span>
                          {isNew && <Badge tone="rose">New</Badge>}
                        </span>
                        {quote && (
                          <span className="block mt-2 text-lg font-semibold text-white break-words">{quote}</span>
                        )}
                        <span className="mt-2 flex flex-wrap items-center gap-2">
                          {cat && <CategoryPill cat={cat} />}
                          <time dateTime={item.created_at} className="sm:hidden text-sm text-neutral-400 tabular-nums">
                            {when(item.created_at)}
                          </time>
                          <span className="inline-flex items-center gap-1 text-sm text-neutral-400 group-hover:text-rose-400 transition">
                            {action}
                            <ArrowRight className="w-3.5 h-3.5 transition group-hover:translate-x-0.5" aria-hidden />
                          </span>
                        </span>
                      </span>
                      <time dateTime={item.created_at} className="hidden sm:block text-sm text-neutral-400 tabular-nums whitespace-nowrap mt-1.5">
                        {when(item.created_at)}
                      </time>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {hasMore ? (
        <div ref={sentinel} className="flex flex-col items-center gap-3">
          {moreError && <p role="alert" className="text-sm text-rose-300">{moreError}</p>}
          <button onClick={loadMore} disabled={loadingMore} className={secondaryButton}>
            {loadingMore && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
            {loadingMore ? 'Loading...' : moreError ? 'Try again' : 'Load older notifications'}
          </button>
        </div>
      ) : (
        notifications.length > 0 && (
          <p className="text-sm text-neutral-400 text-center">
            That's everything, back to{' '}
            {new Date(notifications[notifications.length - 1].created_at).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            .
          </p>
        )
      )}
    </div>
  );
}
