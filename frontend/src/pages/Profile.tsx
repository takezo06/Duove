import { useState, useEffect, useRef } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { usePageTitle } from '../hooks/usePageTitle';
import { apiError } from '../lib/apiError';
import { refreshRelationship, useMyProfile, useRelationship } from '../hooks/useShared';
import {
  Avatar,
  CardHeader,
  InlineBar,
  deleteButton,
  field,
  focusRing,
  iconClass,
  keepButton,
  primaryButton,
  secondaryButton,
  surface,
} from '../components/Card';
import { LegalLinks } from '../components/Legal';
import { ArrowRight, CalendarDays, Camera, Check, Heart, KeyRound, Loader2, Mail, Pencil, ShieldCheck, Trash2 } from 'lucide-react';

interface ProfileRow {
  display_name: string;
  avatar_url: string | null;
  created_at?: string;
  has_periods?: boolean | null; // "Do you have periods?", null until answered
}

const api = import.meta.env.VITE_BACKEND_URL;
const authHeaders = async () => ({
  Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
});
const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

// A destructive action confirmed inline: the button turns into the rose confirm and Keep
function ConfirmAction({ label, confirmLabel, question, fallback, onConfirm }: {
  label: string;
  confirmLabel: string;
  question: string;
  fallback: string;
  onConfirm: () => Promise<void>;
}) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(apiError(err, fallback));
      setBusy(false);
      setAsking(false);
    }
  };

  return (
    <div className="mt-5">
      {asking ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="text-sm text-neutral-200">{question}</p>
          <div className="flex gap-2">
            <button onClick={run} disabled={busy} className={deleteButton}>
              {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
              {confirmLabel}
            </button>
            <button onClick={() => setAsking(false)} disabled={busy} autoFocus className={keepButton}>
              Keep
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAsking(true)} className={secondaryButton}>
          {label}
        </button>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
    </div>
  );
}

function Tile({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className={`${surface} p-6 flex flex-col`}>
      <CardHeader icon={icon} title={title} />
      {children}
    </section>
  );
}

function PasswordTile({ email }: { email: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setState('sending');
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) {
      setError("The reset link didn't send. Try again.");
      setState('idle');
    } else setState('sent');
  };

  return (
    <Tile icon={<KeyRound className={iconClass} aria-hidden />} title="Password">
      <p className="text-neutral-200 mt-4 flex-1">
        We'll email a link to change it to{' '}
        {email ? <span className="text-white font-medium break-words">{email}</span> : <InlineBar w="w-40" />}.
      </p>
      {state === 'sent' ? (
        <p role="status" className="mt-5 min-h-10 flex items-center gap-2 text-sm text-emerald-400">
          <Check className="w-4 h-4" aria-hidden />
          Sent. Check your inbox.
        </p>
      ) : (
        <button onClick={send} disabled={!email || state === 'sending'} className={`${secondaryButton} mt-5 self-start`}>
          {state === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Mail className="w-4 h-4" aria-hidden />}
          {state === 'sending' ? 'Sending...' : 'Email me a reset link'}
        </button>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
    </Tile>
  );
}

// Whether Duove tracks a cycle for you. Off keeps your logs but hides them from your partner.
function CycleTile({ value, partnerName, onChange }: { value: boolean | null | undefined; partnerName: string | null | undefined; onChange: (v: boolean) => Promise<void> }) {
  const [busy, setBusy] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = async (v: boolean) => {
    setBusy(v);
    setError(null);
    try {
      await onChange(v);
    } catch (err) {
      setError(apiError(err, "That didn't save. Try again."));
    } finally {
      setBusy(null);
    }
  };
  const button = (v: boolean, label: string) => (
    <button onClick={() => set(v)} disabled={busy !== null} className={secondaryButton}>
      {busy === v && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
      {label}
    </button>
  );
  const partner = partnerName ? <span className="text-rose-400 font-semibold">{partnerName}</span> : 'Your partner';

  return (
    <Tile icon={<CalendarDays className={iconClass} aria-hidden />} title="Cycle tracking">
      {value === undefined ? (
        <p className="mt-4 flex-1"><InlineBar w="w-44" /></p>
      ) : (
        <p className="text-neutral-200 mt-4 flex-1">
          {value === true ? (
            <>Duove tracks your cycle, and {partner} can see it.</>
          ) : value === false ? (
            <>Duove doesn't track a cycle for you. Anything you logged before stays saved, hidden from {partner}.</>
          ) : (
            "You haven't said whether you have periods yet."
          )}
        </p>
      )}
      {value !== undefined && (
        <div className="mt-5 flex flex-wrap gap-3">
          {value !== true && button(true, 'Track my cycle')}
          {value !== false && button(false, value === null ? "I don't have periods" : 'Stop tracking my cycle')}
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
    </Tile>
  );
}

export function Profile() {
  usePageTitle('Profile');
  const navigate = useNavigate();
  // undefined = still loading, null = loaded but not there (no profile, not paired)
  const [profile, setProfile] = useState<ProfileRow | undefined>();
  const [email, setEmail] = useState('');
  // undefined = loading, null = not paired. Any failure reads as "not paired"; the Partner page it links to shows the real state.
  const rel = useRelationship();
  const partnerName = rel.data === undefined && !rel.error ? undefined : rel.data?.partner?.display_name || (rel.data ? 'your partner' : null);
  const setMyProfile = useMyProfile().set;
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        // The local session, not getUser(): that one is a round trip before the profile can start
        const user = (await supabase.auth.getSession()).data.session?.user;
        if (!user) {
          navigate('/login');
          return;
        }
        setEmail(user.email ?? '');
        const headers = await authHeaders();
        const res = await axios.get(`${api}/profile`, { headers });
        setProfile(res.data);
      } catch (err) {
        setError(apiError(err, "Couldn't load your profile. Try again."));
      }
    };
    load();
  }, [navigate, attempt]);

  const startEdit = () => {
    setDisplayName(profile?.display_name ?? '');
    setSaveError(null);
    setEditing(true);
  };

  const stopEdit = () => {
    setEditing(false);
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const uploadAvatar = async (file: File) => {
    const { data: { user } } = await supabase.auth.getUser();
    const path = `${user?.id}/${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { cacheControl: '3600', upsert: true });
    if (error) throw new Error(error.message);
    return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  };

  const name = displayName.trim();
  const dirty = !!avatarFile || name !== profile?.display_name;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !dirty) return;
    setSaving(true);
    setSaveError(null);
    try {
      const update: Partial<ProfileRow> = {};
      if (name !== profile?.display_name) update.display_name = name;
      if (avatarFile) update.avatar_url = await uploadAvatar(avatarFile);
      const res = await axios.patch(`${api}/profile`, update, { headers: await authHeaders() });
      setProfile(res.data);
      // The sidebar and every other page show the new name and photo from the cache
      setMyProfile({ display_name: res.data.display_name, avatar_url: res.data.avatar_url });
      stopEdit();
    } catch (err) {
      setSaveError(apiError(err, "Your changes didn't save. Try again."));
    } finally {
      setSaving(false);
    }
  };

  const shownName = editing && name ? name : profile?.display_name ?? '';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <section className={`${surface} p-6 md:p-8`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <Avatar src={avatarPreview ?? profile?.avatar_url ?? null} name={shownName} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-white break-words">
              {profile ? shownName || 'You' : <InlineBar w="w-32" />}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-400">
              {email ? <span className="break-words">{email}</span> : <InlineBar w="w-40" />}
              {profile?.created_at && (
                <>
                  <span aria-hidden className="hidden sm:inline">·</span>
                  <span>
                    Joined Duove on <time dateTime={profile.created_at}>{longDate(profile.created_at)}</time>
                  </span>
                </>
              )}
            </p>
          </div>
          {profile && !editing && (
            <button onClick={startEdit} className={`${secondaryButton} self-start sm:self-center`}>
              <Pencil className="w-4 h-4 text-rose-400" aria-hidden />
              Edit profile
            </button>
          )}
        </div>

        {error && (
          <div className="mt-6 pt-6 border-t border-neutral-800">
            <p role="alert" className="text-sm text-rose-300">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setAttempt((a) => a + 1);
              }}
              className={`${secondaryButton} mt-4`}
            >
              Try again
            </button>
          </div>
        )}

        {editing && (
          <form onSubmit={save} className="mt-6 pt-6 border-t border-neutral-800">
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="display-name" className="block text-sm text-neutral-400 mb-2">
                  Display name
                </label>
                <input
                  id="display-name"
                  type="text"
                  autoFocus
                  maxLength={40}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="What should we call you?"
                  className={field}
                />
                <p className="text-xs text-neutral-400 mt-2">
                  {partnerName ? (
                    <>
                      This is the name <span className="text-rose-400 font-medium">{partnerName}</span> sees.
                    </>
                  ) : (
                    'Your partner will see this name.'
                  )}
                </p>
              </div>
              <div>
                <span className="block text-sm text-neutral-400 mb-2">Photo</span>
                <button type="button" onClick={() => fileInput.current?.click()} className={secondaryButton}>
                  <Camera className="w-4 h-4" aria-hidden />
                  {avatarFile ? 'Choose another photo' : profile?.avatar_url ? 'Change photo' : 'Add a photo'}
                </button>
                <input ref={fileInput} type="file" accept="image/*" onChange={pickPhoto} className="hidden" aria-label="Profile photo" />
                <p className="text-xs text-neutral-400 mt-2 truncate">
                  {avatarFile ? `${avatarFile.name} shows above until you save.` : 'A square photo looks best.'}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button type="submit" disabled={saving || !name || !dirty} className={primaryButton}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              <button type="button" onClick={stopEdit} disabled={saving} className={secondaryButton}>
                Cancel
              </button>
            </div>
            {saveError && <p role="alert" className="mt-4 text-sm text-rose-300">{saveError}</p>}
          </form>
        )}
      </section>

      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        <PasswordTile email={email} />

        <Tile icon={<Heart className={iconClass} aria-hidden />} title="Your relationship">
          {partnerName === undefined ? (
            <p className="mt-4 flex-1"><InlineBar w="w-44" /></p>
          ) : partnerName ? (
            <>
              <p className="text-neutral-200 mt-4 flex-1">
                You're paired with <span className="text-rose-400 font-semibold">{partnerName}</span>.
              </p>
              <ConfirmAction
                label="Leave relationship"
                confirmLabel="Leave"
                question={`This ends it for you and ${partnerName}. It can't be undone.`}
                fallback="The relationship wasn't removed. Try again."
                onConfirm={async () => {
                  await axios.delete(`${api}/relationships`, { headers: await authHeaders() });
                  // Drop the cached partner first, or the reload would still show them
                  await refreshRelationship();
                  window.location.reload();
                }}
              />
            </>
          ) : (
            <>
              <p className="text-neutral-200 mt-4 flex-1">You're not paired yet.</p>
              <Link
                to="/partner"
                className={`group mt-5 self-start inline-flex items-center gap-2 text-sm font-medium text-rose-400 hover:text-rose-300 transition rounded ${focusRing}`}
              >
                Connect with your partner
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden />
              </Link>
            </>
          )}
        </Tile>
      </div>

      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        <CycleTile
          value={profile === undefined ? undefined : (profile?.has_periods ?? null)}
          partnerName={partnerName}
          onChange={async (has_periods) => {
            const res = await axios.patch(`${api}/profile`, { has_periods }, { headers: await authHeaders() });
            setProfile(res.data);
          }}
        />
        <Tile icon={<Trash2 className={iconClass} aria-hidden />} title="Delete account">
          <p className="text-neutral-200 mt-4 flex-1">This signs you out and removes your account for good.</p>
          <ConfirmAction
            label="Delete my account"
            confirmLabel="Delete"
            question="Delete your account? It can't be undone."
            fallback="Your account wasn't deleted. Try again."
            onConfirm={async () => {
              await axios.delete(`${api}/account`, { headers: await authHeaders() });
              await supabase.auth.signOut();
              window.location.href = '/login';
            }}
          />
        </Tile>
      </div>

      <Tile icon={<ShieldCheck className={iconClass} aria-hidden />} title="Privacy">
        <p className="text-neutral-200 mt-4 flex-1">What Duove keeps, who sees it, and what stays on this device.</p>
        <LegalLinks className="mt-3" />
      </Tile>
    </div>
  );
}
