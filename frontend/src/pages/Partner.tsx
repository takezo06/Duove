import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { Copy, Loader2, Users, Link, CheckCircle, ArrowRight } from 'lucide-react';

export function Partner() {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasActive, setHasActive] = useState(false);
  const [hasPending, setHasPending] = useState(false);
  const [mode, setMode] = useState<'join' | 'generate'>('join');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/relationships/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data) {
          setHasActive(true);
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          // Check pending
          try {
            const token2 = (await supabase.auth.getSession()).data.session?.access_token;
            const pendingRes = await axios.get(
              `${import.meta.env.VITE_BACKEND_URL}/api/relationships/pending`,
              { headers: { Authorization: `Bearer ${token2}` } }
            );
            if (pendingRes.data) {
              setHasPending(true);
              setInviteCode(pendingRes.data.invite_code);
            }
          } catch {
            // No pending
          }
        }
        setHasActive(false);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const generateInvite = async () => {
    setGenerating(true);
    setError(null);
    setSuccess(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/relationships/invite`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInviteCode(res.data.invite_code);
      setHasPending(true);
      setSuccess('Invite code generated! Share this with your partner.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate invite');
    } finally {
      setGenerating(false);
    }
  };

  const joinRelationship = async () => {
    if (!inputCode.trim()) return;
    setJoining(true);
    setError(null);
    setSuccess(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/relationships/join`,
        { invite_code: inputCode.trim().toUpperCase() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('You are now paired! Redirecting...');
      setTimeout(() => navigate('/'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to join');
    } finally {
      setJoining(false);
    }
  };

  const copyToClipboard = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setSuccess('Copied to clipboard!');
      setTimeout(() => setSuccess(null), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading...
      </div>
    );
  }

  if (hasActive) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="bg-emerald-500/10 border border-emerald-400/30 text-emerald-400 rounded-2xl p-8">
          <CheckCircle className="w-12 h-12 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-white">You're already paired!</h2>
          <p className="text-neutral-400 mt-2">You and your partner are connected. Enjoy the app!</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-white mb-2">Partner Connection</h1>
      <p className="text-neutral-400 mb-8">Pair with your partner to start sharing</p>

      {/* Mode selector */}
      <div className="flex gap-2 mb-6 bg-neutral-800/50 rounded-lg p-1">
        <button
          onClick={() => setMode('join')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
            mode === 'join' ? 'bg-rose-500 text-white' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Join with code
        </button>
        <button
          onClick={() => setMode('generate')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
            mode === 'generate' ? 'bg-rose-500 text-white' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Generate invite
        </button>
      </div>

      {mode === 'join' ? (
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6">
          <h2 className="text-lg font-medium text-white mb-3">Enter your partner's code</h2>
          <p className="text-sm text-neutral-400 mb-4">Ask your partner to generate an invite code and enter it below.</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. ABC12345"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              className="flex-1 bg-neutral-800/50 text-sm text-white placeholder:text-neutral-500 px-4 py-2.5 rounded-lg border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-rose-400/50 uppercase"
            />
            <button
              onClick={joinRelationship}
              disabled={joining || !inputCode.trim()}
              className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50"
            >
              {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Join
            </button>
          </div>
          {error && <p className="text-rose-400 text-sm mt-3">{error}</p>}
          {success && <p className="text-emerald-400 text-sm mt-3">{success}</p>}
        </div>
      ) : (
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6">
          <h2 className="text-lg font-medium text-white mb-3">Generate invite code</h2>
          <p className="text-sm text-neutral-400 mb-4">Create a code to share with your partner.</p>
          {!inviteCode ? (
            <button
              onClick={generateInvite}
              disabled={generating}
              className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
              Generate invite
            </button>
          ) : (
            <div className="space-y-4">
              <div className="bg-neutral-800 rounded-lg p-4 text-center">
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Your invite code</p>
                <p className="text-2xl font-mono font-bold text-white tracking-widest">{inviteCode}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
                <button
                  onClick={generateInvite}
                  className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition"
                >
                  Regenerate
                </button>
              </div>
              <p className="text-xs text-neutral-500 text-center">Share this code with your partner</p>
            </div>
          )}
          {error && <p className="text-rose-400 text-sm mt-3">{error}</p>}
          {success && <p className="text-emerald-400 text-sm mt-3">{success}</p>}
        </div>
      )}
    </div>
  );
}
