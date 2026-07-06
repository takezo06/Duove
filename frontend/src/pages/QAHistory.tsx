import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import {
  Loader2,
  Calendar,
  MessageCircle,
  User,
  Eye,
  Clock,
  CheckCircle,
  Sparkles,
} from 'lucide-react';

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
    answer_text: string;
    submitted_at: string;
  } | null;
  both_answered: boolean;
}

export function QAHistory() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const navigate = useNavigate();

  const fetchHistory = async (cursor?: string) => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const url = cursor
        ? `${import.meta.env.VITE_BACKEND_URL}/api/qa/history?cursor=${cursor}`
        : `${import.meta.env.VITE_BACKEND_URL}/api/qa/history`;
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
      console.error('Error fetching history:', err);
      setError('Failed to load history.');
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
      await fetchHistory();
    };
    init();
  }, []);

  const loadMore = () => {
    if (nextCursor && !loadingMore) {
      setLoadingMore(true);
      fetchHistory(nextCursor);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto animate-pulse">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-neutral-800" />
          <div className="h-8 w-40 bg-neutral-800 rounded" />
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 mb-4 space-y-3">
            <div className="h-4 w-32 bg-neutral-800 rounded" />
            <div className="h-6 w-3/4 bg-neutral-800 rounded" />
            <div className="flex gap-4">
              <div className="h-4 w-1/4 bg-neutral-800 rounded" />
              <div className="h-4 w-1/4 bg-neutral-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-8">
          <p className="text-neutral-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-rose-400/10 flex items-center justify-center border border-rose-400/20">
          <Sparkles className="w-5 h-5 text-rose-400" />
        </div>
        <h1 className="text-2xl font-semibold text-white">Q&A History</h1>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 bg-neutral-900/50 rounded-2xl border border-neutral-800/50">
          <p className="text-neutral-400">No past Q&A yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 hover:border-neutral-700 transition"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(item.assigned_date)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {item.both_answered ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Both answered
                    </span>
                  ) : (
                    <span className="text-neutral-500 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {item.your_answer ? 'You answered' : 'Waiting'}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-white font-medium text-lg mt-1">{item.question.question_text}</p>

              <div className="grid md:grid-cols-2 gap-4 mt-4">
                {/* Your answer */}
                <div className="bg-neutral-800/30 rounded-xl p-3">
                  <p className="text-xs text-neutral-500 flex items-center gap-1">
                    <User className="w-3 h-3" /> You
                  </p>
                  {item.your_answer ? (
                    <p className="text-sm text-white mt-1">{item.your_answer.answer_text}</p>
                  ) : (
                    <p className="text-sm text-neutral-500 italic">Not answered</p>
                  )}
                </div>

                {/* Partner answer */}
                <div className="bg-neutral-800/30 rounded-xl p-3">
                  <p className="text-xs text-neutral-500 flex items-center gap-1">
                    <User className="w-3 h-3" /> Partner
                  </p>
                  {item.partner_answer && item.revealed_at ? (
                    <p className="text-sm text-white mt-1">{item.partner_answer.answer_text}</p>
                  ) : item.partner_answer && !item.revealed_at ? (
                    <p className="text-sm text-rose-400/60 italic">Waiting for reveal...</p>
                  ) : (
                    <p className="text-sm text-neutral-500 italic">Not answered</p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {hasMore && (
            <div className="text-center mt-6">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-400/30 text-rose-400 rounded-xl font-medium transition flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
              >
                {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
