// Run: node scripts/consent.check.ts
import assert from 'node:assert/strict';
import { getConsent, saveConsent, subscribeConsent } from '../src/lib/consent.ts';

const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
} as Storage;
const KEY = 'duove-consent';
const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString();

// Never asked, or a record we can't trust: ask
assert.equal(getConsent(), null);
store.set(KEY, 'not json');
assert.equal(getConsent(), null);
store.set(KEY, JSON.stringify({ cache: true, spotify: true, at: daysAgo(400) }));
assert.equal(getConsent(), null); // a year on: ask again
store.set(KEY, JSON.stringify({ cache: true, at: daysAgo(1) }));
assert.equal(getConsent(), null); // a category they never answered: ask again

// A recent choice holds, as the same object until it changes
store.set(KEY, JSON.stringify({ cache: true, spotify: false, at: daysAgo(1) }));
assert.deepEqual(getConsent(), { cache: true, spotify: false });
assert.equal(getConsent(), getConsent());

// Saving tells subscribers once and is read back from storage
let calls = 0;
subscribeConsent(() => calls++);
saveConsent({ cache: false, spotify: true });
assert.equal(calls, 1);
assert.deepEqual(getConsent(), { cache: false, spotify: true });
assert.equal(JSON.parse(store.get(KEY)!).spotify, true);
assert.ok(Date.parse(JSON.parse(store.get(KEY)!).at) > Date.now() - 1000);

console.log('consent ok');
