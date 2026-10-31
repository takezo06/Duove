import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { apiError } from '../lib/apiError';

// A button that shows a spinner while its action runs and reports a failure under the row
export function useAction() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = (key: string, fn: () => Promise<void>, fallback = "That didn't save. Try again.") => async () => {
    setBusy(key);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(apiError(err, fallback));
    } finally {
      setBusy(null);
    }
  };
  const spin = (key: string) => busy === key && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />;
  const alert = error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>;
  return { busy, run, spin, alert };
}
