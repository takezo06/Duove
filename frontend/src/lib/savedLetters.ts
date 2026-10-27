// Every letter either letters page has loaded, newest first, so they can be read offline.
// Lives in lib/cache.ts: on the device only with "Faster loading", and gone on sign-out.
import { peek, put } from './cache';
import type { Letter } from '../components/love-letters/LetterReader';

const key = (userId: string) => `${userId}:letters`;

export const savedLetters = (userId: string) => peek<Letter[]>(key(userId)) ?? [];

// Adds or replaces by id, so the newest copy of a letter (its opened_at) wins
export function saveLetters(userId: string, letters: Letter[]) {
  if (!userId || letters.length === 0) return;
  const byId = new Map(savedLetters(userId).map((l) => [l.id, l]));
  letters.forEach((l) => byId.set(l.id, l));
  put(key(userId), [...byId.values()].sort((a, b) => b.created_at.localeCompare(a.created_at)));
}
