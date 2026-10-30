// When the backend says a login is no longer valid (401), refresh it once and retry the request.
// If the refresh fails too, the login is dead: sign out on this device, and the protected
// layout sends the visitor to /login instead of leaving them on broken pages.
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { supabase } from './supabase';

const backend = import.meta.env.VITE_BACKEND_URL as string;
// Many requests can fail at once; they all wait on the same refresh
let refreshing: Promise<string | null> | null = null;

const refresh = () =>
  (refreshing ??= supabase.auth
    .refreshSession()
    .then(({ data, error }) => (error ? null : data.session?.access_token ?? null))
    .finally(() => { refreshing = null; }));

export function installSessionGuard() {
  // The preview's axios stand-in has no interceptors
  axios.interceptors?.response.use(undefined, async (err: AxiosError) => {
    const config = err.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    if (err.response?.status !== 401 || !config?.url?.startsWith(backend) || config._retried) throw err;
    const token = await refresh();
    if (!token) {
      // 'local' clears this device only; the server already rejects the old token
      await supabase.auth.signOut({ scope: 'local' });
      throw err;
    }
    config._retried = true;
    config.headers.set('Authorization', `Bearer ${token}`);
    return axios.request(config);
  });
}
