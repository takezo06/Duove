import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Heart, Mail, Lock, Loader2, KeyRound, ArrowLeft } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';

export function Login() {
  usePageTitle('Login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modes: 'login' | 'recovery' | 'forgot'
  const [mode, setMode] = useState<'login' | 'recovery' | 'forgot'>('login');
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();

  // Detect password recovery link (user clicked email)
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('recovery');
      }
    });
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Normal login
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    navigate('/');
  };

  // Password reset request (forgot mode)
  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setResetSent(true);
    setLoading(false);
  };

  // Password update (recovery mode)
  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setMode('login');
    setEmail('');
    setPassword('');
    navigate('/');
  };

  // Switch back to login from other modes
  const goToLogin = () => {
    setMode('login');
    setResetSent(false);
    setEmail('');
    setPassword('');
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-rose-400/10 border border-rose-400/20 mb-4">
            <img src="/duove-logo.svg" alt="Duove" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-semibold text-white">
            {mode === 'recovery'
              ? 'Reset your password'
              : mode === 'forgot'
              ? 'Forgot password?'
              : 'Welcome back'}
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            {mode === 'recovery'
              ? 'Choose a new password for your account.'
              : mode === 'forgot'
              ? 'Enter your email and we’ll send you a reset link.'
              : 'Sign in to your Duove account'}
          </p>
        </div>

        {/* RECOVERY MODE (clicked email link) */}
        {mode === 'recovery' && (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-neutral-300 mb-1">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-rose-400/50 focus:border-transparent transition"
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-400/30 text-rose-400 text-sm px-4 py-2 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              {loading ? 'Updating...' : 'Update password'}
            </button>

            <button
              type="button"
              onClick={goToLogin}
              className="w-full flex items-center justify-center gap-2 text-neutral-400 hover:text-white text-sm transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </button>
          </form>
        )}

        {/* FORGOT MODE */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            {!resetSent ? (
              <>
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-neutral-300 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      id="reset-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-rose-400/50 focus:border-transparent transition"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-rose-500/10 border border-rose-400/30 text-rose-400 text-sm px-4 py-2 rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-lg p-4 text-center">
                <p className="text-emerald-400 text-sm">Reset link sent! Check your inbox.</p>
                <button
                  type="button"
                  onClick={goToLogin}
                  className="mt-3 text-rose-400 text-sm hover:underline"
                >
                  Back to sign in
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={goToLogin}
              className="w-full flex items-center justify-center gap-2 text-neutral-400 hover:text-white text-sm transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </button>
          </form>
        )}

        {/* LOGIN MODE */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-rose-400/50 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-rose-400/50 focus:border-transparent transition"
                />
              </div>
              {/* Forgot password link */}
              <p className="text-right mt-1">
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(null); }}
                  className="text-xs text-rose-400 hover:text-rose-300 transition"
                >
                  Forgot password?
                </button>
              </p>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-400/30 text-rose-400 text-sm px-4 py-2 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        )}

        {/* Sign up link */}
        {mode === 'login' && (
          <p className="text-center text-sm text-neutral-400 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-rose-400 hover:text-rose-300 transition">
              Create one
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
