// Stands in for axios: answers backend calls from mocks/data.ts, keyed by path.
// Unknown paths resolve to an empty object and log a warning so gaps are easy to spot.
import * as d from './data';
import { showsCycle } from '../../src/lib/cycle';

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
  if (path === '/qa/history') {
    const older = q.before ? d.qaHistory.filter((h) => h.assigned_date < String(q.before)) : d.qaHistory;
    const page = older.slice(0, Number(q.limit) || 20);
    const hasMore = older.length > page.length;
    const { display_name, avatar_url } = d.partner;
    return ok({ items: page, hasMore, nextCursor: hasMore ? page[page.length - 1].assigned_date : null, partner: q.before ? null : { display_name, avatar_url } });
  }
  if (path === '/qa/categories') return ok(d.qaCategories);
  if (path === '/cycles/overview') {
    // copies, like a real response, so later writes don't change what the page already holds
    const periodsOf = (p: typeof d.me | typeof d.partner) => d.periods[p.id].map((x) => ({ ...x }));
    const theirs = periodsOf(d.partner);
    return ok({
      me: { name: d.me.display_name, hasPeriods: d.me.has_periods, periods: periodsOf(d.me) },
      // same rule as the function: a partner's periods only when their cycle is shared
      partner: { name: d.partner.display_name, hasPeriods: d.partner.has_periods, periods: showsCycle(d.partner.has_periods, theirs.length) ? theirs : [] },
    });
  }
  if (path === '/cycles/symptoms' || path === '/cycles/partner/symptoms') {
    const owner = path === '/cycles/symptoms' ? d.me : d.partner;
    if (owner === d.partner && !showsCycle(d.partner.has_periods, d.periods[d.partner.id].length)) return ok([]);
    return ok(d.symptomLogs[owner.id].filter((l) => (!q.from || l.log_date >= String(q.from)) && (!q.to || l.log_date <= String(q.to))));
  }
  if (path === '/notifications/unread-count') return ok({ count: d.notifications.filter((n) => !n.read).length });
  if (path === '/notifications') {
    if (!d.paired) return notFound();
    const older = q.before ? d.notifications.filter((n) => n.created_at < String(q.before)) : d.notifications;
    return ok(older.slice(0, Number(q.limit) || 30));
  }
  if (path === '/profile') return ok({ ...d.me, created_at: d.stats.user.account_created });
  console.warn('[mock axios] unmocked GET', path);
  return ok({});
}

async function patch(url: string, body: Record<string, string | null> = {}): Promise<Res> {
  const period = pathOf(url).match(/^\/cycles\/log\/(.+)$/);
  if (period) {
    const mine = d.periods[d.me.id];
    const i = mine.findIndex((p) => p.id === period[1]);
    mine[i] = { ...mine[i], ...body };
    return ok(mine[i]);
  }
  if (pathOf(url) === '/profile') {
    if (body.avatar_url) body = { ...body, avatar_url: photos.get(new URL(body.avatar_url).pathname) ?? body.avatar_url };
    return ok({ ...Object.assign(d.me, body), created_at: d.stats.user.account_created });
  }
  if (pathOf(url) === '/qa/preferred-category' && d.question) d.question.preferredCategoryId = body.category_id;
  const m = pathOf(url).match(/^\/cravings\/(.+)\/toggle$/);
  if (m) d.setCravings(d.cravings.map((c) => (c.id === m[1] ? { ...c, fulfilled: !c.fulfilled, fulfilled_at: c.fulfilled ? null : new Date().toISOString() } : c)));
  return ok({});
}

// Photo uploads: the bytes stay in the browser as a blob address, with progress over about 1.2s
const photos = new Map<string, string>();
async function uploadPhoto(path: string, blob: Blob, onUploadProgress?: (e: { loaded: number; total: number }) => void) {
  for (let i = 1; i <= 12; i++) {
    await new Promise((r) => setTimeout(r, 100));
    onUploadProgress?.({ loaded: (blob.size * i) / 12, total: blob.size });
  }
  photos.set(path.replace('/storage/v1/object/', '/storage/v1/object/public/'), URL.createObjectURL(blob));
  return ok({ Key: path });
}

async function post(url: string, body: Record<string, string> = {}, config: { onUploadProgress?: (e: { loaded: number; total: number }) => void } = {}): Promise<Res> {
  const path = pathOf(url);
  if (path.startsWith('/storage/v1/object/avatars/') || path.startsWith('/storage/v1/object/letter-images/'))
    return uploadPhoto(path, body as unknown as Blob, config.onUploadProgress);
  if (path === '/cravings')
    d.setCravings([{ id: crypto.randomUUID(), content: body.content, category: body.category, fulfilled: false, user_id: d.me.id, created_at: new Date().toISOString() }, ...d.cravings]);
  const opening = path.match(/^\/love-letters\/(.+)\/open$/);
  if (opening) {
    const opened_at = new Date().toISOString();
    d.setLetters(d.letters.map((l) => (l.id === opening[1] && !l.opened_at ? { ...l, opened_at } : l)));
    return ok({ id: opening[1], opened_at });
  }
  if (path === '/love-letters') {
    // like the function: the photo's path becomes a link to read it, and the path itself isn't returned
    const { photo_path, ...fields } = body;
    const photo_url = photo_path ? photos.get(`/storage/v1/object/public/letter-images/${photo_path}`) ?? null : null;
    const letter = { id: crypto.randomUUID(), ...fields, photo_url, sender_id: d.me.id, created_at: new Date().toISOString(), opened_at: null };
    d.setLetters([letter as (typeof d.letters)[number], ...d.letters]);
    return ok(letter);
  }
  if (path === '/qa/submit' && d.question) {
    const q = d.question;
    q.yourAnswer = { answer_text: body.answer_text, submitted_at: new Date().toISOString() };
    q.bothAnswered = q.revealed = q.partnerAnswered;
    q.partnerAnswer = q.partnerAnswered ? d.qaPartnerAnswer : null;
    return ok({ answer: q.yourAnswer, bothAnswered: q.bothAnswered, message: '' });
  }
  if (path === '/qa/skip' && d.question)
    d.question.question = { id: 'q2', question_text: 'If we could spend one whole day doing nothing together, what would it look like?', category_id: 'cat-dreams' };
  if (path === '/relationships/invite') return ok({ invite_code: 'K7Q2M9XD' });
  if (path === '/cycles/log') {
    const row = { id: crypto.randomUUID(), start_date: body.start_date, end_date: body.end_date ?? null };
    d.periods[d.me.id].push(row);
    return ok(row);
  }
  if (path === '/cycles/symptoms') {
    // Same as the function: one log per day, and an empty one clears the day
    const logs = d.symptomLogs[d.me.id];
    const rest = logs.filter((l) => l.log_date !== body.log_date);
    const v = body as unknown as Record<string, unknown> & { lifestyle?: { sleep_hours?: unknown; stress?: unknown; alcohol?: unknown } };
    const empty = !v.bleeding_intensity && !v.discharge && !v.sex_drive && !(v.physical_symptoms as string[])?.length && !(v.moods as string[])?.length &&
      !(v.sexual_activity as string[])?.length && v.lifestyle?.sleep_hours == null && !v.lifestyle?.stress && !v.lifestyle?.alcohol;
    d.symptomLogs[d.me.id] = empty ? rest : [...rest, body as unknown as (typeof logs)[number]];
    return ok(empty ? null : body);
  }
  return ok({});
}

async function del(url: string): Promise<Res> {
  const period = pathOf(url).match(/^\/cycles\/log\/(.+)$/);
  if (period) d.periods[d.me.id] = d.periods[d.me.id].filter((p) => p.id !== period[1]);
  const m = pathOf(url).match(/^\/cravings\/(.+)$/);
  if (m) d.setCravings(d.cravings.filter((c) => c.id !== m[1]));
  return ok({});
}

// Offline (DevTools, or `playwright-cli network-state-set offline`) every call fails like a real network error
const online = <A extends unknown[]>(call: (...args: A) => Promise<Res>) => (...args: A) =>
  navigator.onLine ? call(...args) : Promise.reject(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));

const axios = { get: online(get), post: online(post), patch: online(patch), put: online(patch), delete: online(del), isAxiosError: () => false };
export default axios;
