// Cached names and stats belong to one scenario: switching starts the cache clean.
// Imported before the app so nothing reads the cache first.
import { clearCache } from '../src/lib/cache';
import { scenario } from './mocks/data';

try {
  if (localStorage.getItem('mock-scenario') !== scenario) {
    clearCache();
    localStorage.setItem('mock-scenario', scenario);
  }
} catch { /* storage blocked: the cache is memory only anyway */ }
