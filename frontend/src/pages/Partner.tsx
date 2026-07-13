import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { usePageTitle } from '../hooks/usePageTitle';
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
  Copy,
  Check,
  UserPlus,
  Link as LinkIcon,
} from 'lucide-react';

// ---------- Types ----------
interface Stats {
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
  partner: { id: string; display_name: string };
  stats: { cravings: number; letters_sent: number; letters_received: number };
}

// ---------- Skeleton ----------
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
  usePageTitle('Partner');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingAnniversary, setEditingAnniversary] = useState(false);
  const [newAnniversaryDate, setNewAnniversaryDate] = useState('');
  const [updatingAnniversary, setUpdatingAnniversary] = useState(false);
  const navigate = useNavigate();

  // ---- Invite / Join state ----
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ---------- Data fetching ----------
  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/relationships/stats?_t=${Date.now()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStats(res.data);
      if (res.data.relationship.anniversary_date) {
        setNewAnniversaryDate(res.data.relationship.anniversary_date);
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setStats(null);
        setError(null);
      } else {
        setError('Failed to load relationship data.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingInvite = async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/relationships/pending?_t=${Date.now()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.invite_code) setInviteCode(res.data.invite_code);
    } catch { /* no pending invite */ }
  };

  useEffect(() => { fetchStats(); fetchPendingInvite(); }, []);

  // ---- Actions ----
  const generateInvite = async () => {
    setGeneratingInvite(true);
    setJoinError(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/relationships/invite`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInviteCode(res.data.invite_code);
    } catch (err: any) {
      setJoinError(err.response?.data?.error || 'Failed to generate invite code.');
    } finally { setGeneratingInvite(false); }
  };

  const joinRelationship = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinError(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/relationships/join`,
        { invite_code: joinCode.trim().toUpperCase() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchStats();
      setJoinCode('');
    } catch (err: any) {
      setJoinError(err.response?.data?.error || 'Failed to join. Check the code and try again.');
    } finally { setJoining(false); }
  };

  const copyInviteCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const updateAnniversary = async () => {
    if (!newAnniversaryDate) return;
    setUpdatingAnniversary(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      await axios.patch(
        `${import.meta.env.VITE_BACKEND_URL}/api/relationships/anniversary`,
        { anniversary_date: newAnniversaryDate },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchStats();
      setEditingAnniversary(false);
    } catch (err) { console.error('Error updating anniversary:', err); }
    finally { setUpdatingAnniversary(false); }
  };

  const formatDate = (dateStr: string | null) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'Not set';

  // ==================== RENDER ====================

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto animate-pulse px-4 py-6">
        <div className="flex items-center justify-between mb-8">
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
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 px-4">
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-8">
          <p className="text-neutral-400">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ==================== PAIRING FLOW ====================
  if (!stats) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-8 md:p-12 shadow-xl text-center">
          <div className="w-16 h-16 bg-rose-400/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-400/20">
            <UserPlus className="w-8 h-8 text-rose-400" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">You're not paired yet</h2>
          <p className="text-neutral-400 max-w-md mx-auto mb-8">
            Generate an invite code and share it with your partner, or enter a code you received to connect.
          </p>

          <div className="border border-neutral-800 rounded-2xl p-6 mb-6 bg-neutral-800/20">
            <h3 className="text-white font-medium mb-4 flex items-center justify-center gap-2">
              <LinkIcon className="w-4 h-4 text-rose-400" />
              Create Invite Code
            </h3>
            {inviteCode ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-3xl font-mono font-bold text-rose-400 tracking-widest">{inviteCode}</span>
                  <button onClick={copyInviteCode} className="p-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-neutral-300 hover:text-white transition">
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-neutral-500">Share this code with your partner. Once they join, you'll appear here.</p>
                <button onClick={generateInvite} disabled={generatingInvite} className="text-sm text-rose-400 hover:underline disabled:opacity-50">
                  Generate new code
                </button>
              </div>
            ) : (
              <button onClick={generateInvite} disabled={generatingInvite} className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium transition disabled:opacity-50">
                {generatingInvite ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Generate Invite Code'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-neutral-800" />
            <span className="text-neutral-600 text-xs font-medium">OR</span>
            <div className="flex-1 h-px bg-neutral-800" />
          </div>

          <div className="border border-neutral-800 rounded-2xl p-6 bg-neutral-800/20">
            <h3 className="text-white font-medium mb-4 flex items-center justify-center gap-2">
              <UserPlus className="w-4 h-4 text-rose-400" />
              Join with a Code
            </h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter 8‑character code"
                maxLength={8}
                className="flex-1 bg-neutral-800/50 text-sm text-white placeholder-neutral-500 px-4 py-3 rounded-xl border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-rose-400/50 uppercase"
              />
              <button
                onClick={joinRelationship}
                disabled={joining || joinCode.trim().length !== 8}
                className="px-5 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium transition disabled:opacity-50"
              >
                {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join'}
              </button>
            </div>
            {joinError && <p className="text-rose-400 text-sm mt-3">{joinError}</p>}
          </div>
        </div>
      </div>
    );
  }

  // ==================== ACTIVE RELATIONSHIP ====================
  const partnerName = stats.partner.display_name || 'Partner';
  const cardBase = 'bg-neutral-900 rounded-2xl border border-neutral-800 p-6 relative overflow-hidden hover:border-rose-400/30 transition-all duration-200';

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-400/10 flex items-center justify-center border border-rose-400/20">
            <Heart className="w-6 h-6 text-rose-400 fill-rose-400/20" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Your Relationship</h1>
            <p className="text-neutral-400 text-sm flex items-center gap-2 mt-0.5">
              with <span className="text-rose-400 font-medium">{partnerName}</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Connected
              </span>
            </p>
          </div>
        </div>
        <button onClick={() => setEditingAnniversary(true)} className="text-xs text-neutral-400 hover:text-rose-400 transition flex items-center gap-1.5">
          <Edit2 className="w-3.5 h-3.5" />
          {stats.relationship.anniversary_date ? 'Edit anniversary' : 'Set anniversary'}
        </button>
      </div>

      {/* Stats Grid – 2x2 */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className={cardBase}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-400/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-neutral-400 text-sm mb-2">
              <Heart className="w-4 h-4 text-rose-400" />
              Together
            </div>
            <p className="text-2xl font-semibold text-white leading-tight">{stats.relationship.together_duration}</p>
            <p className="text-sm text-rose-400/80 font-medium mt-1.5">Since {formatDate(stats.relationship.paired_at)}</p>
            {stats.relationship.together_conversion && (
              <p className="text-sm text-rose-400/60 font-mono mt-1.5">{stats.relationship.together_conversion}</p>
            )}
          </div>
        </div>

        <div className={cardBase}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-400/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-neutral-400 text-sm mb-2">
              <CalendarDays className="w-4 h-4 text-rose-400" />
              Since Anniversary
            </div>
            <p className="text-2xl font-semibold text-white leading-tight">{stats.relationship.anniversary_duration}</p>
            <p className="text-sm text-rose-400/80 font-medium mt-1.5">
              {stats.relationship.anniversary_date ? `Anniversary: ${formatDate(stats.relationship.anniversary_date)}` : 'No anniversary date set'}
            </p>
            {stats.relationship.anniversary_conversion && (
              <p className="text-sm text-rose-400/60 font-mono mt-1.5">{stats.relationship.anniversary_conversion}</p>
            )}
          </div>
        </div>

        <div className={cardBase}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-400/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-neutral-400 text-sm mb-2">
              <Calendar className="w-4 h-4 text-rose-400" />
              Next Anniversary
            </div>
            <p className="text-2xl font-semibold text-white leading-tight">
              {stats.relationship.next_anniversary ? formatDate(stats.relationship.next_anniversary) : 'Not set'}
            </p>
            {stats.relationship.days_until_anniversary !== null && (
              <p className="text-sm text-rose-400/80 font-medium mt-1.5">
                {stats.relationship.days_until_anniversary === 0 ? '🎉 Today!' : `${stats.relationship.days_until_anniversary} day${stats.relationship.days_until_anniversary > 1 ? 's' : ''} to go`}
              </p>
            )}
          </div>
        </div>

        <div className={cardBase}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-400/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-neutral-400 text-sm mb-2">
              <Calendar className="w-4 h-4 text-rose-400" />
              Next Monthsary
            </div>
            <p className="text-2xl font-semibold text-white leading-tight">
              {stats.relationship.next_monthsary ? formatDate(stats.relationship.next_monthsary) : 'Not available'}
            </p>
            {stats.relationship.days_until_monthsary !== null && (
              <p className="text-sm text-rose-400/80 font-medium mt-1.5">
                {stats.relationship.days_until_monthsary === 0 ? '🎉 Today!' : `${stats.relationship.days_until_monthsary} day${stats.relationship.days_until_monthsary > 1 ? 's' : ''} to go`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-neutral-900/50 rounded-xl border border-neutral-800/50 p-4 text-center hover:bg-neutral-900/70 transition">
          <p className="text-2xl font-semibold text-white">{stats.stats.cravings}</p>
          <p className="text-xs text-neutral-500 mt-1">Cravings</p>
        </div>
        <div className="bg-neutral-900/50 rounded-xl border border-neutral-800/50 p-4 text-center hover:bg-neutral-900/70 transition">
          <p className="text-2xl font-semibold text-white">{stats.stats.letters_sent}</p>
          <p className="text-xs text-neutral-500 mt-1">Letters Sent</p>
        </div>
        <div className="bg-neutral-900/50 rounded-xl border border-neutral-800/50 p-4 text-center hover:bg-neutral-900/70 transition">
          <p className="text-2xl font-semibold text-white">{stats.stats.letters_received}</p>
          <p className="text-xs text-neutral-500 mt-1">Letters Received</p>
        </div>
      </div>

      {/* Anniversary Editor */}
      {editingAnniversary && (
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium">Set Your Anniversary Date</h3>
            <button onClick={() => setEditingAnniversary(false)} className="text-neutral-400 hover:text-white transition">
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
