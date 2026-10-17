import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Badge, BadgeBar, InlineBar, Modal, focusRing, primaryButton, secondaryButton, surface } from '../components/Card';
import { EnvelopeCard, EnvelopeSkeleton } from '../components/love-letters/EnvelopeCard';
import { LetterReader, type Letter } from '../components/love-letters/LetterReader';
import { usePageTitle } from '../hooks/usePageTitle';
import { apiError } from '../lib/apiError';
import { groupByDate } from '../lib/groupByDate';
import { openLetter as breakSeal } from '../lib/openLetter';
import { plural } from '../lib/plural';

const PAGE = 30;

// One page of letters, newest first. `before` is the created_at of the oldest letter already shown.
async function fetchLetters(before?: string): Promise<Letter[]> {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/love-letters`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { limit: PAGE, before },
  });
  return res.data;
}

export function AllLoveLetters() {
  usePageTitle('Envelope Box');
  const [letters, setLetters] = useState<Letter[]>([]);
  const [meId, setMeId] = useState('');
  const [partnerName, setPartnerName] = useState('your partner');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [readingId, setReadingId] = useState<string | null>(null);
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const headers = { Authorization: `Bearer ${token}` };
        const [{ data: { user } }, rel, page, stats] = await Promise.all([
          supabase.auth.getUser(),
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/relationships/me`, { headers }),
          fetchLetters(),
          // the total is a nice-to-have; the box works without it
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/relationships/stats`, { headers }).catch(() => null),
        ]);
        const totals = stats?.data?.stats;
        if (totals) setTotal(totals.letters_sent + totals.letters_received);
        setMeId(user?.id ?? '');
        setPartnerName(rel.data?.partner?.display_name || 'your partner');
        setLetters(page);
        setHasMore(page.length === PAGE);
      } catch (err) {
        // 404 means not paired yet, which shows the same empty box as no letters
        if ((err as { response?: { status?: number } }).response?.status !== 404) {
          setError(apiError(err, "Couldn't load your letters. Try again."));
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [attempt]);

  const loadMore = useCallback(async () => {
    if (busy.current || letters.length === 0) return;
    busy.current = true;
    setLoadingMore(true);
    setMoreError('');
    try {
      const page = await fetchLetters(letters[letters.length - 1].created_at);
      setLetters((prev) => [...prev, ...page]);
      setHasMore(page.length === PAGE);
    } catch (err) {
      setMoreError(apiError(err, "Couldn't load older letters. Try again."));
    } finally {
      busy.current = false;
      setLoadingMore(false);
    }
  }, [letters]);

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

  // Reading a sealed letter that was written to you breaks its seal, here and on the server
  const markRead = (id: string) => {
    const letter = letters.find((l) => l.id === id);
    if (!letter || letter.opened_at || letter.sender_id === meId) return;
    breakSeal(id);
    const openedAt = new Date().toISOString();
    setLetters((prev) => prev.map((l) => (l.id === id ? { ...l, opened_at: openedAt } : l)));
  };
  const openLetter = (id: string) => {
    if (openId) return;
    setOpenId(id);
    // Let the flap and the letter finish moving before the reader covers them
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => { setReadingId(id); markRead(id); }, still ? 0 : 420);
  };
  const show = (id: string) => { setOpenId(id); setReadingId(id); markRead(id); };
  const close = () => { setReadingId(null); setOpenId(null); };

  const partner = loading ? <InlineBar w="w-14" /> : <span className="text-rose-400 font-semibold">{partnerName}</span>;
  const index = letters.findIndex((l) => l.id === readingId);
  const reading = index >= 0 ? letters[index] : null;
  const first = letters[letters.length - 1];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <section className={`${surface} p-6 md:p-8`}>
        <Link
          to="/letters"
          className={`group -ml-1 px-1 min-h-10 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-400 hover:text-rose-400 transition rounded ${focusRing}`}
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 motion-reduce:transform-none" aria-hidden />
          Love letters
        </Link>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">The envelope box</h1>
            <p className="text-neutral-400 mt-1">
          {loading || letters.length > 0
            ? <>Every letter you and {partner} have sent. Tap one to open it.</>
            : <>Letters you and {partner} send each other end up here.</>}
            </p>
          </div>
          {loading ? <BadgeBar /> : !!total && (
            <Badge tone="neutral">{plural(total, 'letter')} kept</Badge>
          )}
        </div>

        {error && (
          <div className="mt-6 pt-6 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
            <p role="alert" className="text-sm text-rose-300">{error}</p>
            <button onClick={() => { setError(''); setLoading(true); setAttempt((a) => a + 1); }} className={secondaryButton}>
              Try again
            </button>
          </div>
        )}
      </section>

      {loading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6" aria-busy="true">
          {[...Array(8)].map((_, i) => <EnvelopeSkeleton key={i} />)}
        </div>
      )}

      {!loading && letters.length === 0 && !error && (
        <div className={`${surface} px-6 py-14 text-center`}>
          <p className="text-lg font-semibold text-white">No letters yet</p>
          <p className="text-neutral-400 mt-1">Write the first one and {partnerName} will see it right away.</p>
          <Link to="/letters" state={{ compose: true }} className={`${primaryButton} mt-5`}>
            Write a letter
          </Link>
        </div>
      )}

      {groupByDate(letters, { year: 'numeric' }).map((g) => (
        <section key={g.label}>
          <h2 className="text-sm font-semibold text-white tabular-nums px-1 mb-3">{g.label}</h2>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {g.items.map((l) => (
              <li key={l.id}>
                <EnvelopeCard
                  letter={l}
                  mine={l.sender_id === meId}
                  partnerName={partnerName}
                  sealed={!l.opened_at}
                  open={openId === l.id}
                  onOpen={() => openLetter(l.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {hasMore ? (
        <div ref={sentinel} className="flex flex-col items-center gap-3">
          {moreError && <p role="alert" className="text-sm text-rose-300">{moreError}</p>}
          <button onClick={loadMore} disabled={loadingMore} className={secondaryButton}>
            {loadingMore && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
            {loadingMore ? 'Loading...' : moreError ? 'Try again' : 'Load older letters'}
          </button>
        </div>
      ) : (
        first && (
          <p className="text-sm text-neutral-400 text-center">
            That's every letter, back to the first one on{' '}
            {new Date(first.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}.
          </p>
        )
      )}

      {reading && (
        <Modal label={reading.heading} onClose={close} wide>
          <LetterReader
            letter={reading}
            mine={reading.sender_id === meId}
            partnerName={partnerName}
            onNewer={index > 0 ? () => show(letters[index - 1].id) : undefined}
            onOlder={index < letters.length - 1 ? () => show(letters[index + 1].id) : undefined}
          />
        </Modal>
      )}
    </div>
  );
}
