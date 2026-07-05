import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { CheckCircle, Circle, Plus, Trash2, Loader2 } from 'lucide-react';

interface Craving {
  id: string;
  content: string;
  fulfilled: boolean;
  user_id: string;
  partner_id: string;
  created_at: string;
}

export function Cravings() {
  const [cravings, setCravings] = useState<Craving[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [relationshipId, setRelationshipId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [limitInfo, setLimitInfo] = useState<{ current: number; limit: number } | null>(null);
  const navigate = useNavigate();

  // Fetch user and relationship
  useEffect(() => {
    const fetchUserAndRelationship = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      setUserId(user.id);

      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/relationships/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data) {
          setRelationshipId(res.data.id);
          setPartnerId(res.data.partner_id);
        } else {
          setError('No active relationship found. Please pair with your partner.');
        }
      } catch (err) {
        console.error('Failed to fetch relationship:', err);
        setError('Could not fetch relationship details.');
      } finally {
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
    } catch (err) {
      console.error('Failed to fetch cravings:', err);
      setError('Could not load cravings.');
    }
  }, [relationshipId]);

  useEffect(() => {
    if (relationshipId) {
      fetchCravings();
    }
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
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchCravings();
      setNewContent('');
    } catch (err: any) {
      if (err.response?.status === 429) {
        setError('Daily craving limit reached (5 per day).');
      } else {
        setError('Failed to add craving.');
      }
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
    } catch (err) {
      console.error('Failed to toggle craving:', err);
      setError('Could not update craving.');
    }
  };

  // Delete craving
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this craving?')) return;
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/api/cravings/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchCravings();
    } catch (err) {
      console.error('Failed to delete craving:', err);
      setError('Could not delete craving.');
    }
  };

  // Real-time subscription
  useEffect(() => {
    if (!relationshipId) return;

    const channel = supabase
      .channel(`cravings:${relationshipId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cravings',
          filter: `relationship_id=eq.${relationshipId}`,
        },
        () => {
          fetchCravings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [relationshipId, fetchCravings]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-rose-400">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Cravings Board</h1>
          <p className="text-neutral-400 text-sm">Share what you're craving or need</p>
        </div>
        {limitInfo && (
          <span className="text-sm text-neutral-500">
            {limitInfo.current} / {limitInfo.limit} used today
          </span>
        )}
      </div>

      <form onSubmit={handleAddCraving} className="flex gap-3 mb-8">
        <input
          type="text"
          placeholder="Add a craving or request..."
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          className="flex-1 bg-neutral-800/50 text-sm text-white placeholder:text-neutral-500 px-4 py-2.5 rounded-lg border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-rose-400/50"
        />
        <button
          type="submit"
          disabled={submitting || !newContent.trim()}
          className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add
        </button>
      </form>

      {cravings.length === 0 ? (
        <div className="text-center text-neutral-500 py-12">
          <p className="text-lg">No cravings yet</p>
          <p className="text-sm">Add one above to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cravings.map((craving) => (
            <div
              key={craving.id}
              className="flex items-center gap-4 bg-neutral-900 rounded-2xl border border-neutral-800 p-4 hover:border-neutral-700 transition"
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
          ))}
        </div>
      )}
    </div>
  );
}
