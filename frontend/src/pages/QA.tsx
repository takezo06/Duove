import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { usePageTitle } from '../hooks/usePageTitle';
import {
  Loader2,
  Sparkles,
  MessageCircle,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Settings,
  History,
} from 'lucide-react';


interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface Question {
  id: string;
  question_text: string;
  category_id: string;
}

interface Assignment {
  id: string;
  question_id: string;
  relationship_id: string;
  assigned_date: string;
  revealed_at: string | null;
  qa_questions: Question;
}

interface Answer {
  id: string;
  answer_text: string;
  image_url: string | null;
  user_id: string;
  submitted_at: string;
  revealed_at: string | null;
}

interface CurrentQA {
  assignment: Assignment;
  question: Question;
  answers: Answer[];
  yourAnswer: Answer | null;
  partnerAnswer: Answer | null;
  bothAnswered: boolean;
  revealed: boolean;
  partnerName: string;
  nextQuestionAvailableIn: number;
  preferredCategoryId: string | null;
}

export function QA() {
  usePageTitle('Daily Q&A');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [current, setCurrent] = useState<CurrentQA | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [updatingCategory, setUpdatingCategory] = useState(false);
  const navigate = useNavigate();

  const fetchCurrent = async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/qa/current`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCurrent(res.data);
      if (res.data.yourAnswer) {
        setAnswerText(res.data.yourAnswer.answer_text);
      }
      setSelectedCategoryId(res.data.preferredCategoryId || null);
    } catch (err: any) {
      console.error('Error fetching QA:', err);
      if (err.response?.status === 404) {
        setError('No active relationship found. Please pair with your partner.');
      } else {
        setError('Failed to load question.');
      }
    }
  };

  const fetchCategories = async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/qa/categories`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCategories(res.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      await Promise.all([fetchCurrent(), fetchCategories()]);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const handleSubmit = async () => {
    if (!answerText.trim() || !current) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/qa/submit`,
        {
          question_id: current.question.id,
          answer_text: answerText.trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess(res.data.message);
      await fetchCurrent();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit answer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (!current) return;
    setSkipping(true);
    setError(null);
    setSuccess(null);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/qa/skip`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Question skipped. A new one will be assigned.');
      await fetchCurrent();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to skip question.');
    } finally {
      setSkipping(false);
    }
  };

  const updatePreferredCategory = async (categoryId: string | null) => {
    setUpdatingCategory(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      await axios.patch(
        `${import.meta.env.VITE_BACKEND_URL}/api/qa/preferred-category`,
        { category_id: categoryId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedCategoryId(categoryId);
      setShowCategoryModal(false);
      await fetchCurrent();
      setSuccess('Category preference updated.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update category preference.');
    } finally {
      setUpdatingCategory(false);
    }
  };

  // Timer countdown
  const [timeLeft, setTimeLeft] = useState<number>(0);
  useEffect(() => {
    if (!current) return;
    const interval = setInterval(() => {
      setTimeLeft(current.nextQuestionAvailableIn);
    }, 1000);
    return () => clearInterval(interval);
  }, [current]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto animate-pulse">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-800" />
            <div className="h-8 w-40 bg-neutral-800 rounded" />
          </div>
          <div className="h-10 w-28 bg-neutral-800 rounded-xl" />
        </div>
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 space-y-4">
          <div className="h-6 w-1/3 bg-neutral-800 rounded" />
          <div className="h-4 w-full bg-neutral-800 rounded" />
          <div className="h-24 w-full bg-neutral-800 rounded" />
        </div>
      </div>
    );
  }

  if (error && !current) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
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

  if (!current) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-8">
          <p className="text-neutral-400">No question available</p>
        </div>
      </div>
    );
  }

  const { question, yourAnswer, partnerAnswer, bothAnswered, revealed, partnerName, nextQuestionAvailableIn } = current;

  const hours = Math.floor(nextQuestionAvailableIn / 3600);
  const minutes = Math.floor((nextQuestionAvailableIn % 3600) / 60);
  const seconds = nextQuestionAvailableIn % 60;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-400/10 flex items-center justify-center border border-rose-400/20">
            <MessageCircle className="w-5 h-5 text-rose-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white">Daily Q&A</h1>
          {!yourAnswer && (
            <button
              onClick={handleSkip}
              disabled={skipping}
              className="text-sm text-neutral-400 hover:text-rose-400 transition flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              Skip
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* History Link with pink glow */}
          <Link
            to="/qa/history"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-400/30 text-rose-400 hover:text-white hover:bg-rose-500/20 transition-all duration-200 shadow-[0_0_15px_rgba(244,63,94,0.15)] hover:shadow-[0_0_25px_rgba(244,63,94,0.35)]"
          >
            <History className="w-4 h-4" />
            <span className="text-sm">History</span>
          </Link>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="text-sm text-neutral-400 hover:text-white transition flex items-center gap-1.5"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 mb-6">
        <div className="flex items-center gap-2 text-neutral-400 text-sm mb-2">
          <Sparkles className="w-4 h-4 text-rose-400" />
          <span>Question of the Day</span>
          <span className="text-xs text-neutral-600 ml-2">
            {new Date().toLocaleDateString()}
          </span>
        </div>
        <p className="text-xl text-white font-medium">{question.question_text}</p>
      </div>

      {/* Status */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-neutral-900/50 rounded-xl border border-neutral-800/50 p-4 text-center">
          <p className="text-2xl font-semibold text-white">
            {yourAnswer ? <CheckCircle className="w-6 h-6 mx-auto text-emerald-400" /> : <Clock className="w-6 h-6 mx-auto text-neutral-500" />}
          </p>
          <p className="text-xs text-neutral-500 mt-1">You {yourAnswer ? 'Answered' : 'Waiting'}</p>
        </div>
        <div className="bg-neutral-900/50 rounded-xl border border-neutral-800/50 p-4 text-center">
          <p className="text-2xl font-semibold text-white">
            {partnerAnswer ? (
              <CheckCircle className="w-6 h-6 mx-auto text-emerald-400" />
            ) : bothAnswered ? (
              <Clock className="w-6 h-6 mx-auto text-rose-400" />
            ) : (
              <Clock className="w-6 h-6 mx-auto text-neutral-500" />
            )}
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            {partnerAnswer ? `${partnerName} Answered` : bothAnswered ? 'Revealing...' : 'Waiting for partner'}
          </p>
        </div>
      </div>

      {/* Your Answer */}
      {yourAnswer && (
        <div className="bg-neutral-900/50 rounded-xl border border-neutral-800/50 p-4 mb-4">
          <p className="text-xs text-neutral-500 mb-1">Your Answer</p>
          <p className="text-white">{yourAnswer.answer_text}</p>
        </div>
      )}

      {/* Partner Answer (revealed) */}
      {partnerAnswer && revealed && (
        <div className="bg-rose-400/5 rounded-xl border border-rose-400/20 p-4 mb-6">
          <p className="text-xs text-rose-400/60 mb-1">{partnerName}'s Answer</p>
          <p className="text-white">{partnerAnswer.answer_text}</p>
        </div>
      )}

      {/* Countdown to next question */}
      {revealed && (
        <div className="bg-neutral-800/50 rounded-xl border border-neutral-700/50 p-4 mb-6 flex items-center justify-center gap-3">
          <Clock className="w-5 h-5 text-neutral-400" />
          <span className="text-sm text-neutral-400">
            Next question available in{' '}
            <span className="text-white font-mono">
              {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </span>
        </div>
      )}

      {/* Write answer form */}
      {!yourAnswer && !revealed && (
        <div className="space-y-4">
          <textarea
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            placeholder="Write your answer here..."
            className="w-full bg-neutral-800/50 text-sm text-white placeholder:text-neutral-500 px-4 py-3 rounded-xl border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-rose-400/50 min-h-[120px] resize-none"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !answerText.trim()}
            className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-500/20"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? 'Submitting...' : 'Submit Answer'}
          </button>
        </div>
      )}

      {error && <p className="text-rose-400 text-sm mt-4">{error}</p>}
      {success && <p className="text-emerald-400 text-sm mt-4">{success}</p>}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">Choose Next Question Category</h2>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="text-neutral-400 hover:text-white transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-neutral-400 mb-4">
              Select a category for tomorrow's question. Leave empty for random.
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <button
                onClick={() => updatePreferredCategory(null)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition ${
                  selectedCategoryId === null
                    ? 'bg-rose-500/20 border-rose-400/30 text-rose-400'
                    : 'bg-neutral-800/50 border-neutral-700 text-neutral-300 hover:bg-neutral-700/50'
                }`}
              >
                <span className="font-medium">Random</span>
                <p className="text-xs text-neutral-500">No preference</p>
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => updatePreferredCategory(cat.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition ${
                    selectedCategoryId === cat.id
                      ? 'bg-rose-500/20 border-rose-400/30 text-rose-400'
                      : 'bg-neutral-800/50 border-neutral-700 text-neutral-300 hover:bg-neutral-700/50'
                  }`}
                >
                  <span className="font-medium capitalize">{cat.name}</span>
                  <p className="text-xs text-neutral-500">{cat.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
