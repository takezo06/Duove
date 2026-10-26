import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { field, primaryButton, textLink } from '../components/Card';
import { LegalLinks } from '../components/Legal';


export function Signup() {
  usePageTitle('Signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { username: username.trim() || undefined },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    // Optionally navigate to login after a delay
    setTimeout(() => navigate('/login'), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4 py-10">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <img src="/duove-logo.svg" alt="Duove" className="w-16 h-16 mx-auto object-contain" />
          <h1 className="mt-4 text-2xl font-bold text-white">Create your account</h1>
          <p className="text-neutral-400 mt-1">Start your journey together</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm text-neutral-400 mb-2">
              Username (optional)
            </label>
            <input
              id="username"
              type="text"
              placeholder="Your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={field}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm text-neutral-400 mb-2">
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
            <label htmlFor="password" className="block text-sm text-neutral-400 mb-2">
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
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </p>
          )}

          {success && (
            <p role="status" className="text-sm text-emerald-400">
              Account created! Redirecting to login...
            </p>
          )}

          <button type="submit" disabled={loading} className={`${primaryButton} w-full`}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
            {loading ? 'Creating account...' : 'Create account'}
          </button>

          <p className="text-xs text-neutral-400 text-center">
            By creating an account, you agree to the <Link to="/terms" className={textLink}>Terms of service</Link> and
            confirm you're 18 or older. The <Link to="/privacy" className={textLink}>Privacy policy</Link> explains what
            Duove keeps and who sees it.
          </p>
        </form>

        {/* Login link */}
        <p className="text-center text-sm text-neutral-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className={textLink}>
            Sign in
          </Link>
        </p>

        <LegalLinks className="mt-8 justify-center" />
      </div>
    </div>
  );
}
