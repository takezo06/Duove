import { useState, useEffect, useRef, useCallback, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { History, Loader2, Send, Shuffle, SkipForward } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { apiError } from '../lib/apiError';
import { when } from '../lib/when';
import { topicIcon, topicName, type Topic } from '../lib/qaTopics';
import { Avatar, Badge, CardBack, CardHeader, Deck, Seal, field, iconClass, primaryButton, secondaryButton, surface } from '../components/Card';
import { QACategoryModal } from '../components/qa/QACategoryModal';

interface Answer {
  answer_text: string;
  submitted_at: string;
}

interface CurrentQA {
  question: { id: string; question_text: string; category_id: string | null };
  yourAnswer: Answer | null;
  // null until you've both answered
  partnerAnswer: Answer | null;
  partnerAnswered: boolean;
  revealed: boolean;
  partnerName: string;
  nextQuestionAvailableIn: number;
  preferredCategoryId: string | null;
}

const api = import.meta.env.VITE_BACKEND_URL;
// The backend picks "today" in this timezone, so the question turns over at local midnight.
const tzParams = { tz: Intl.DateTimeFormat().resolvedOptions().timeZone };
const auth = async () => ({ Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` });

// "6h 42m" or "42m" until the next question
function untilNext(seconds: number) {
  const mins = Math.ceil(seconds / 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// Who a card belongs to: their seal, their name, one line under it
function Owner({ name, partner = false, children }: { name: string; partner?: boolean; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <Seal name={name} partner={partner} />
      <div className="min-w-0">
        <p className={`font-semibold ${partner ? 'text-rose-400' : 'text-white'}`}>{partner ? name : 'You'}</p>
        <p className="text-xs text-neutral-400">{children}</p>
      </div>
    </div>
  );
}

// An answer turned face up
function AnswerCard({ name, partner = false, answer }: { name: string; partner?: boolean; answer: Answer }) {
  return (
    <section aria-label={partner ? `${name}'s answer` : 'Your answer'} className={`${surface} p-6`}>
      <Owner name={name} partner={partner}>
        Answered <time dateTime={answer.submitted_at}>{when(answer.submitted_at)}</time>
      </Owner>
      <p className="mt-4 text-neutral-200 leading-relaxed whitespace-pre-wrap break-words">{answer.answer_text}</p>
    </section>
  );
}

// Today's question on top of the deck, and the two answers under it: yours to write,
// your partner's face down until you've both played your card.
export function QA() {
  usePageTitle('Daily Q&A');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [unpaired, setUnpaired] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [current, setCurrent] = useState<CurrentQA | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [myName, setMyName] = useState('You');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [answerError, setAnswerError] = useState('');
  const [skipping, setSkipping] = useState(false);
  const [deckError, setDeckError] = useState('');
  const [choosing, setChoosing] = useState(false);
  const [topicError, setTopicError] = useState('');
  const questionId = useRef<string | null>(null);

  const fetchCurrent = useCallback(async () => {
    const { data } = await axios.get(`${api}/qa/current`, { headers: await auth(), params: tzParams });
    // A new question clears the old draft; a refetch of the same one keeps what you're typing.
    if (data.question?.id !== questionId.current) {
      questionId.current = data.question?.id ?? null;
      setAnswerText('');
    }
    setCurrent(data);
    setSecondsLeft(data.nextQuestionAvailableIn);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate('/login'); return; }
        const [, list, profile] = await Promise.all([
          fetchCurrent(),
          // Topics and your name only dress the page; it works without them
          axios.get(`${api}/qa/categories`, { headers: await auth() }).then((r) => r.data as Topic[]).catch(() => []),
          supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle(),
        ]);
        setTopics(list);
        if (profile.data?.display_name) setMyName(profile.data.display_name);
      } catch (err) {
        // Both "not paired" and "no questions" are 404s, so tell them apart by message
        const message = apiError(err, '');
        if (message === 'No active relationship') setUnpaired(true);
        else if (message === 'No questions available') setLoadError("There's no question for today yet. Try again in a little while.");
        else setLoadError(message || "Couldn't load today's question. Try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [attempt, navigate, fetchCurrent]);

  // Tick the countdown from a fixed deadline (background tabs throttle timers) and load the
  // next question at midnight. Coming back to the tab also picks up your partner's answer.
  // A failed background refresh is harmless: the page keeps what it has.
  useEffect(() => {
    if (!current) return;
    const refresh = () => { fetchCurrent().catch(() => {}); };
    const deadline = Date.now() + current.nextQuestionAvailableIn * 1000;
    const id = setInterval(() => {
      const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) { clearInterval(id); refresh(); }
    }, 1000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(id); window.removeEventListener('focus', refresh); };
  }, [current, fetchCurrent]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!answerText.trim() || !current || submitting) return;
    setSubmitting(true);
    setAnswerError('');
    try {
      await axios.post(
        `${api}/qa/submit`,
        { question_id: current.question.id, answer_text: answerText.trim() },
        { headers: await auth(), params: tzParams },
      );
    } catch (err) {
      setAnswerError(apiError(err, "Your answer didn't send. Try again."));
      // 409 means the day rolled over while you were typing: show the new question.
      if ((err as { response?: { status?: number } }).response?.status === 409) await fetchCurrent().catch(() => {});
      setSubmitting(false);
      return;
    }
    await fetchCurrent().catch(() => setAnswerError('Your answer is in. Refresh the page to see it.'));
    setSubmitting(false);
  };

  const skip = async () => {
    setSkipping(true);
    setDeckError('');
    try {
      await axios.post(`${api}/qa/skip`, {}, { headers: await auth(), params: tzParams });
      await fetchCurrent();
    } catch (err) {
      setDeckError(apiError(err, "Couldn't skip this question. Try again."));
    } finally {
      setSkipping(false);
    }
  };

  const chooseTopic = async (id: string | null) => {
    setTopicError('');
    try {
      await axios.patch(`${api}/qa/preferred-category`, { category_id: id }, { headers: await auth(), params: tzParams });
      await fetchCurrent();
      setChoosing(false);
    } catch (err) {
      setTopicError(apiError(err, "Couldn't change the topic. Try again."));
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6" aria-busy="true">
        <div className={`${surface} h-36 animate-pulse`} />
        <div className={`${surface} h-56 animate-pulse`} />
        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          <div className={`${surface} h-64 animate-pulse`} />
          <div className={`${surface} h-64 animate-pulse`} />
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
          <h1 className="text-2xl font-bold text-white mb-2">A question needs two answers</h1>
          <p className="text-neutral-400 max-w-md mx-auto">Connect with your partner to get a new question every day.</p>
          <button onClick={() => navigate('/partner')} className={`${primaryButton} mt-6`}>
            Connect with your partner
          </button>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="max-w-4xl mx-auto">
        <section className={`${surface} p-6 md:p-8`}>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Daily Q&A</h1>
          <p className="text-neutral-400 mt-1">One question a day for the two of you.</p>
          <div className="mt-6 pt-6 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
            <p role="alert" className="text-sm text-rose-300">{loadError}</p>
            <button onClick={() => { setLoadError(''); setLoading(true); setAttempt((a) => a + 1); }} className={secondaryButton}>
              Try again
            </button>
          </div>
        </section>
      </div>
    );
  }

  const { question, yourAnswer, partnerAnswer, partnerAnswered, revealed, partnerName } = current;
  const partner = <span className="text-rose-400 font-semibold">{partnerName}</span>;
  const topic = topics.find((t) => t.id === question.category_id);
  const preferred = topics.find((t) => t.id === current.preferredCategoryId);
  // The backend only swaps a question nobody has answered
  const canSkip = !yourAnswer && !partnerAnswered;
  const now = new Date();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <section className={`${surface} p-6 md:p-8`}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Daily Q&A</h1>
            <p className="text-neutral-400 mt-1">
              One question a day for you and {partner}. Answers stay face down until you've both written one.
            </p>
            <p className="text-sm text-neutral-400 mt-1">
              <time dateTime={now.toLocaleDateString('en-CA')}>
                {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
              </time>
              <span aria-hidden> · </span>
              Next question in <span className="text-white font-medium tabular-nums">{untilNext(secondsLeft)}</span>
            </p>
          </div>
          <Link to="/qa/history" className={`${secondaryButton} shrink-0 self-start`}>
            <History className="w-4 h-4" aria-hidden />
            Past questions
          </Link>
        </div>
      </section>

      <Deck className="p-6 md:p-8">
        <CardHeader
          icon={topicIcon(topic?.icon, iconClass)}
          title={topic ? topicName(topic) : "Today's question"}
          badge={
            revealed ? (
              <Badge tone="emerald">Both answered</Badge>
            ) : !yourAnswer ? (
              <Badge tone="rose">Your turn</Badge>
            ) : (
              <Badge tone="neutral">Waiting on {partnerName}</Badge>
            )
          }
        />
        <h2 className="mt-4 text-xl font-bold text-white leading-snug break-words">{question.question_text}</h2>
        <div className="mt-6 pt-6 border-t border-neutral-800 flex flex-wrap items-center gap-3">
          {canSkip && (
            <button onClick={skip} disabled={skipping} className={secondaryButton}>
              {skipping ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <SkipForward className="w-4 h-4" aria-hidden />}
              {skipping ? 'Skipping...' : 'Skip this question'}
            </button>
          )}
          <button
            onClick={() => { setTopicError(''); setChoosing(true); }}
            aria-haspopup="dialog"
            className={secondaryButton}
          >
            {preferred ? topicIcon(preferred.icon, 'w-4 h-4') : <Shuffle className="w-4 h-4" aria-hidden />}
            Topic: {preferred ? topicName(preferred) : 'Random'}
          </button>
        </div>
        {deckError && <p role="alert" className="mt-3 text-sm text-rose-300">{deckError}</p>}
      </Deck>

      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        {yourAnswer ? (
          <AnswerCard name={myName} answer={yourAnswer} />
        ) : (
          <form onSubmit={submit} aria-label="Your answer" className={`${surface} p-6 flex flex-col`}>
            <Owner name={myName}>{partnerAnswered ? `${partnerName} is waiting on you` : 'Your turn'}</Owner>
            <textarea
              aria-label="Your answer"
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Write what comes to mind first"
              className={`${field} mt-4 min-h-32 flex-1 resize-none`}
            />
            <button type="submit" disabled={!answerText.trim() || submitting} className={`${primaryButton} mt-5 w-full`}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Send className="w-4 h-4" aria-hidden />}
              {submitting ? 'Sending...' : 'Send answer'}
            </button>
            {answerError && <p role="alert" className="mt-3 text-sm text-rose-300">{answerError}</p>}
          </form>
        )}

        {partnerAnswer ? (
          <AnswerCard name={partnerName} partner answer={partnerAnswer} />
        ) : partnerAnswered ? (
          <CardBack name={partnerName} label={`${partnerName}'s answer, face down`}>
            <p className="mt-4 text-lg font-semibold text-white leading-snug">{partnerName} answered</p>
            <p className="mt-1 text-rose-200/80">It turns over when you send yours.</p>
          </CardBack>
        ) : (
          <section aria-label={`${partnerName}'s answer`} className={`${surface} p-6`}>
            <Owner name={partnerName} partner>Hasn't answered yet</Owner>
            <p className="mt-4 text-neutral-300">
              {yourAnswer
                ? 'Your card stays face down on their side until they answer too.'
                : 'Whoever answers first waits face down for the other.'}
            </p>
          </section>
        )}
      </div>

      {choosing && (
        <QACategoryModal
          topics={topics}
          selectedId={current.preferredCategoryId}
          error={topicError}
          onSelect={chooseTopic}
          onClose={() => setChoosing(false)}
        />
      )}
    </div>
  );
}
