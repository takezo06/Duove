// Stands in for axios: answers backend calls from mocks/data.ts, keyed by path.
// Unknown paths resolve to an empty object and log a warning so gaps are easy to spot.
import * as d from './data';

type Res = { data: unknown };
const ok = (data: unknown): Res => ({ data });
const notFound = () => Promise.reject({ response: { status: 404, data: { error: 'No active relationship' } } });
const pathOf = (url: string) => new URL(url, location.origin).pathname.replace(/^.*\/functions\/v1/, '');

async function get(url: string): Promise<Res> {
  const path = pathOf(url);
  if (path.startsWith('/relationships/pending')) return ok(d.paired ? null : { invite_code: 'K7Q2M9XD' });
  if (!d.paired && /^\/(relationships|cycles|cravings|qa|love-letters)/.test(path)) return notFound();
  if (path === '/relationships/stats') return ok(d.stats);
  if (path === '/relationships/me') return ok({ relationship: d.relationship, partner: d.partner });
  if (path === '/cravings') return ok(d.cravings);
  if (path === '/love-letters') return ok(d.letters);
  if (path === '/qa/current') return ok(d.question);
  if (path === '/qa/history') return ok([]);
  if (path === '/qa/categories') return ok([]);
  if (path === '/cycles/stats' || path === '/cycles/partner/stats')
    return ok({ prediction: d.prediction, calendar: [], lastPeriodStart: d.cycles.at(-1)?.start_date ?? null, partnerName: d.partner.display_name });
  if (path.startsWith('/cycles/')) return ok([]);
  if (path === '/notifications/unread-count') return ok({ count: d.notifications.filter((n) => !n.read).length });
  if (path === '/notifications') return ok(d.notifications);
  if (path === '/profile') return ok({ ...d.me });
  console.warn('[mock axios] unmocked GET', path);
  return ok({});
}

async function patch(url: string): Promise<Res> {
  const m = pathOf(url).match(/^\/cravings\/(.+)\/toggle$/);
  if (m) d.setCravings(d.cravings.map((c) => (c.id === m[1] ? { ...c, fulfilled: !c.fulfilled } : c)));
  return ok({});
}

async function post(url: string, body: Record<string, string> = {}): Promise<Res> {
  const path = pathOf(url);
  if (path === '/cravings')
    d.setCravings([{ id: crypto.randomUUID(), content: body.content, category: body.category, fulfilled: false, user_id: d.me.id, created_at: new Date().toISOString() }, ...d.cravings]);
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
