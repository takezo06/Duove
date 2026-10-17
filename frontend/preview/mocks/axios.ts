// Stands in for axios: answers backend calls from mocks/data.ts, keyed by path.
// Unknown paths resolve to an empty object and log a warning so gaps are easy to spot.
import * as d from './data';

type Res = { data: unknown };
const ok = (data: unknown): Res => ({ data });
const notFound = () => Promise.reject({ response: { status: 404, data: { error: 'No active relationship' } } });
const pathOf = (url: string) => new URL(url, location.origin).pathname.replace(/^.*\/functions\/v1/, '');

// ?slow: every GET waits a random 1-3s so loading states can be checked
const slow = new URLSearchParams(location.search).has('slow');

async function get(url: string, config: { params?: Record<string, unknown> } = {}): Promise<Res> {
  const path = pathOf(url);
  if (slow) await new Promise((r) => setTimeout(r, 1000 + Math.random() * 2000));
  const q = { ...Object.fromEntries(new URL(url, location.origin).searchParams), ...config.params };
  if (path.startsWith('/relationships/pending')) return ok(d.paired ? null : { invite_code: 'K7Q2M9XD' });
  if (!d.paired && /^\/(relationships|cycles|cravings|qa|love-letters)/.test(path)) return notFound();
  if (path === '/relationships/stats') return ok(d.stats);
  if (path === '/relationships/me') return ok({ relationship: d.relationship, partner: d.partner });
  if (path === '/cravings') return ok(d.cravings);
  if (path === '/love-letters') {
    if (q.id) return ok(d.letters.filter((l) => l.id === q.id));
    const older = q.before ? d.letters.filter((l) => l.created_at < String(q.before)) : d.letters;
    if (q.before) await new Promise((r) => setTimeout(r, 400)); // let the "loading more" state show
    return ok(older.slice(0, Number(q.limit) || 20));
  }
  if (path === '/love-letters/search-song')
    return ok([
      { id: '4iV5W9uYEdYUVa79Axb7Rh', name: 'Here Comes the Sun', artist: 'The Beatles', albumArt: '' },
      { id: '3n3Ppam7vgaVa1iaRUc9Lp', name: 'Mr. Brightside', artist: 'The Killers', albumArt: '' },
    ]);
  if (path === '/qa/current')
    return d.question ? ok(d.question) : Promise.reject({ response: { status: 404, data: { error: 'No questions available' } } });
  if (path === '/qa/history') return ok({ items: d.qaHistory, hasMore: false, nextCursor: null });
  if (path === '/qa/categories') return ok(d.qaCategories);
  if (path === '/cycles/stats' || path === '/cycles/partner/stats')
    return ok({ prediction: d.prediction, calendar: [], lastPeriodStart: d.cycles.at(-1)?.start_date ?? null, partnerName: d.partner.display_name });
  if (path.startsWith('/cycles/')) return ok([]);
  if (path === '/notifications/unread-count') return ok({ count: d.notifications.filter((n) => !n.read).length });
  if (path === '/notifications') return d.paired ? ok(d.notifications) : notFound();
  if (path === '/profile') return ok({ ...d.me });
  console.warn('[mock axios] unmocked GET', path);
  return ok({});
}

async function patch(url: string, body: Record<string, string | null> = {}): Promise<Res> {
  if (pathOf(url) === '/qa/preferred-category' && d.question) d.question.preferredCategoryId = body.category_id;
  const m = pathOf(url).match(/^\/cravings\/(.+)\/toggle$/);
  if (m) d.setCravings(d.cravings.map((c) => (c.id === m[1] ? { ...c, fulfilled: !c.fulfilled, fulfilled_at: c.fulfilled ? null : new Date().toISOString() } : c)));
  return ok({});
}

async function post(url: string, body: Record<string, string> = {}): Promise<Res> {
  const path = pathOf(url);
  if (path === '/cravings')
    d.setCravings([{ id: crypto.randomUUID(), content: body.content, category: body.category, fulfilled: false, user_id: d.me.id, created_at: new Date().toISOString() }, ...d.cravings]);
  const opening = path.match(/^\/love-letters\/(.+)\/open$/);
  if (opening) {
    const opened_at = new Date().toISOString();
    d.setLetters(d.letters.map((l) => (l.id === opening[1] && !l.opened_at ? { ...l, opened_at } : l)));
    return ok({ id: opening[1], opened_at });
  }
  if (path === '/love-letters') {
    const letter = { id: crypto.randomUUID(), ...body, sender_id: d.me.id, created_at: new Date().toISOString(), opened_at: null };
    d.setLetters([letter as (typeof d.letters)[number], ...d.letters]);
    return ok(letter);
  }
  if (path === '/qa/submit' && d.question) {
    const q = d.question;
    q.yourAnswer = { answer_text: body.answer_text, submitted_at: new Date().toISOString() };
    q.bothAnswered = q.revealed = q.partnerAnswered;
    q.partnerAnswer = q.partnerAnswered ? d.qaPartnerAnswer : null;
    return ok({ message: '' });
  }
  if (path === '/qa/skip' && d.question)
    d.question.question = { id: 'q2', question_text: 'If we could spend one whole day doing nothing together, what would it look like?', category_id: 'cat-dreams' };
  if (path === '/relationships/invite') return ok({ invite_code: 'K7Q2M9XD' });
  return ok({});
}

async function del(url: string): Promise<Res> {
  const m = pathOf(url).match(/^\/cravings\/(.+)$/);
  if (m) d.setCravings(d.cravings.filter((c) => c.id !== m[1]));
  return ok({});
}

const axios = { get, post, patch, put: patch, delete: del, isAxiosError: () => false };
export default axios;
