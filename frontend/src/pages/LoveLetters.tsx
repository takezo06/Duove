import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { Music, PenLine } from 'lucide-react';
import { Avatar, Chip, Modal, focusRing, primaryButton, secondaryButton, surface } from '../components/Card';
import { LetterReader, type Letter } from '../components/love-letters/LetterReader';
import { SendLetterModal } from '../components/love-letters/SendLetterModal';
import { usePageTitle } from '../hooks/usePageTitle';
import { apiError } from '../lib/apiError';
import { plural } from '../lib/plural';
import { when } from '../lib/when';

type Filter = 'all' | 'received' | 'sent';

export function LoveLetters() {
  usePageTitle('Love Letters');
  const navigate = useNavigate();
  const location = useLocation();
  const highlightId = (location.state as { highlightId?: string } | null)?.highlightId;

  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unpaired, setUnpaired] = useState(false);
  const [me, setMe] = useState({ id: '', name: '' });
  const [partnerName, setPartnerName] = useState('your partner');
  const [filter, setFilter] = useState<Filter>('all');
  // A notification deep link opens its letter straight away
  const [selectedId, setSelectedId] = useState<string | null>(highlightId ?? null);
  const [composing, setComposing] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const headers = { Authorization: `Bearer ${token}` };
        // ponytail: newest 100 only (the backend cap); add paging when a couple outgrows it
        const [rel, list, profile] = await Promise.all([
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/relationships/me`, { headers }),
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/love-letters?limit=100`, { headers }),
          supabase.from('profiles').select('display_name').eq('id', user?.id ?? '').single(),
        ]);
        if (!rel.data?.relationship) { setUnpaired(true); return; }
        setPartnerName(rel.data.partner?.display_name || 'your partner');
        setMe({ id: user?.id ?? '', name: profile.data?.display_name ?? '' });
        setLetters(list.data);
      } catch (err) {
        if ((err as { response?: { status?: number } }).response?.status === 404) setUnpaired(true);
        else setError(apiError(err, "Couldn't load your letters. Try again."));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [attempt]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6" aria-busy="true">
        <div className={`${surface} h-36 animate-pulse`} />
        <div className="grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] gap-6">
          <div className={`${surface} h-96 animate-pulse`} />
          <div className={`${surface} h-96 animate-pulse hidden lg:block`} />
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
  const sentCount = letters.filter(isMine).length;
  const shown = letters.filter((l) => filter === 'all' || (filter === 'sent') === isMine(l));
  const selected = shown.find((l) => l.id === selectedId) ?? null;
  // The side pane always has something open; the phone modal only opens on a tap
  const reading = selected ?? shown[0];
  const index = reading ? shown.indexOf(reading) : -1;

  const groups: { label: string; items: Letter[] }[] = [];
  for (const l of shown) {
    const label = new Date(l.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(l);
    else groups.push({ label, items: [l] });
  }

  const partner = <span className="text-rose-400 font-semibold">{partnerName}</span>;
  const filters: { value: Filter; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: letters.length },
    { value: 'received', label: `From ${partnerName}`, count: letters.length - sentCount },
    { value: 'sent', label: 'From you', count: sentCount },
  ];

  const reader = (letter: Letter) => (
    <LetterReader
      letter={letter}
      mine={isMine(letter)}
      partnerName={partnerName}
      onNewer={index > 0 ? () => setSelectedId(shown[index - 1].id) : undefined}
      onOlder={index < shown.length - 1 ? () => setSelectedId(shown[index + 1].id) : undefined}
    />
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <section className={`${surface} p-6 md:p-8`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Love letters</h1>
            <p className="text-neutral-400 mt-1">
              {letters.length > 0
                ? <>{plural(letters.length, 'letter')} between you and {partner}, newest first.</>
                : <>Everything you and {partner} write to each other lives here.</>}
            </p>
          </div>
          {letters.length > 0 && (
            <button onClick={() => setComposing(true)} className={`${primaryButton} shrink-0`}>
              <PenLine className="w-4 h-4" aria-hidden />
              Write a letter
            </button>
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

      {letters.length > 0 && (
        <div className="grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] gap-6 items-start">
          <div className="space-y-5 min-w-0">
            <nav aria-label="Filter letters" className="flex flex-wrap gap-2">
              {filters.map((f) => (
                <Chip key={f.value} onClick={() => setFilter(f.value)} aria-pressed={filter === f.value} active={filter === f.value}>
                  {f.label} <span className="text-neutral-500 tabular-nums">{f.count}</span>
                </Chip>
              ))}
            </nav>

            {shown.length === 0 ? (
              <div className={`${surface} px-6 py-14 text-center`}>
                <p className="text-lg font-semibold text-white">
                  {filter === 'sent' ? "You haven't written one yet" : `Nothing from ${partnerName} yet`}
                </p>
                <button onClick={() => setFilter('all')} className={`${secondaryButton} mt-5`}>Show all letters</button>
              </div>
            ) : (
              groups.map((g) => (
                <section key={g.label}>
                  <h2 className="flex items-baseline justify-between text-sm px-1 mb-2">
                    <span className="font-semibold text-white">{g.label}</span>
                    <span className="text-neutral-400 tabular-nums">{plural(g.items.length, 'letter')}</span>
                  </h2>
                  <ul className={`${surface} p-2 space-y-1`}>
                    {g.items.map((l) => {
                      const open = l.id === reading?.id;
                      return (
                        <li key={l.id}>
                          <button
                            onClick={() => setSelectedId(l.id)}
                            aria-current={open ? 'true' : undefined}
                            className={`w-full text-left p-3 md:p-4 rounded-xl transition cursor-pointer ${focusRing} ${
                              open ? 'lg:bg-neutral-800 hover:bg-neutral-800/50' : 'hover:bg-neutral-800/50'
                            }`}
                          >
                            <span className="flex items-baseline justify-between gap-3 text-xs text-neutral-400">
                              {isMine(l) ? <span>You</span> : <span className="text-rose-400 font-medium">{partnerName}</span>}
                              <time dateTime={l.created_at} title={new Date(l.created_at).toLocaleString()} className="shrink-0">
                                {when(l.created_at)}
                              </time>
                            </span>
                            <span className="mt-1 font-semibold text-white leading-snug line-clamp-2 break-words">{l.heading}</span>
                            <span className="mt-1 text-sm text-neutral-400 line-clamp-1 break-words">{l.message}</span>
                            {l.spotify_track_name && (
                              <span className="mt-2 flex items-center gap-1.5 text-xs text-neutral-400 min-w-0">
                                <Music className="w-3.5 h-3.5 shrink-0" aria-hidden />
                                <span className="truncate">
                                  {l.spotify_track_name}{l.spotify_artist_name && ` · ${l.spotify_artist_name}`}
                                </span>
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            )}
          </div>

          {reading && (
            <div className={`hidden lg:block sticky top-0 ${surface} p-6 md:p-8 max-h-[calc(100vh-3rem)] overflow-y-auto`}>
              {reader(reading)}
            </div>
          )}
        </div>
      )}

      {selected && (
        <Modal label={selected.heading} onClose={() => setSelectedId(null)} wide className="lg:hidden">
          {reader(selected)}
        </Modal>
      )}

      {composing && (
        <SendLetterModal
          myName={me.name}
          partnerName={partnerName}
          onClose={() => setComposing(false)}
          onSent={(letter) => {
            setLetters((prev) => [letter, ...prev]);
            setFilter('all');
            setSelectedId(letter.id);
          }}
        />
      )}
    </div>
  );
}
