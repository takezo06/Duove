import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import {
  Loader2,
  Heart,
  Calendar,
  CalendarDays,
  Clock,
  User,
  Edit2,
  X,
  Save,
} from 'lucide-react';

interface Stats {
  user: {
    id: string;
    account_created: string;
    account_age: string;
  };
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
  partner: {
    id: string;
    display_name: string;
  };
  stats: {
    cravings: number;
    letters_sent: number;
    letters_received: number;
  };
}

function SkeletonCard() {
  return (
    <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 relative overflow-hidden">
      <div className="animate-pulse space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-neutral-700 rounded-full" />
          <div className="h-4 w-24 bg-neutral-700 rounded" />
        </div>
        <div className="h-6 w-3/4 bg-neutral-700 rounded" />
        <div className="h-4 w-1/2 bg-neutral-700 rounded" />
        <div className="h-3 w-2/3 bg-neutral-700 rounded" />
      </div>
    </div>
  );
}

export function Partner() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingAnniversary, setEditingAnniversary] = useState(false);
  const [newAnniversaryDate, setNewAnniversaryDate] = useState('');
  const [updatingAnniversary, setUpdatingAnniversary] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }

        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/relationships/stats`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data) {
          setStats(res.data);
          if (res.data.relationship.anniversary_date) {
            setNewAnniversaryDate(res.data.relationship.anniversary_date);
          }
        } else {
          setError('No data found.');
        }
      } catch (err: any) {
        console.error('Error fetching stats:', err);
        if (err.response?.status === 404) {
          setError('No active relationship found.');
        } else {
          setError('Failed to load stats.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [navigate]);

  const updateAnniversary = async () => {
    if (!newAnniversaryDate) return;
    setUpdatingAnniversary(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await axios.patch(
        `${import.meta.env.VITE_BACKEND_URL}/api/relationships/anniversary`,
        { anniversary_date: newAnniversaryDate },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStats(prev => prev ? {
        ...prev,
        relationship: {
          ...prev.relationship,
          anniversary_date: newAnniversaryDate,
          next_anniversary: res.data.anniversary_date,
        }
      } : null);
      setEditingAnniversary(false);
    } catch (err) {
      console.error('Error updating anniversary:', err);
    } finally {
      setUpdatingAnniversary(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-neutral-800" />
            <div>
              <div className="h-7 w-48 bg-neutral-800 rounded" />
              <div className="flex items-center gap-2 mt-1">
                <div className="h-5 w-32 bg-neutral-800 rounded" />
                <div className="h-5 w-20 bg-neutral-800 rounded-full" />
              </div>
            </div>
          </div>
          <div className="h-8 w-28 bg-neutral-800 rounded" />
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-neutral-900/50 rounded-xl border border-neutral-800/50 p-4 text-center">
            <div className="h-8 w-12 mx-auto bg-neutral-800 rounded" />
            <div className="h-4 w-16 mx-auto mt-1 bg-neutral-800 rounded" />
          </div>
          <div className="bg-neutral-900/50 rounded-xl border border-neutral-800/50 p-4 text-center">
            <div className="h-8 w-12 mx-auto bg-neutral-800 rounded" />
            <div className="h-4 w-16 mx-auto mt-1 bg-neutral-800 rounded" />
          </div>
          <div className="bg-neutral-900/50 rounded-xl border border-neutral-800/50 p-4 text-center">
            <div className="h-8 w-12 mx-auto bg-neutral-800 rounded" />
            <div className="h-4 w-16 mx-auto mt-1 bg-neutral-800 rounded" />
          </div>
        </div>

        <div className="bg-neutral-900/50 rounded-2xl border border-neutral-800/50 p-4 flex flex-wrap items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-neutral-800 rounded" />
            <div className="h-4 w-32 bg-neutral-800 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-neutral-800 rounded" />
            <div className="h-4 w-32 bg-neutral-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !stats) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-8">
          <p className="text-neutral-400">{error || 'No data'}</p>
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

  const partnerName = stats.partner.display_name || 'Partner';

  return (
    <div className="max-w-4xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-400/10 flex items-center justify-center border border-rose-400/20">
            <Heart className="w-6 h-6 text-rose-400 fill-rose-400/20" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Your Relationship</h1>
            <p className="text-neutral-400 text-sm flex items-center gap-2">
              with <span className="text-rose-400 font-medium">{partnerName}</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Connected
              </span>
            </p>
          </div>
        </div>
        <button
          onClick={() => setEditingAnniversary(true)}
          className="text-xs text-neutral-400 hover:text-rose-400 transition flex items-center gap-1"
        >
          <Edit2 className="w-3 h-3" />
          {stats.relationship.anniversary_date ? 'Edit anniversary' : 'Set anniversary'}
        </button>
      </div>

      {/* Stats Grid – 4 identical cards with consistent styling */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {/* Card 1: Together */}
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 relative overflow-hidden hover:border-rose-400/30 transition">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-400/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="flex items-center gap-2 text-neutral-400 text-sm mb-1">
            <Heart className="w-4 h-4 text-rose-400" />
            Together
          </div>
          <p className="text-xl font-semibold text-white leading-tight">
            {stats.relationship.together_duration}
          </p>
          <p className="text-sm text-rose-400/80 font-medium mt-1">
            Since {formatDate(stats.relationship.paired_at)}
          </p>
          {stats.relationship.together_conversion && (
            <p className="text-sm text-rose-400/60 font-mono mt-1">
              {stats.relationship.together_conversion}
            </p>
          )}
        </div>

        {/* Card 2: Since Anniversary */}
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 relative overflow-hidden hover:border-rose-400/30 transition">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-400/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="flex items-center gap-2 text-neutral-400 text-sm mb-1">
            <CalendarDays className="w-4 h-4 text-rose-400" />
            Since Anniversary
          </div>
          <p className="text-xl font-semibold text-white leading-tight">
            {stats.relationship.anniversary_duration}
          </p>
          <p className="text-sm text-rose-400/80 font-medium mt-1">
            {stats.relationship.anniversary_date
              ? `Anniversary: ${formatDate(stats.relationship.anniversary_date)}`
              : 'No anniversary date set'}
          </p>
          {stats.relationship.anniversary_conversion && (
            <p className="text-sm text-rose-400/60 font-mono mt-1">
              {stats.relationship.anniversary_conversion}
            </p>
          )}
        </div>

        {/* Card 3: Next Anniversary */}
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 relative overflow-hidden hover:border-rose-400/30 transition">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-400/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="flex items-center gap-2 text-neutral-400 text-sm mb-1">
            <Calendar className="w-4 h-4 text-rose-400" />
            Next Anniversary
          </div>
          <p className="text-xl font-semibold text-white leading-tight">
            {stats.relationship.next_anniversary
              ? formatDate(stats.relationship.next_anniversary)
              : 'Not set'}
          </p>
          {stats.relationship.days_until_anniversary !== null && (
            <p className="text-sm text-rose-400/80 font-medium mt-1">
              {stats.relationship.days_until_anniversary === 0
                ? '🎉 Today!'
                : `${stats.relationship.days_until_anniversary} day${stats.relationship.days_until_anniversary > 1 ? 's' : ''} to go`}
            </p>
          )}
        </div>

        {/* Card 4: Next Monthsary */}
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 relative overflow-hidden hover:border-rose-400/30 transition">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-400/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="flex items-center gap-2 text-neutral-400 text-sm mb-1">
            <Calendar className="w-4 h-4 text-rose-400" />
            Next Monthsary
          </div>
          <p className="text-xl font-semibold text-white leading-tight">
            {stats.relationship.next_monthsary
              ? formatDate(stats.relationship.next_monthsary)
              : 'Not available'}
          </p>
          {stats.relationship.days_until_monthsary !== null && (
            <p className="text-sm text-rose-400/80 font-medium mt-1">
              {stats.relationship.days_until_monthsary === 0
                ? '🎉 Today!'
                : `${stats.relationship.days_until_monthsary} day${stats.relationship.days_until_monthsary > 1 ? 's' : ''} to go`}
            </p>
          )}
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-neutral-900/50 rounded-xl border border-neutral-800/50 p-4 text-center hover:bg-neutral-900/70 transition">
          <p className="text-2xl font-semibold text-white">{stats.stats.cravings}</p>
          <p className="text-xs text-neutral-500">Cravings</p>
        </div>
        <div className="bg-neutral-900/50 rounded-xl border border-neutral-800/50 p-4 text-center hover:bg-neutral-900/70 transition">
          <p className="text-2xl font-semibold text-white">{stats.stats.letters_sent}</p>
          <p className="text-xs text-neutral-500">Letters Sent</p>
        </div>
        <div className="bg-neutral-900/50 rounded-xl border border-neutral-800/50 p-4 text-center hover:bg-neutral-900/70 transition">
          <p className="text-2xl font-semibold text-white">{stats.stats.letters_received}</p>
          <p className="text-xs text-neutral-500">Letters Received</p>
        </div>
      </div>

      {/* Anniversary Editor */}
      {editingAnniversary && (
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 mb-6 animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium">Set Your Anniversary Date</h3>
            <button
              onClick={() => setEditingAnniversary(false)}
              className="text-neutral-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-3">
            <input
              type="date"
              value={newAnniversaryDate}
              onChange={(e) => setNewAnniversaryDate(e.target.value)}
              className="flex-1 bg-neutral-800/50 text-sm text-white px-4 py-2.5 rounded-xl border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-rose-400/50"
            />
            <button
              onClick={updateAnniversary}
              disabled={updatingAnniversary || !newAnniversaryDate}
              className="px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium transition flex items-center gap-2 disabled:opacity-50"
            >
              {updatingAnniversary ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bg-neutral-900/50 rounded-2xl border border-neutral-800/50 p-4 flex flex-wrap items-center justify-between text-sm text-neutral-400">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-neutral-500" />
          <span>Account age: <span className="text-white">{stats.user.account_age}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-neutral-500" />
          <span>Paired since: <span className="text-white">{formatDate(stats.relationship.paired_at)}</span></span>
        </div>
      </div>
    </div>
  );
}
