import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { KeyRound, Loader2, CheckCircle } from 'lucide-react';

export function ChangePassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    if (!email) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-emerald-400" />
        <p className="text-emerald-400 text-sm">Password reset email sent. Check your inbox.</p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 space-y-4">
      <h3 className="text-white font-medium flex items-center gap-2">
        <KeyRound className="w-5 h-5 text-rose-400" />
        Change Password
      </h3>
      <p className="text-neutral-400 text-sm">
        Enter your email to receive a password reset link.
      </p>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="flex-1 bg-neutral-800 text-sm text-white px-4 py-2.5 rounded-xl border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-rose-400/50"
        />
        <button
          onClick={handleReset}
          disabled={loading || !email}
          className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium transition disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
        </button>
      </div>
      {error && <p className="text-rose-400 text-sm">{error}</p>}
    </div>
  );
}
