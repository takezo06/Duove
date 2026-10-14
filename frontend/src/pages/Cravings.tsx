import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { usePageTitle } from '../hooks/usePageTitle';
import axios from 'axios';
import { Avatar, Badge, CategoryPill, Chip, field, focusRing, primaryButton, secondaryButton, surface } from '../components/Card';
import { Check, Plus, Trash2, Loader2 } from 'lucide-react';
import { CATEGORIES, categoryFor } from '../lib/cravingCategories';
import { when } from '../lib/when';

interface Craving {
  id: string;
  content: string;
  category: string;
  fulfilled: boolean;
  user_id: string;
  partner_id: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

const categoryOf = (c: Craving) => categoryFor(c.category);

const RELATIONSHIP_ERRORS = ['No active relationship found.', 'Could not fetch relationship details.'];

export function Cravings() {
  usePageTitle('Cravings');
  const navigate = useNavigate();
  const location = useLocation();
  const highlightId = location.state?.highlightId;

  const [cravings, setCravings] = useState<Craving[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Other');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [relationshipId, setRelationshipId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState('Partner');
  const [userId, setUserId] = useState<string | null>(null);
  const [fetchingRelationship, setFetchingRelationship] = useState(true);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  // Highlight effect
  useEffect(() => {
    if (highlightId && cravings.length > 0) {
      const found = cravings.find(c => c.id === highlightId);
      if (found) {
        setHighlightedId(highlightId);
        const element = document.getElementById(`craving-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Auto-remove highlight after 5 seconds
          setTimeout(() => setHighlightedId(null), 5000);
        }
      }
    }
  }, [highlightId, cravings]);

  // Fetch user and relationship
  useEffect(() => {
    const fetchUserAndRelationship = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }
        setUserId(user.id);

        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/relationships/me`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data && res.data.relationship) {
          setRelationshipId(res.data.relationship.id);
          // partner.id is "the other person"; relationship.partner_id is only right for whoever sent the invite
          setPartnerId(res.data.partner?.id ?? res.data.relationship.partner_id);
          if (res.data.partner?.display_name) setPartnerName(res.data.partner.display_name);
        } else {
          setError('No active relationship found.');
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          setError('No active relationship found.');
        } else {
          console.error('Error fetching relationship:', err);
          setError('Could not fetch relationship details.');
        }
      } finally {
        setFetchingRelationship(false);
        setLoading(false);
      }
    };
    fetchUserAndRelationship();
  }, [navigate]);

  // Fetch cravings
  const fetchCravings = useCallback(async () => {
    if (!relationshipId) return;
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/cravings?relationshipId=${relationshipId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCravings(res.data);
    } catch {
      setError('Could not load cravings.');
    }
  }, [relationshipId]);

  useEffect(() => {
    if (relationshipId) fetchCravings();
  }, [relationshipId, fetchCravings]);

  // Add craving
  const handleAddCraving = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || !relationshipId || !partnerId || !userId) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/cravings`,
        {
          relationshipId,
          partnerId,
          content: newContent.trim(),
          category: selectedCategory,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchCravings();
      setNewContent('');
      setSelectedCategory('Other');
    } catch (err: any) {
      setError(err.response?.status === 429 ? "You've hit today's craving limit. Try again tomorrow." : 'Failed to add craving.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle fulfillment
  const handleToggle = async (id: string) => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      await axios.patch(
        `${import.meta.env.VITE_BACKEND_URL}/cravings/${id}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchCravings();
    } catch {
      setError('Could not update craving.');
    }
  };

  // Delete (confirmed inline, no browser dialog)
  const handleDelete = async (id: string) => {
    setConfirmingDelete(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/cravings/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchCravings();
    } catch {
      setError('Could not delete craving.');
    }
  };

  // Real-time
  useEffect(() => {
    if (!relationshipId) return;
    const channel = supabase
      .channel(`cravings:${relationshipId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cravings', filter: `relationship_id=eq.${relationshipId}` },
        () => fetchCravings()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [relationshipId, fetchCravings]);

  const filteredCravings = filterCategory
    ? cravings.filter((c) => (c.category || 'Other') === filterCategory)
    : cravings;
  const open = filteredCravings.filter((c) => !c.fulfilled);
  const done = filteredCravings.filter((c) => c.fulfilled);
  const totalOpen = cravings.filter((c) => !c.fulfilled).length;

  // Loading skeleton
  if (fetchingRelationship || loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6" aria-busy="true">
        <div className={`${surface} h-56 animate-pulse`} />
        {[...Array(3)].map((_, i) => (
          <div key={i} className={`${surface} h-20 animate-pulse`} />
        ))}
      </div>
    );
  }

  // No partner
  if (error && RELATIONSHIP_ERRORS.includes(error)) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className={`${surface} p-8 md:p-12 text-center`}>
          <div className="flex justify-center -space-x-4 mb-5">
            <Avatar src={null} name="You" />
            <Avatar src={null} name="Your partner" dashed />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">Cravings are for two</h1>
          <p className="text-neutral-400 max-w-md mx-auto">
            Connect with your partner to start sharing what you're in the mood for.
          </p>
          <button onClick={() => navigate('/partner')} className={`${primaryButton} mt-6`}>
            Connect with your partner
          </button>
        </div>
      </div>
    );
  }

  const row = (craving: Craving) => {
    const cat = categoryOf(craving);
    const mine = craving.user_id === userId;
    const isHighlighted = highlightedId === craving.id;
    return (
      <li
        key={craving.id}
        id={`craving-${craving.id}`}
        className={`${surface} p-4 flex items-start gap-4 transition ${
          isHighlighted ? 'ring-2 ring-rose-400 ring-offset-2 ring-offset-neutral-950' : 'hover:border-neutral-700'
        }`}
      >
        <button
          onClick={() => handleToggle(craving.id)}
          aria-pressed={craving.fulfilled}
          aria-label={craving.fulfilled ? `Mark "${craving.content}" as not done` : `Mark "${craving.content}" as done`}
          className={`mt-0.5 w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center transition cursor-pointer ${focusRing} ${
            craving.fulfilled ? 'bg-rose-500 border-rose-500' : 'border-neutral-600 hover:border-rose-400'
          }`}
        >
          {craving.fulfilled && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} aria-hidden />}
        </button>

        <div className="min-w-0 flex-1">
          <p className={`break-words ${craving.fulfilled ? 'text-neutral-500 line-through' : 'text-white'}`}>{craving.content}</p>
          <p className={`mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-400 ${craving.fulfilled ? 'opacity-60' : ''}`}>
            <CategoryPill cat={cat} />
            <span>
              {mine ? 'You' : <span className="text-rose-400 font-medium">{partnerName}</span>}
            </span>
            <span aria-hidden>·</span>
            <time dateTime={craving.created_at} title={new Date(craving.created_at).toLocaleString()}>
              {when(craving.created_at)}
            </time>
          </p>
        </div>

        {mine &&
          (confirmingDelete === craving.id ? (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleDelete(craving.id)}
                className={`px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-medium transition cursor-pointer ${focusRing}`}
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmingDelete(null)}
                className={`px-3 py-1.5 rounded-lg text-neutral-400 hover:text-white text-xs font-medium transition cursor-pointer ${focusRing}`}
              >
                Keep
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingDelete(craving.id)}
              aria-label={`Delete "${craving.content}"`}
              className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition cursor-pointer ${focusRing}`}
            >
              <Trash2 className="w-4 h-4" aria-hidden />
            </button>
          ))}
      </li>
    );
  };

  // Main view
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header + add form */}
      <section className={`${surface} p-6 md:p-8`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Cravings</h1>
            <p className="text-neutral-400 mt-1">
              What you and <span className="text-rose-400 font-semibold">{partnerName}</span> are in the mood for.
            </p>
          </div>
          {totalOpen > 0 && <Badge tone="rose">{totalOpen} open</Badge>}
        </div>

        <form onSubmit={handleAddCraving} className="mt-6 pt-6 border-t border-neutral-800">
          <label htmlFor="new-craving" className="block text-sm text-neutral-400 mb-2">
            What are you craving?
          </label>
          <input
            id="new-craving"
            type="text"
            placeholder="Spicy ramen, a movie night, a long hug..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            maxLength={200}
            className={field}
          />
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div role="radiogroup" aria-label="Category" className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <Chip
                  key={cat.value}
                  type="button"
                  role="radio"
                  aria-checked={selectedCategory === cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  active={selectedCategory === cat.value}
                  cat={cat}
                >
                  <cat.icon className={`w-3.5 h-3.5 ${cat.iconColor}`} aria-hidden />
                  {cat.label}
                </Chip>
              ))}
            </div>
            <button type="submit" disabled={submitting || !newContent.trim()} className={`${primaryButton} shrink-0`}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Plus className="w-4 h-4" aria-hidden />}
              Add craving
            </button>
          </div>
        </form>
      </section>

      {error && (
        <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      {/* Filters */}
      {cravings.length > 0 && (
        <nav aria-label="Filter by category" className="flex flex-wrap gap-2">
          <Chip onClick={() => setFilterCategory(null)} aria-pressed={filterCategory === null} active={filterCategory === null}>
            All <span className="text-neutral-500 tabular-nums">{cravings.length}</span>
          </Chip>
          {CATEGORIES.map((cat) => {
            const count = cravings.filter((c) => (c.category || 'Other') === cat.value).length;
            if (!count) return null;
            return (
              <Chip
                key={cat.value}
                onClick={() => setFilterCategory(cat.value)}
                aria-pressed={filterCategory === cat.value}
                active={filterCategory === cat.value}
                cat={cat}
              >
                <cat.icon className={`w-3.5 h-3.5 ${cat.iconColor}`} aria-hidden />
                {cat.label} <span className="text-neutral-500 tabular-nums">{count}</span>
              </Chip>
            );
          })}
        </nav>
      )}

      {/* List */}
      {filteredCravings.length === 0 ? (
        <div className={`${surface} px-6 py-14 text-center`}>
          <p className="text-lg font-semibold text-white">
            {cravings.length === 0 ? 'Nothing on the list yet' : 'Nothing in this category'}
          </p>
          <p className="text-neutral-400 mt-1">
            {cravings.length === 0 ? `Add the first craving and ${partnerName} will see it right away.` : 'Pick another category above.'}
          </p>
          {cravings.length > 0 && (
            <button onClick={() => setFilterCategory(null)} className={`${secondaryButton} mt-5`}>
              Show all cravings
            </button>
          )}
        </div>
      ) : (
        <>
          {open.length > 0 && (
            <section>
              <h2 className="text-sm text-neutral-400 mb-3">Open · {open.length}</h2>
              <ul className="space-y-3">{open.map(row)}</ul>
            </section>
          )}
          {done.length > 0 && (
            <section>
              <h2 className="text-sm text-neutral-400 mb-3">
                Fulfilled · {done.length}
              </h2>
              <ul className="space-y-3">{done.map(row)}</ul>
            </section>
          )}
        </>
      )}

      <p className="text-xs text-neutral-400 text-center">
        Cravings marked as done will be deleted after 24 hours.
      </p>
    </div>
  );
}
