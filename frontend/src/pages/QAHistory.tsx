import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loader2, MessageCircle } from 'lucide-react';
import { Avatar, Badge, focusRing, inset, primaryButton, secondaryButton, surface } from '../components/Card';
import { apiError } from '../lib/apiError';
import { plural } from '../lib/plural';

interface HistoryItem {
  id: string;
  assigned_date: string;
  revealed_at: string | null;
  question: {
    id: string;
    question_text: string;
    category_id: string;
  };
  your_answer: {
    answer_text: string;
    submitted_at: string;
  } | null;
  partner_answer: {
    answer_text: string | null;
    submitted_at: string;
  } | null;
  both_answered: boolean;
}

type Person = { name: string; avatar: string | null };

const PAGE = 30;

// One page of history, newest first. `before` is the assigned_date of the oldest question already shown.
// The first page also brings the partner.
async function fetchHistory(before?: string): Promise<{
  items: HistoryItem[];
  hasMore: boolean;
  partner?: { display_name: string; avatar_url: string | null } | null;
}> {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/qa/history`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { limit: PAGE, before },
  });
  return res.data;
}

// assigned_date is a plain local date; parse it as local midnight, not UTC
const localDay = (d: string) => new Date(`${d}T00:00:00`);
const todayKey = () => new Date().toLocaleDateString('en-CA');

function relativeDay(d: string) {
  const days = Math.round((localDay(todayKey()).getTime() - localDay(d).getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${plural(days, 'day')} ago`;
}

// Consecutive items grouped under "October 2026"-style headings (items arrive newest first)
function groupByMonth(items: HistoryItem[]) {
  const groups: [string, HistoryItem[]][] = [];
  for (const item of items) {
    const month = localDay(item.assigned_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const last = groups[groups.length - 1];
    if (last?.[0] === month) last[1].push(item);
    else groups.push([month, [item]]);
  }
  return groups;
}

export function QAHistory() {
  usePageTitle('Daily Q&A');
  const [loading, setLoading] = useState(true);
  const [unpaired, setUnpaired] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState('');
  // undefined = still loading
  const [me, setMe] = useState<Person | undefined>(undefined);
  const [partner, setPartner] = useState<Person | null>(null);
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Your name and avatar only decorate the header: they fill in when they land, and a retry doesn't refetch them
  useEffect(() => {
    const load = async () => {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;
      const fallback = { name: 'You', avatar: null };
      supabase.from('profiles').select('display_name, avatar_url').eq('id', session.user.id).maybeSingle().then(
        ({ data }) => setMe(data ? { name: data.display_name || 'You', avatar: data.avatar_url || null } : fallback),
        () => setMe(fallback),
      );
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!(await supabase.auth.getSession()).data.session) {
        navigate('/login');
        return;
      }
      try {
        const page = await fetchHistory();
        setItems(page.items);
        setHasMore(page.hasMore);
        if (page.partner) setPartner({ name: page.partner.display_name, avatar: page.partner.avatar_url });
      } catch (err) {
        // 404 means not paired yet: an expected state, not a failure
        if ((err as { response?: { status?: number } }).response?.status === 404) setUnpaired(true);
        else setError(apiError(err, "Couldn't load your past questions. Try again."));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [attempt, navigate]);

  const loadMore = useCallback(async () => {
    if (busy.current || items.length === 0) return;
    busy.current = true;
    setLoadingMore(true);
    setMoreError('');
    try {
      const page = await fetchHistory(items[items.length - 1].assigned_date);
      setItems((prev) => [...prev, ...page.items]);
      setHasMore(page.hasMore);
    } catch (err) {
      setMoreError(apiError(err, "Couldn't load older questions. Try again."));
    } finally {
      busy.current = false;
      setLoadingMore(false);
    }
  }, [items]);

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

  if (unpaired) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className={`${surface} p-8 md:p-12 text-center`}>
          <div className="flex justify-center -space-x-4 mb-5">
            <Avatar src={null} name="You" />
            <Avatar src={null} name="Your partner" dashed />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">A question needs two answers</h1>
          <p className="text-neutral-400 max-w-md mx-auto">Connect with your partner to get a new question every day.</p>
          <button onClick={() => navigate('/partner')} className={`${primaryButton} mt-6`}>
            Connect with your partner
          </button>
        </div>
      </div>
    );
  }

  // The heading draws right away; avatars, the partner's name and the list each wait for their own data
  const avatarSkeleton = <div className="w-16 h-16 rounded-full ring-4 ring-neutral-900 bg-neutral-800 animate-pulse" aria-hidden />;
  const partnerName = partner?.name || 'your partner';
  // Only counted once every page is in; a partial count would be wrong
  const together = hasMore ? 0 : items.filter((i) => i.both_answered).length;
  const today = todayKey();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <section className={`${surface} p-6 md:p-8`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex -space-x-3">
            {me ? <Avatar src={me.avatar} name={me.name} /> : avatarSkeleton}
            {loading ? avatarSkeleton : partner ? <Avatar src={partner.avatar} name={partner.name} /> : <Avatar src={null} name="Your partner" dashed />}
          </div>
          <Link to="/qa" className={`${secondaryButton} hover:border-rose-400/40 hover:text-white`}>
            <MessageCircle className="w-4 h-4 text-rose-400" aria-hidden />
            Today's question
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Q&A history</h1>
          {together > 0 && <Badge tone="emerald">{plural(together, 'question')} answered together</Badge>}
        </div>
        <p className="text-neutral-400 mt-1">
          Every question you and{' '}
          {loading ? (
            <span className="inline-block h-4 w-12 rounded bg-neutral-800 animate-pulse align-middle" aria-hidden />
          ) : (
            <span className="text-rose-400 font-semibold">{partnerName}</span>
          )}{' '}
          have been asked, and what you both said.
        </p>

        {error && (
          <div className="mt-6 pt-6 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
            <p role="alert" className="text-sm text-rose-300">{error}</p>
            <button onClick={() => { setError(''); setLoading(true); setAttempt((a) => a + 1); }} className={secondaryButton}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="mt-6 pt-6 border-t border-neutral-800">
            <p className="text-neutral-200">No questions yet.</p>
            <p className="text-sm text-neutral-400 mt-1">
              Answer today's question and it shows up here, next to what {partnerName} says.
            </p>
            <Link to="/qa" className={`${primaryButton} mt-4`}>
              Answer today's question
            </Link>
          </div>
        )}
      </section>

      {loading && (
        <div className="space-y-3 animate-pulse" aria-busy="true">
          <div className="h-4 w-28 rounded bg-neutral-800 mx-1" />
          {[0, 1].map((i) => (
            <div key={i} className={`${surface} p-5 md:p-6`}>
              <div className="flex items-center justify-between gap-2">
                <div className="h-4 w-36 rounded bg-neutral-800" />
                <div className="h-5 w-24 rounded-full bg-neutral-800" />
              </div>
              <div className="h-5 w-3/4 rounded bg-neutral-800 mt-3" />
              <div className="grid md:grid-cols-2 gap-3 mt-4">
                <div className="h-16 rounded-xl bg-neutral-800/40 border border-neutral-800" />
                <div className="h-16 rounded-xl bg-neutral-800/40 border border-neutral-800" />
              </div>
            </div>
          ))}
        </div>
      )}

      {groupByMonth(items).map(([month, group]) => (
        <section key={month} aria-label={month} className="space-y-3">
          <h2 className="text-sm font-semibold text-white px-1">{month}</h2>
          {group.map((item) => {
            const isToday = item.assigned_date === today;
            const date = localDay(item.assigned_date);
            const partnerText = item.partner_answer?.answer_text;
            return (
              <article
                key={item.id}
                className={`${surface} p-5 md:p-6 transition hover:border-rose-400/30`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <time dateTime={item.assigned_date} className="text-sm text-neutral-400">
                    {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    <span aria-hidden> · </span>
                    {relativeDay(item.assigned_date)}
                  </time>
                  {item.both_answered ? (
                    <Badge tone="emerald">Both answered</Badge>
                  ) : isToday && !item.your_answer ? (
                    <Badge tone="rose">Your turn</Badge>
                  ) : item.your_answer ? (
                    <Badge tone="neutral">{isToday ? `Waiting on ${partnerName}` : `${partnerName} didn't answer`}</Badge>
                  ) : (
                    <Badge tone="neutral">{item.partner_answer ? `Only ${partnerName} answered` : 'Neither of you answered'}</Badge>
                  )}
                </div>

                <p className="text-lg font-bold text-white mt-2 break-words">{item.question.question_text}</p>

                <div className="grid md:grid-cols-2 gap-3 mt-4">
                  <div className={inset}>
                    <p className="text-xs text-neutral-400">You</p>
                    {item.your_answer ? (
                      <p className="text-sm text-neutral-200 mt-1 break-words">{item.your_answer.answer_text}</p>
                    ) : (
                      <p className="text-sm text-neutral-400 mt-1">No answer</p>
                    )}
                  </div>
                  <div className={inset}>
                    <p className="text-xs text-rose-400 font-medium">{partner?.name || 'Partner'}</p>
                    {partnerText ? (
                      <p className="text-sm text-neutral-200 mt-1 break-words">{partnerText}</p>
                    ) : item.partner_answer ? (
                      <p className="text-sm text-neutral-400 mt-1">Answered. Yours unlocks theirs.</p>
                    ) : (
                      <p className="text-sm text-neutral-400 mt-1">No answer</p>
                    )}
                  </div>
                </div>

                {isToday && !item.your_answer && (
                  <Link to="/qa" className={`mt-4 inline-flex items-center gap-1 text-sm text-rose-400 hover:text-rose-300 rounded ${focusRing}`}>
                    Answer it now →
                  </Link>
                )}
              </article>
            );
          })}
        </section>
      ))}

      {hasMore ? (
        <div ref={sentinel} className="flex flex-col items-center gap-3">
          {moreError && <p role="alert" className="text-sm text-rose-300">{moreError}</p>}
          <button onClick={loadMore} disabled={loadingMore} className={secondaryButton}>
            {loadingMore && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
            {loadingMore ? 'Loading...' : moreError ? 'Try again' : 'Load older questions'}
          </button>
        </div>
      ) : (
        items.length > 0 && (
          <p className="text-sm text-neutral-400 text-center">
            That's every question, back to the first one on{' '}
            {localDay(items[items.length - 1].assigned_date).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
            .
          </p>
        )
      )}
    </div>
  );
}
