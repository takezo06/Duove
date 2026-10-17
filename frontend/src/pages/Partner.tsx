import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { usePageTitle } from '../hooks/usePageTitle';
import { relationshipYear } from '../lib/relationshipYear';
import { plural } from '../lib/plural';
import { Avatar, Badge, BadgeBar, CardHeader, InlineBar, focusRing, iconClass, primaryButton, secondaryButton, surface } from '../components/Card';
import {
  Loader2,
  Heart,
  CalendarDays,
  CalendarHeart,
  CalendarClock,
  Copy,
  Check,
  UserPlus,
  Link as LinkIcon,
  Pizza,
  Send,
  Mails,
  UserRound,
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
  partner: { id: string; display_name: string; avatar_url?: string | null; account_created?: string | null };
  stats: { cravings: number; letters_sent: number; letters_received: number };
}

const longDate = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
const ordinal = (n: number) => n + (['st', 'nd', 'rd'][((((n + 90) % 100) - 10) % 10) - 1] || 'th');
const monthDay = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });

// "1 year, 7 months" (or "12 days" in the first month)
function span(r: ReturnType<typeof relationshipYear>) {
  const years = r.yearNumber - 1;
  const months = r.monthOfYear - 1;
  const parts = [years && plural(years, 'year'), months && plural(months, 'month')].filter(Boolean);
  return parts.length ? parts.join(', ') : plural(Math.max(r.totalDays, 0), 'day');
}

const fmt = (n: number) => n.toLocaleString();

// Centered stat: icon + label, big value, supporting line, optional pill or extra content
function Stat({ icon, label, value, sub, children }: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <>
      <h2 className="flex items-center justify-center gap-2 text-neutral-400 text-sm">
        {icon}
        {label}
      </h2>
      <p className="text-2xl font-bold text-white mt-3 tabular-nums">{value}</p>
      {sub && <p className="text-sm text-neutral-400 mt-1">{sub}</p>}
      {children}
    </>
  );
}

export function Partner() {
  usePageTitle('Partner');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [me, setMe] = useState<{ name: string; avatar: string | null }>({ name: 'You', avatar: null });
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
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      setMe({
        name: profile?.display_name || user.email?.split('@')[0] || 'You',
        avatar: profile?.avatar_url || null,
      });

      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/relationships/stats?_t=${Date.now()}`,
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
        `${import.meta.env.VITE_BACKEND_URL}/relationships/pending?_t=${Date.now()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.invite_code) setInviteCode(res.data.invite_code);
    } catch { /* no pending invite */ }
  };

  useEffect(() => { fetchStats(); fetchPendingInvite(); }, []);

  // Ticks once a second so the Together counters run live
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ---- Actions ----
  const generateInvite = async () => {
    setGeneratingInvite(true);
    setJoinError(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/relationships/invite`,
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
        `${import.meta.env.VITE_BACKEND_URL}/relationships/join`,
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
        `${import.meta.env.VITE_BACKEND_URL}/relationships/anniversary`,
        { anniversary_date: newAnniversaryDate },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchStats();
      setEditingAnniversary(false);
    } catch (err) { console.error('Error updating anniversary:', err); }
    finally { setUpdatingAnniversary(false); }
  };

  // ==================== RENDER ====================

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <section className={`${surface} p-6 md:p-8`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Blank circles until the names land */}
            <div className="flex -space-x-4">
              <Avatar src={null} name="" />
              <Avatar src={null} name="" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  You &amp; <InlineBar w="w-20" />
                </h1>
                <BadgeBar />
              </div>
              <p className="text-sm mt-1"><InlineBar w="w-36" /></p>
            </div>
          </div>
        </section>
        <div className="space-y-6" aria-busy="true">
          <div className={`${surface} h-64 animate-pulse`} />
          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={`${surface} h-44 animate-pulse`} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 md:gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={`${surface} h-28 animate-pulse`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className={`${surface} p-8 md:p-12 text-center`}>
          <h1 className="text-2xl font-semibold text-white mb-2">Couldn't load your relationship</h1>
          <p className="text-neutral-400 mb-6">{error}</p>
          <button onClick={() => fetchStats()} className={primaryButton}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ==================== PAIRING FLOW ====================
  if (!stats) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <section className={`${surface} p-6 md:p-8 flex flex-col sm:flex-row sm:items-center gap-5`}>
          <div className="flex -space-x-4">
            <Avatar src={me.avatar} name={me.name} />
            <Avatar src={null} name="Your partner" dashed />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Connect with your partner</h1>
            <p className="text-neutral-400 mt-1">
              One of you creates a code, the other enters it. Then this page fills up with your story.
            </p>
          </div>
        </section>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          <section className={`${surface} p-6 flex flex-col`}>
            <CardHeader icon={<LinkIcon className={iconClass} aria-hidden />} title="Invite your partner" />
            {inviteCode ? (
              <>
                <p className="text-neutral-300 mt-4">Send them this code:</p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-3xl font-mono font-bold text-white tracking-widest">{inviteCode}</span>
                  <button onClick={copyInviteCode} className={secondaryButton} aria-live="polite">
                    {copied ? <Check className="w-4 h-4 text-emerald-400" aria-hidden /> : <Copy className="w-4 h-4" aria-hidden />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-sm text-neutral-400 mt-3">You'll be connected as soon as they join.</p>
                <button
                  onClick={generateInvite}
                  disabled={generatingInvite}
                  className={`mt-auto pt-5 self-start text-sm font-medium text-neutral-400 hover:text-rose-400 transition disabled:opacity-50 cursor-pointer rounded ${focusRing}`}
                >
                  Create a new code
                </button>
              </>
            ) : (
              <>
                <p className="text-neutral-300 mt-4 flex-1">Create a code and send it to your partner.</p>
                <button onClick={generateInvite} disabled={generatingInvite} className={`${primaryButton} mt-5 w-full`}>
                  {generatingInvite ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : 'Create invite code'}
                </button>
              </>
            )}
          </section>

          <section className={`${surface} p-6 flex flex-col`}>
            <CardHeader icon={<UserPlus className={iconClass} aria-hidden />} title="Join with a code" />
            <label htmlFor="join-code" className="text-neutral-300 mt-4 flex-1">
              Got a code from your partner? Enter it here.
            </label>
            <div className="flex gap-3 mt-5">
              <input
                id="join-code"
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && joinCode.trim().length === 8 && joinRelationship()}
                placeholder="8-character code"
                maxLength={8}
                autoComplete="off"
                className="min-w-0 flex-1 bg-neutral-800/50 font-mono tracking-widest text-white placeholder:tracking-normal placeholder:font-sans placeholder:normal-case placeholder-neutral-500 px-4 py-3 rounded-xl border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-rose-400/50 uppercase"
              />
              <button
                onClick={joinRelationship}
                disabled={joining || joinCode.trim().length !== 8}
                className={primaryButton}
              >
                {joining ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : 'Join'}
              </button>
            </div>
          </section>
        </div>

        {joinError && (
          <p role="alert" className="text-rose-400 text-sm">
            {joinError}
          </p>
        )}
      </div>
    );
  }

  // ==================== ACTIVE RELATIONSHIP ====================
  const partnerName = stats.partner.display_name || 'Partner';
  const rel = stats.relationship;
  const together = rel.paired_at ? relationshipYear(rel.paired_at) : null;
  const anniversary = rel.anniversary_date ? relationshipYear(rel.anniversary_date) : null;
  // Countdowns follow the same rule as the dashboard: anniversary if set, else pairing date
  const milestones = anniversary ?? together;
  const daysSinceAnniversary = anniversary
    ? Math.round((new Date().setHours(0, 0, 0, 0) - anniversary.yearStart.getTime()) / 86_400_000)
    : null;

  // Together counts from the anniversary once it has passed, else from the pairing instant
  const since = anniversary && anniversary.start.getTime() <= now ? anniversary : together;
  const sinceTime = anniversary && since === anniversary ? anniversary.start.getTime() : rel.paired_at ? new Date(rel.paired_at).getTime() : now;
  const elapsed = Math.max(0, now - sinceTime);
  const totalSeconds = Math.floor(elapsed / 1000);
  const units = [
    { label: 'Weeks', value: Math.floor(totalSeconds / 604_800) },
    { label: 'Hours', value: Math.floor(totalSeconds / 3_600) },
    { label: 'Minutes', value: Math.floor(totalSeconds / 60) },
    { label: 'Seconds', value: totalSeconds },
  ];

  // How far through the current month (monthsary to monthsary)
  const monthDays = milestones ? Math.round((milestones.nextMonthsary.getTime() - milestones.lastMonthsary.getTime()) / 86_400_000) : 0;
  const monthProgress = milestones && monthDays ? Math.min(1, Math.max(0, 1 - milestones.daysToMonthsary / monthDays)) : 0;

  const countdown = (days: number, today: boolean) => (
    <div className="mt-4">
      {today ? <Badge tone="rose">Today</Badge> : <Badge tone={days <= 7 ? 'rose' : 'neutral'}>in {plural(days, 'day')}</Badge>}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <section className={`${surface} p-6 md:p-8`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex -space-x-4">
            <Avatar src={me.avatar} name={me.name} />
            <Avatar src={stats.partner.avatar_url ?? null} name={partnerName} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                You &amp; <span className="text-rose-400">{partnerName}</span>
              </h1>
              <Badge tone="emerald">Connected</Badge>
            </div>
            <p className="text-neutral-400 text-sm mt-1">
              {together ? `Paired on ${longDate(together.start)}` : 'Paired'}
            </p>
          </div>
          {!editingAnniversary && (
            <button onClick={() => setEditingAnniversary(true)} className={`${secondaryButton} self-start sm:self-center`}>
              <CalendarHeart className="w-4 h-4 text-rose-400" aria-hidden />
              {rel.anniversary_date ? 'Edit anniversary' : 'Set anniversary'}
            </button>
          )}
        </div>

        {editingAnniversary && (
          <form
            className="mt-6 pt-6 border-t border-neutral-800"
            onSubmit={(e) => {
              e.preventDefault();
              updateAnniversary();
            }}
          >
            <label htmlFor="anniversary" className="block text-sm text-neutral-400 mb-2">
              Your anniversary date
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="anniversary"
                type="date"
                autoFocus
                value={newAnniversaryDate}
                onChange={(e) => setNewAnniversaryDate(e.target.value)}
                className="flex-1 bg-neutral-800/50 text-white px-4 py-2.5 rounded-xl border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-rose-400/50 [color-scheme:dark]"
              />
              <div className="flex gap-3">
                <button type="submit" disabled={updatingAnniversary || !newAnniversaryDate} className={`${primaryButton} flex-1`}>
                  {updatingAnniversary && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
                  Save
                </button>
                <button type="button" onClick={() => setEditingAnniversary(false)} className={`${secondaryButton} flex-1`}>
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}
      </section>

      {/* Together, counted live */}
      <section className={`${surface} p-6 md:p-8 text-center`}>
        <h2 className="flex items-center justify-center gap-2 text-neutral-400 text-sm">
          <Heart className={iconClass} aria-hidden />
          Together
        </h2>
        {since ? (
          <>
            <p className="text-4xl md:text-5xl font-bold text-white mt-3 tabular-nums">
              {fmt(Math.floor(totalSeconds / 86_400))} <span className="text-2xl md:text-3xl font-semibold text-neutral-300">days</span>
            </p>
            <p className="text-neutral-400 mt-2">
              {span(since)} since {longDate(since.start)}
            </p>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              {units.map((u) => (
                <div key={u.label} className="rounded-xl bg-neutral-800/40 border border-neutral-800 px-3 py-4">
                  <dd className="text-lg md:text-xl font-semibold text-white tabular-nums">{fmt(u.value)}</dd>
                  <dt className="text-xs text-neutral-400 mt-1">{u.label}</dt>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <p className="text-2xl font-bold text-white mt-3">Just started</p>
        )}
      </section>

      {/* Milestones */}
      <div className="grid md:grid-cols-3 gap-4 md:gap-6">
        <section className={`${surface} p-6 text-center flex flex-col`}>
          {anniversary && daysSinceAnniversary !== null && daysSinceAnniversary >= 0 ? (
            <Stat
              icon={<CalendarDays className={iconClass} aria-hidden />}
              label="Since your anniversary"
              value={plural(daysSinceAnniversary, 'day')}
              sub={`Celebrated every ${monthDay(anniversary.start)}`}
            >
              <div className="mt-4">
                <Badge tone="neutral">Year {anniversary.yearNumber}</Badge>
              </div>
            </Stat>
          ) : anniversary ? (
            <Stat
              icon={<CalendarDays className={iconClass} aria-hidden />}
              label="Since your anniversary"
              value="Coming up"
              sub={`Starts ${longDate(anniversary.start)}`}
            />
          ) : (
            <Stat icon={<CalendarDays className={iconClass} aria-hidden />} label="Since your anniversary" value="Not set">
              <button
                onClick={() => setEditingAnniversary(true)}
                className={`mt-3 mx-auto text-sm font-medium text-rose-400 hover:text-rose-300 transition cursor-pointer rounded ${focusRing}`}
              >
                Set your anniversary date
              </button>
            </Stat>
          )}
        </section>

        <section className={`${surface} p-6 text-center`}>
          {milestones ? (
            <Stat
              icon={<CalendarHeart className={iconClass} aria-hidden />}
              label="Next anniversary"
              value={monthDay(milestones.isAnniversary ? milestones.yearStart : milestones.yearEnd)}
              sub={milestones.isAnniversary ? 'Happy anniversary' : `Your ${ordinal(milestones.yearNumber)} anniversary · ${milestones.yearEnd.getFullYear()}`}
            >
              {countdown(milestones.daysToAnniversary, milestones.isAnniversary)}
            </Stat>
          ) : (
            <Stat icon={<CalendarHeart className={iconClass} aria-hidden />} label="Next anniversary" value="Not set" />
          )}
        </section>

        <section className={`${surface} p-6 text-center`}>
          {milestones ? (
            <Stat
              icon={<CalendarClock className={iconClass} aria-hidden />}
              label="Next monthsary"
              value={monthDay(milestones.isMonthsary ? new Date() : milestones.nextMonthsary)}
              sub={milestones.isMonthsary ? 'Happy monthsary' : `Every month on day ${milestones.start.getDate()}`}
            >
              <div
                className="mt-4 h-1.5 rounded-full bg-neutral-800 overflow-hidden"
                role="progressbar"
                aria-label="Progress to next monthsary"
                aria-valuenow={Math.round(monthProgress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="h-full rounded-full bg-rose-500" style={{ width: `${monthProgress * 100}%` }} />
              </div>
              {countdown(milestones.daysToMonthsary, milestones.isMonthsary)}
            </Stat>
          ) : (
            <Stat icon={<CalendarClock className={iconClass} aria-hidden />} label="Next monthsary" value="Not available" />
          )}
        </section>
      </div>

      {/* Activity */}
      <div className="grid grid-cols-3 gap-3 md:gap-6">
        {[
          { to: '/cravings', icon: Pizza, label: 'Cravings', value: stats.stats.cravings },
          { to: '/letters', icon: Send, label: 'Letters sent', value: stats.stats.letters_sent },
          { to: '/letters', icon: Mails, label: 'Letters received', value: stats.stats.letters_received },
        ].map(({ to, icon: Icon, label, value }) => (
          <Link
            key={label}
            to={to}
            className={`group ${surface} px-3 py-5 md:p-6 text-center hover:border-rose-400/30 transition ${focusRing}`}
          >
            <Icon className={`${iconClass} mx-auto`} aria-hidden />
            <p className="text-2xl md:text-3xl font-bold text-white mt-3 tabular-nums">{fmt(value)}</p>
            <p className="text-xs md:text-sm text-neutral-400 group-hover:text-rose-400 transition mt-1">{label}</p>
          </Link>
        ))}
      </div>
      {/* Accounts */}
      <footer className="rounded-2xl border border-neutral-800 bg-neutral-900/50 px-5 py-4 flex flex-col sm:flex-row sm:justify-between gap-2 text-sm text-neutral-400">
        {[
          { who: 'You', created: stats.user.account_created, highlight: false },
          { who: partnerName, created: stats.partner.account_created, highlight: true },
        ]
          .filter((a) => a.created)
          .map((a) => (
            <p key={a.who} className="flex items-center gap-2">
              <UserRound className="w-4 h-4 text-neutral-500 shrink-0" aria-hidden />
              <span>
                <span className={a.highlight ? 'text-rose-400 font-medium' : 'text-neutral-200 font-medium'}>{a.who}</span>
                {' '}joined Duove on <span className="text-neutral-200">{longDate(new Date(a.created!))}</span>
              </span>
            </p>
          ))}
      </footer>
    </div>
  );
}
