import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { usePageTitle } from '../hooks/usePageTitle';
import { Avatar, Badge, CategoryPill, focusRing, primaryButton, secondaryButton, surface } from '../components/Card';
import { categoryFor } from '../lib/cravingCategories';
import { plural } from '../lib/plural';
import { when } from '../lib/when';
import { ArrowRight, Check, ListPlus, Mail, MessageCircle, Bell } from 'lucide-react';

interface Notification {
  id: string;
  type: 'craving_added' | 'craving_fulfilled' | 'letter_received' | 'qa_answered';
  message: string;
  created_at: string;
  link: string;
  reference_id: string;
}

const NO_RELATIONSHIP = 'No active relationship found.';

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
  const [partner, setPartner] = useState<{ display_name: string } | null>(null);
  const [categoryById, setCategoryById] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }

        const token = (await supabase.auth.getSession()).data.session?.access_token;

        const api = (path: string) =>
          axios.get(`${import.meta.env.VITE_BACKEND_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
        // Extras only decorate the list; the page still works if they fail
        const extra = (path: string) => api(path).then((r) => r.data).catch(() => null);

        // Unread count must be read before marking everything read below
        const [res, unreadRes, rel, cravings] = await Promise.all([
          api(`/notifications?_t=${Date.now()}`),
          extra('/notifications/unread-count'),
          extra('/relationships/me'),
          extra('/cravings'),
        ]);
        setNotifications(res.data);
        setUnread(unreadRes?.count ?? 0);
        setPartner(rel?.partner ?? null);
        if (Array.isArray(cravings))
          setCategoryById(Object.fromEntries(cravings.map((c: { id: string; category: string }) => [c.id, c.category])));

        // Mark as read after fetching
        if (token) {
          await axios.post(
            `${import.meta.env.VITE_BACKEND_URL}/notifications/read`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          // Notify sidebar to refresh badge
          window.dispatchEvent(new Event('notifications-read'));
        }
      } catch (err: any) {
        // 404 means not paired yet: an expected state, not a failure
        if (err.response?.status !== 404) console.error('Error fetching notifications:', err);
        setError(err.response?.status === 404 ? NO_RELATIONSHIP : "Couldn't load your notifications.");
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [navigate]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6" aria-busy="true">
        <div className={`${surface} h-32 animate-pulse`} />
        <div className={`${surface} h-64 animate-pulse`} />
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
              What <span className="text-rose-400 font-semibold">{partnerName}</span> has been up to lately.
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
            <h2 className="flex items-baseline justify-between text-sm px-1 mb-2">
              <span className="font-semibold text-white">{day}</span>
              <span className="text-neutral-400">{plural(items.length, 'update')}</span>
            </h2>
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
    </div>
  );
}
