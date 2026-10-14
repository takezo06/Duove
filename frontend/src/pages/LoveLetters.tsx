import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { Mails, PenLine } from 'lucide-react';
import { Avatar, primaryButton, secondaryButton, surface } from '../components/Card';
import { LetterReader, type Letter } from '../components/love-letters/LetterReader';
import { RecentLetters } from '../components/love-letters/RecentLetters';
import { SendLetterModal } from '../components/love-letters/SendLetterModal';
import { usePageTitle } from '../hooks/usePageTitle';
import { apiError } from '../lib/apiError';

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
        const [rel, list, profile] = await Promise.all([
          axios.get(`${api}/relationships/me`, { headers }),
          axios.get(`${api}/love-letters?limit=${RECENT}`, { headers }),
          supabase.from('profiles').select('display_name').eq('id', user?.id ?? '').single(),
        ]);
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

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6" aria-busy="true">
        <div className={`${surface} h-36 animate-pulse`} />
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] gap-6">
          <div className={`${surface} h-96 animate-pulse`} />
          <div className={`${surface} h-96 animate-pulse`} />
        </div>
      </div>
    );
  }

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
  const partner = <span className="text-rose-400 font-semibold">{partnerName}</span>;

  // Tap to read, tap the same one again to go back to the latest
  const toggle = (letter: Letter) => {
    setPicked((p) => (p?.id === letter.id ? null : letter));
    const el = reader.current;
    if (el && el.getBoundingClientRect().top < 0) {
      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ block: 'start', behavior: still ? 'auto' : 'smooth' });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <section className={`${surface} p-6 md:p-8`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Love letters</h1>
            <p className="text-neutral-400 mt-1">
              {letters.length > 0
                ? <>Write to {partner}, or read what's new.</>
                : <>Everything you and {partner} write to each other lives here.</>}
            </p>
          </div>
          {letters.length > 0 && (
            <div className="flex flex-wrap gap-3 shrink-0">
              <Link to="/letters/all" className={secondaryButton}>
                <Mails className="w-4 h-4" aria-hidden />
                All letters
              </Link>
              <button onClick={() => setComposing(true)} className={primaryButton}>
                <PenLine className="w-4 h-4" aria-hidden />
                Write a letter
              </button>
            </div>
          )}
        </div>

        {letters.length === 0 && !error && (
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

      {open && (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] gap-6 items-start">
          <section id={READER_ID} ref={reader} aria-label="Open letter" className={`${surface} p-6 md:p-8 scroll-mt-6`}>
            <LetterReader letter={open} mine={isMine(open)} partnerName={partnerName} />
          </section>
          <RecentLetters
            letters={letters}
            openId={open.id}
            readerId={READER_ID}
            meId={me.id}
            partnerName={partnerName}
            onToggle={toggle}
          />
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
