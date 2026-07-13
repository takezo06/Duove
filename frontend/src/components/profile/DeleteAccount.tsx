import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import axios from 'axios';
import { Skull, Loader2, AlertTriangle } from 'lucide-react';

export function DeleteAccount() {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/account`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Sign out and redirect to login
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete account');
      setLoading(false);
      setConfirm(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6">
      <h3 className="text-white font-medium mb-3 flex items-center gap-2">
        <Skull className="w-5 h-5 text-red-400" />
        Delete Account
      </h3>
      <p className="text-neutral-400 text-sm mb-4">
        Permanently delete your account and all associated data. This action is irreversible.
      </p>

      {!confirm ? (
        <button
          onClick={() => setConfirm(true)}
          className="px-5 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl font-medium hover:bg-red-500/20 transition"
        >
          Delete My Account
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-xs">All your data will be permanently removed. This cannot be undone.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, delete my account'}
            </button>
            <button
              onClick={() => setConfirm(false)}
              className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl font-medium transition"
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-rose-400 text-sm">{error}</p>}
        </div>
      )}
    </div>
  );
}
