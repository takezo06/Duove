import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { Mails, PenLine } from 'lucide-react';
import { Avatar, InlineBar, inverseButton, primaryButton, secondaryButton, surface } from '../components/Card';
import { LetterReader, type Letter } from '../components/love-letters/LetterReader';
import { RecentLetters } from '../components/love-letters/RecentLetters';
import { EnvelopeCard } from '../components/love-letters/EnvelopeCard';
import { openLetter } from '../lib/openLetter';
import { SendLetterModal } from '../components/love-letters/SendLetterModal';
import { usePageTitle } from '../hooks/usePageTitle';
import { apiError } from '../lib/apiError';
import { daysAgo } from '../lib/when';

const RECENT = 6;
const READER_ID = 'open-letter';

// The letters desk: the newest letter from your partner open to read, the last few beside it,
// and the envelope box (/letters/all) for everything else.
export function LoveLetters() {
  usePageTitle('Love Letters');
  const navigate = useNavigate();
  const location = useLocation();
  const { highlightId, compose } = (location.state as { highlightId?: string; compose?: boolean } | null) ?? {};

  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unpaired, setUnpaired] = useState(false);
  const [me, setMe] = useState({ id: '', name: '' });
  const [partnerName, setPartnerName] = useState('your partner');
  const [picked, setPicked] = useState<Letter | null>(null);
  const [breaking, setBreaking] = useState(false);
  const [counts, setCounts] = useState<{ sent: number; received: number } | null>(null);
  const [composing, setComposing] = useState(Boolean(compose));
  const [attempt, setAttempt] = useState(0);
  const reader = useRef<HTMLElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const headers = { Authorization: `Bearer ${token}` };
        const api = import.meta.env.VITE_BACKEND_URL;
        const [rel, list, profile, stats] = await Promise.all([
          axios.get(`${api}/relationships/me`, { headers }),
          axios.get(`${api}/love-letters?limit=${RECENT}`, { headers }),
          supabase.from('profiles').select('display_name').eq('id', user?.id ?? '').single(),
          // the totals are a nice-to-have; the page works without them
          axios.get(`${api}/relationships/stats`, { headers }).catch(() => null),
        ]);
        const totals = stats?.data?.stats;
        if (totals) setCounts({ sent: totals.letters_sent, received: totals.letters_received });
        if (!rel.data?.relationship) { setUnpaired(true); return; }
        setPartnerName(rel.data.partner?.display_name || 'your partner');
        setMe({ id: user?.id ?? '', name: profile.data?.display_name ?? '' });
        setLetters(list.data);
        // A notification deep link opens its letter, even one older than the recent few
        if (highlightId) {
          const linked = (list.data as Letter[]).find((l) => l.id === highlightId)
            ?? (await axios.get(`${api}/love-letters`, { headers, params: { id: highlightId } })).data[0];
          if (linked) setPicked(linked);
        }
      } catch (err) {
        if ((err as { response?: { status?: number } }).response?.status === 404) setUnpaired(true);
        else setError(apiError(err, "Couldn't load your letters. Try again."));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [attempt, highlightId]);

  if (unpaired) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className={`${surface} p-8 md:p-12 text-center`}>
          <div className="flex justify-center -space-x-4 mb-5">
            <Avatar src={null} name="You" />
            <Avatar src={null} name="Your partner" dashed />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Letters need someone to read them</h1>
          <p className="text-neutral-400 max-w-md mx-auto">Connect with your partner to start writing to each other.</p>
          <button onClick={() => navigate('/partner')} className={`${primaryButton} mt-6`}>
            Connect with your partner
          </button>
        </div>
      </div>
    );
  }

  const isMine = (l: Letter) => l.sender_id === me.id;
  const latest = letters.find((l) => !isMine(l)) ?? letters[0];
  const open = picked ?? latest;
  const partner = loading ? <InlineBar w="w-14" /> : <span className="text-rose-400 font-semibold">{partnerName}</span>;

  // A letter written to you stays sealed until you tap its envelope
  const sealed = open && !open.opened_at && !isMine(open);
  const breakSeal = () => {
    if (!open || breaking) return;
    setBreaking(true);
    openLetter(open.id);
    const openedAt = new Date().toISOString();
    const id = open.id;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Let the flap lift and the letter slide out before the page swaps to the letter itself
    window.setTimeout(() => {
      setLetters((prev) => prev.map((l) => (l.id === id ? { ...l, opened_at: openedAt } : l)));
      setPicked((p) => (p?.id === id ? { ...p, opened_at: openedAt } : p));
      setBreaking(false);
    }, still ? 0 : 420);
  };

  // Tap to read, tap the same one again to go back to the latest
  const toggle = (letter: Letter) => {
    if (breaking) return;
    setPicked((p) => (p?.id === letter.id ? null : letter));
    // The reader sits under the list on narrow screens; bring it up if it's off screen or far down
    const el = reader.current;
    const top = el?.getBoundingClientRect().top ?? 0;
    if (el && (top < 0 || top > window.innerHeight / 2)) {
      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ block: 'start', behavior: still ? 'auto' : 'smooth' });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <section className={`${surface} p-6 md:p-8`}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Love letters</h1>
            <p className="text-neutral-400 mt-1">Everything you and {partner} have put in writing.</p>
            {loading ? (
              <p className="text-sm mt-1"><InlineBar w="w-40" /></p>
            ) : counts && counts.sent + counts.received > 0 && (
              <p className="text-sm text-neutral-400 mt-1">
                <span className="text-white font-medium tabular-nums">{counts.received.toLocaleString()}</span> from {partnerName}
                <span aria-hidden> · </span>
                <span className="text-white font-medium tabular-nums">{counts.sent.toLocaleString()}</span> from you
              </p>
            )}
          </div>
          {(loading || letters.length > 0) && (
            <Link to="/letters/all" className={`${secondaryButton} shrink-0 self-start`}>
              <Mails className="w-4 h-4" aria-hidden />
              Open the envelope box
            </Link>
          )}
        </div>

        {!loading && letters.length === 0 && !error && (
          <div className="mt-6 pt-6 border-t border-neutral-800">
            <p className="text-neutral-200">No letters yet.</p>
            <p className="text-sm text-neutral-400 mt-1">Write the first one and {partnerName} will see it right away.</p>
            <button onClick={() => setComposing(true)} className={`${primaryButton} mt-5`}>
              <PenLine className="w-4 h-4" aria-hidden />
              Write a letter
            </button>
          </div>
        )}

        {error && (
          <div className="mt-6 pt-6 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
            <p role="alert" className="text-sm text-rose-300">{error}</p>
            <button onClick={() => { setError(''); setLoading(true); setAttempt((a) => a + 1); }} className={secondaryButton}>Try again</button>
          </div>
        )}
      </section>

      {loading && (
        <div className="grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] gap-6" aria-busy="true">
          <div className={`${surface} h-96 animate-pulse`} />
          <div className={`${surface} h-96 animate-pulse`} />
        </div>
      )}

      {open && (
        <div className="grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] gap-6 items-start">
          <div className="space-y-6">
            {isMine(letters[0]) ? (
              <section className={`${surface} p-6`}>
                <h2 className="text-lg font-semibold text-white leading-snug">Waiting on {partnerName}</h2>
                <p className="mt-1 text-neutral-400">You wrote {daysAgo(letters[0].created_at)}. Nothing says you can't write again.</p>
                <button onClick={() => setComposing(true)} className={`${secondaryButton} mt-5`}>
                  <PenLine className="w-4 h-4" aria-hidden />
                  Write another
                </button>
              </section>
            ) : (
              <section className="rounded-2xl bg-rose-600 p-6 text-white">
                <p className="text-sm">Your turn</p>
                <h2 className="mt-3 text-lg font-semibold leading-snug">
                  {partnerName} wrote to you {daysAgo(letters[0].created_at)}.
                </h2>
                <p className="mt-1">Write back while it still feels new.</p>
                <button onClick={() => setComposing(true)} className={`${inverseButton} mt-5 w-full`}>
                  <PenLine className="w-4 h-4" aria-hidden />
                  Write to {partnerName}
                </button>
              </section>
            )}
            <RecentLetters
              letters={letters}
              openId={open.id}
              readerId={READER_ID}
              meId={me.id}
              partnerName={partnerName}
              onToggle={toggle}
            />
          </div>
          <section id={READER_ID} ref={reader} aria-label="Open letter" className={`${surface} p-6 md:p-8 scroll-mt-6`}>
            {sealed ? (
              <div className="flex flex-col items-center text-center py-6">
                <div className="w-full max-w-sm">
                  <EnvelopeCard letter={open} mine={false} partnerName={partnerName} sealed open={breaking} onOpen={breakSeal} />
                </div>
                <h2 className="mt-6 text-lg font-semibold text-white leading-snug">{partnerName} sent you a letter</h2>
                <p className="mt-1 text-neutral-400">It's still sealed. Tap the envelope to open it.</p>
              </div>
            ) : (
              <LetterReader letter={open} mine={isMine(open)} partnerName={partnerName} />
            )}
          </section>
        </div>
      )}

      {composing && (
        <SendLetterModal
          myName={me.name}
          partnerName={partnerName}
          onClose={() => setComposing(false)}
          onSent={(letter) => {
            setLetters((prev) => [letter, ...prev].slice(0, RECENT));
            setPicked(letter);
          }}
        />
      )}
    </div>
  );
}
