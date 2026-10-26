import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Loader2, KeyRound, ArrowLeft } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { field, focusRing, primaryButton, textLink } from '../components/Card';
import { LegalLinks } from '../components/Legal';

const label = 'block text-sm text-neutral-400 mb-2';
const errorBanner = 'rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300';
const textAction = `inline-flex items-center justify-center gap-2 min-h-10 text-sm font-medium text-neutral-400 hover:text-rose-400 transition rounded cursor-pointer ${focusRing}`;

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
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4 py-10">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <img src="/duove-logo.svg" alt="Duove" className="w-16 h-16 mx-auto object-contain" />
          <h1 className="mt-4 text-2xl font-bold text-white">
            {mode === 'recovery'
              ? 'Reset your password'
              : mode === 'forgot'
              ? 'Forgot password?'
              : 'Welcome back'}
          </h1>
          <p className="text-neutral-400 mt-1">
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
              <label htmlFor="new-password" className={label}>
                New password
              </label>
              <input
                id="new-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={field}
              />
            </div>

            {error && <p role="alert" className={errorBanner}>{error}</p>}

            <button type="submit" disabled={loading} className={`${primaryButton} w-full`}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <KeyRound className="w-4 h-4" aria-hidden />}
              {loading ? 'Updating...' : 'Update password'}
            </button>

            <button type="button" onClick={goToLogin} className={`${textAction} w-full`}>
              <ArrowLeft className="w-4 h-4" aria-hidden />
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
                  <label htmlFor="reset-email" className={label}>
                    Email
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={field}
                  />
                </div>

                {error && <p role="alert" className={errorBanner}>{error}</p>}

                <button type="submit" disabled={loading} className={`${primaryButton} w-full`}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Mail className="w-4 h-4" aria-hidden />}
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </>
            ) : (
              <p role="status" className="text-sm text-emerald-400 text-center">
                Reset link sent. Check your inbox.
              </p>
            )}

            <button type="button" onClick={goToLogin} className={`${textAction} w-full`}>
              <ArrowLeft className="w-4 h-4" aria-hidden />
              Back to sign in
            </button>
          </form>
        )}

        {/* LOGIN MODE */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className={label}>
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={field}
              />
            </div>

            <div>
              <label htmlFor="password" className={label}>
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={field}
              />
              {/* Forgot password link */}
              <p className="text-right mt-1">
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(null); }}
                  className={textAction}
                >
                  Forgot password?
                </button>
              </p>
            </div>

            {error && <p role="alert" className={errorBanner}>{error}</p>}

            <button type="submit" disabled={loading} className={`${primaryButton} w-full`}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        )}

        {/* Sign up link */}
        {mode === 'login' && (
          <p className="text-center text-sm text-neutral-400 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className={textLink}>
              Create one
            </Link>
          </p>
        )}

        <LegalLinks className="mt-8 justify-center" />
      </div>
    </div>
  );
}
