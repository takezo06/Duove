import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { usePageTitle } from '../hooks/usePageTitle';
import { QAHeader } from '../components/qa/QAHeader';
import { QADeck } from '../components/qa/QADeck';
import { QAAnswerForm } from '../components/qa/QAAnswerForm';
import { QACategoryModal } from '../components/qa/QACategoryModal';
import { Loader2 } from 'lucide-react';

interface CurrentQA {
  assignment: any;
  question: any;
  yourAnswer: any;
  partnerAnswer: any;
  bothAnswered: boolean;
  revealed: boolean;
  partnerName: string;
  nextQuestionAvailableIn: number;
  preferredCategoryId: string | null;
}

export function QA() {
  usePageTitle('Daily Q&A');
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<CurrentQA | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [updatingCategory, setUpdatingCategory] = useState(false);
  const navigate = useNavigate();

  const fetchCurrent = async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/qa/current`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCurrent(res.data);
      if (res.data.yourAnswer) setAnswerText(res.data.yourAnswer.answer_text);
      setSelectedCategoryId(res.data.preferredCategoryId);
    } catch (err: any) {
      if (err.response?.status === 404) setError('No active relationship found.');
      else setError('Failed to load question.');
    }
  };

  const fetchCategories = async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/qa/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories(res.data);
    } catch (err) { /* ignore */ }
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }
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
        { question_id: current.question.id, answer_text: answerText.trim() },
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
    setSkipping(true);
    setError(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/qa/skip`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('Question skipped. A new one will be assigned.');
      await fetchCurrent();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to skip question.');
    } finally { setSkipping(false); }
  };

  const updatePreferredCategory = async (categoryId: string | null) => {
    setUpdatingCategory(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      await axios.patch(`${import.meta.env.VITE_BACKEND_URL}/api/qa/preferred-category`, { category_id: categoryId }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedCategoryId(categoryId);
      setShowCategoryModal(false);
      await fetchCurrent();
    } catch (err) { setError('Failed to update category preference.'); }
    finally { setUpdatingCategory(false); }
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 animate-pulse space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-40 bg-neutral-800 rounded" />
          <div className="h-8 w-24 bg-neutral-800 rounded" />
        </div>
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 h-48" />
        <div className="h-32 bg-neutral-800 rounded-xl" />
      </div>
    );
  }

  if (error && !current) {
    return (
      <div className="max-w-lg mx-auto text-center py-12 px-4">
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-8">
          <p className="text-neutral-400">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const { question, yourAnswer, partnerAnswer, bothAnswered, revealed, partnerName, nextQuestionAvailableIn } = current;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <QAHeader
        onSkip={handleSkip}
        onSettings={() => setShowCategoryModal(true)}
        skipping={skipping}
        youAnswered={!!yourAnswer}
      />

      <QADeck
        question={question.question_text}
        questionId={question.id}
        yourAnswer={yourAnswer?.answer_text}
        partnerAnswer={partnerAnswer?.answer_text}
        revealed={revealed}
        partnerName={partnerName}
        nextQuestionAvailableIn={nextQuestionAvailableIn}
      >
        {/* Answer form only when not answered and not yet revealed */}
        {!yourAnswer && !revealed && (
          <QAAnswerForm
            answerText={answerText}
            onChange={setAnswerText}
            onSubmit={handleSubmit}
            submitting={submitting}
            disabled={!answerText.trim()}
          />
        )}
      </QADeck>

      {error && <p className="text-rose-400 text-sm mt-4">{error}</p>}
      {success && <p className="text-emerald-400 text-sm mt-4">{success}</p>}

      {showCategoryModal && (
        <QACategoryModal
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelect={updatePreferredCategory}
          onClose={() => setShowCategoryModal(false)}
          updating={updatingCategory}
        />
      )}
    </div>
  );
}
