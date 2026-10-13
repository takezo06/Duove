import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loader2, MessageCircle } from 'lucide-react';
import { Avatar, Badge, focusRing, inset, primaryButton, secondaryButton, surface } from '../components/Card';
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
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [me, setMe] = useState<Person>({ name: 'You', avatar: null });
  const [partner, setPartner] = useState<Person | null>(null);
  const navigate = useNavigate();

  const fetchHistory = async (cursor?: string) => {
    setError(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const url = cursor
        ? `${import.meta.env.VITE_BACKEND_URL}/qa/history?cursor=${cursor}`
        : `${import.meta.env.VITE_BACKEND_URL}/qa/history`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { items: newItems, hasMore: more, nextCursor: next } = res.data;
      if (cursor) {
        setItems((prev) => [...prev, ...newItems]);
      } else {
        setItems(newItems);
      }
      setHasMore(more);
      setNextCursor(next);
    } catch (err: any) {
      setError(err.response?.data?.error || "Couldn't load your past questions.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      // Names and avatars only decorate the page; the history still shows if they fail
      const [{ data: profile }, stats] = await Promise.all([
        supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).maybeSingle(),
        axios
          .get(`${import.meta.env.VITE_BACKEND_URL}/relationships/stats`, { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => r.data)
          .catch(() => null),
        fetchHistory(),
      ]);
      setMe({ name: profile?.display_name || 'You', avatar: profile?.avatar_url || null });
      if (stats?.partner) setPartner({ name: stats.partner.display_name, avatar: stats.partner.avatar_url ?? null });
    };
    init();
  }, [navigate]);

  const loadMore = () => {
    if (nextCursor && !loadingMore) {
      setLoadingMore(true);
      fetchHistory(nextCursor);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6" aria-busy="true">
        <div className={`${surface} h-40 animate-pulse`} />
        <div className={`${surface} h-48 animate-pulse`} />
        <div className={`${surface} h-48 animate-pulse`} />
      </div>
    );
  }

  const partnerName = partner?.name || 'your partner';
  const together = items.filter((i) => i.both_answered).length;
  const today = todayKey();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <section className={`${surface} p-6 md:p-8`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex -space-x-3">
            <Avatar src={me.avatar} name={me.name} />
            {partner ? <Avatar src={partner.avatar} name={partner.name} /> : <Avatar src={null} name="Your partner" dashed />}
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
          Every question you and <span className="text-rose-400 font-semibold">{partnerName}</span> have been asked, and what you both said.
        </p>

        {error && (
          <div className="mt-6 pt-6 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
            <p role="alert" className="text-sm text-rose-300">{error}</p>
            <button onClick={() => fetchHistory()} className={secondaryButton}>
              Try again
            </button>
          </div>
        )}

        {!error && items.length === 0 && (
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

      {groupByMonth(items).map(([month, group]) => (
        <section key={month} aria-label={month} className="space-y-3">
          <h2 className="flex items-baseline justify-between text-sm px-1">
            <span className="font-semibold text-white">{month}</span>
            <span className="text-neutral-400">{plural(group.length, 'question')}</span>
          </h2>
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

      {hasMore && (
        <div className="text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className={`${secondaryButton} min-w-32 hover:border-rose-400/40 hover:text-white`}
          >
            {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" aria-label="Loading" /> : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
