import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import {
  CheckCircle,
  Circle,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  Users,
  ArrowRight,
  Pizza,
  Film,
  Heart,
  ShoppingBag,
  MoreHorizontal,
  Filter,
  ChevronDown,
} from 'lucide-react';

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

const CATEGORIES = [
  { value: 'Food', icon: Pizza, label: 'Food' },
  { value: 'Activity', icon: Film, label: 'Activity' },
  { value: 'Emotional', icon: Heart, label: 'Emotional' },
  { value: 'Material', icon: ShoppingBag, label: 'Material' },
  { value: 'Other', icon: MoreHorizontal, label: 'Other' },
];

const CATEGORY_COLORS: Record<string, string> = {
  Food: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  Activity: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  Emotional: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
  Material: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  Other: 'text-neutral-400 bg-neutral-400/10 border-neutral-400/20',
};

export function Cravings() {
  const [cravings, setCravings] = useState<Craving[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Other');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [relationshipId, setRelationshipId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [fetchingRelationship, setFetchingRelationship] = useState(true);
  const navigate = useNavigate();

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
          `${import.meta.env.VITE_BACKEND_URL}/api/relationships/me`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data) {
          setRelationshipId(res.data.id);
          setPartnerId(res.data.partner_id);
        } else {
          setError('No active relationship found.');
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          setError('No active relationship found.');
        } else {
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
        `${import.meta.env.VITE_BACKEND_URL}/api/cravings?relationshipId=${relationshipId}`,
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
        `${import.meta.env.VITE_BACKEND_URL}/api/cravings`,
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
      setError(err.response?.status === 429 ? 'Daily craving limit reached (5 per day).' : 'Failed to add craving.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle fulfillment
  const handleToggle = async (id: string) => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      await axios.patch(
        `${import.meta.env.VITE_BACKEND_URL}/api/cravings/${id}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchCravings();
    } catch {
      setError('Could not update craving.');
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this craving?')) return;
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/api/cravings/${id}`,
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

  // Loading skeleton
  if (fetchingRelationship) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-8 w-48 bg-neutral-700/50 rounded-lg animate-pulse" />
            <div className="h-4 w-32 bg-neutral-700/50 rounded-lg animate-pulse mt-2" />
          </div>
        </div>
        <div className="flex gap-3 mb-8">
          <div className="flex-1 h-12 bg-neutral-700/50 rounded-xl animate-pulse" />
          <div className="w-24 h-12 bg-neutral-700/50 rounded-xl animate-pulse" />
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 bg-neutral-900/50 rounded-2xl border border-neutral-800 p-4 mb-3">
            <div className="w-5 h-5 rounded-full bg-neutral-700/50 animate-pulse" />
            <div className="flex-1 h-5 bg-neutral-700/50 rounded-lg animate-pulse" />
            <div className="w-16 h-4 bg-neutral-700/50 rounded-lg animate-pulse" />
            <div className="w-8 h-8 bg-neutral-700/50 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  // No partner
  if (error === 'No active relationship found.' || error === 'Could not fetch relationship details.') {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-8 md:p-12 shadow-xl">
          <div className="w-16 h-16 bg-rose-400/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-400/20">
            <Users className="w-8 h-8 text-rose-400" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">You're not paired yet</h2>
          <p className="text-neutral-400 max-w-md mx-auto">
            To start sharing cravings, you need to connect with your partner.
          </p>
          <button
            onClick={() => navigate('/partner')}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium transition shadow-lg shadow-rose-500/20"
          >
            Go to Partner Connection
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Main view
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-rose-400" />
            Cravings Board
          </h1>
          <p className="text-neutral-400 text-sm">Share what you're craving or need</p>
        </div>
      </div>

      {/* Add form */}
      <form onSubmit={handleAddCraving} className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            placeholder="Add a craving or request..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="flex-1 bg-neutral-800/50 text-sm text-white placeholder:text-neutral-500 px-4 py-3 rounded-xl border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-rose-400/50 focus:border-transparent transition"
          />
          <div className="relative min-w-[140px]">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-neutral-800/50 text-sm text-white px-4 py-3 pr-10 rounded-xl border border-neutral-700 appearance-none focus:outline-none focus:ring-2 focus:ring-rose-400/50 focus:border-transparent transition cursor-pointer hover:bg-neutral-700/30"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value} className="bg-neutral-900 text-white hover:bg-neutral-700">
                  {cat.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting || !newContent.trim()}
          className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-500/20 min-w-[100px]"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add
        </button>
      </form>

      {/* Filter bar */}
      {cravings.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Filter className="w-4 h-4 text-neutral-500" />
          <button
            onClick={() => setFilterCategory(null)}
            className={`px-3 py-1.5 text-xs rounded-full border transition ${
              filterCategory === null
                ? 'bg-rose-500/20 text-rose-400 border-rose-400/30'
                : 'text-neutral-400 border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800/50'
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setFilterCategory(cat.value)}
              className={`px-3 py-1.5 text-xs rounded-full border transition flex items-center gap-1.5 ${
                filterCategory === cat.value
                  ? 'bg-rose-500/20 text-rose-400 border-rose-400/30'
                  : 'text-neutral-400 border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800/50'
              }`}
            >
              <cat.icon className="w-3 h-3" />
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {filteredCravings.length === 0 ? (
        <div className="text-center text-neutral-500 py-16 bg-neutral-900/50 rounded-2xl border border-neutral-800/50">
          <Sparkles className="w-10 h-10 mx-auto mb-3 text-neutral-600" />
          <p className="text-lg font-medium text-neutral-400">
            {cravings.length === 0 ? 'No cravings yet' : 'No cravings in this category'}
          </p>
          <p className="text-sm text-neutral-600">
            {cravings.length === 0 ? 'Add one above to get started' : 'Try a different filter'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCravings.map((craving) => {
            const category = craving.category || 'Other';
            const CategoryIcon = CATEGORIES.find((c) => c.value === category)?.icon || MoreHorizontal;
            const colorClass = CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;

            return (
              <div
                key={craving.id}
                className={`flex items-center gap-4 bg-neutral-900 rounded-2xl border p-4 transition ${
                  craving.fulfilled ? 'border-neutral-700/30 bg-neutral-900/60' : 'border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <button
                  onClick={() => handleToggle(craving.id)}
                  className="flex-shrink-0 text-neutral-500 hover:text-rose-400 transition"
                >
                  {craving.fulfilled ? (
                    <CheckCircle className="w-5 h-5 text-rose-400" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>
                <span className={`flex-1 text-sm ${craving.fulfilled ? 'text-neutral-500 line-through' : 'text-white'}`}>
                  {craving.content}
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border ${colorClass}`}>
                  <CategoryIcon className="w-3 h-3" />
                  {category}
                </span>
                <span className="text-xs text-neutral-500">
                  {new Date(craving.created_at).toLocaleDateString()}
                </span>
                {craving.user_id === userId && (
                  <button
                    onClick={() => handleDelete(craving.id)}
                    className="text-neutral-500 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-neutral-600 text-center mt-6">
        ✓ Fulfilled cravings automatically disappear after 24 hours.
      </p>
    </div>
  );
}
