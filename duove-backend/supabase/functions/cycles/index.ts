import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { createSupabaseClients } from "../_shared/supabase.ts";
import { getUserId } from "../_shared/auth.ts";

// Cycle predictions are computed on the client (frontend/src/lib/cycle.ts) in the user's own
// calendar days. This function stores periods and daily logs and checks them.

const BLEEDING = ["spotting", "light", "medium", "heavy"];
const DISCHARGE = ["creamy", "sticky", "eggwhite", "watery", "dry"];
const LEVELS = ["low", "medium", "high"];
const SYMPTOMS = ["cramps", "bloating", "headache", "backache", "breast tenderness", "acne", "fatigue", "nausea"];
const MOODS = ["happy", "calm", "energetic", "emotional", "moody", "irritable", "anxious", "sad"];
const SEX = ["protected", "unprotected", "masturbation"]; // all four lists match frontend/src/components/cycle/constants.ts
const MAX_PERIOD = 14; // same as the client
// Same rule as showsCycle in the client: a yes, or no answer and at least this many logged periods
const MIN_PERIODS_TO_SHOW = 2;
const sharesCycle = (hasPeriods: boolean | null, periods: number) =>
  hasPeriods === true || (hasPeriods === null && periods >= MIN_PERIODS_TO_SHOW);

// Calendar-day strings, timezone free
const isDay = (v: unknown): v is string =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v);
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
// The latest "today" anywhere on Earth (UTC+14), so nobody's today is rejected as the future
const latestToday = () => addDays(new Date().toISOString().slice(0, 10), 1);

type Period = { id: string; start_date: string; end_date: string | null };
// The span a period blocks for another start: at least 10 days, 14 while it's still open (as in the client)
const blocked = (p: Period): [string, string] => [
  p.start_date,
  p.end_date ? [p.end_date, addDays(p.start_date, 9)].sort()[1] : addDays(p.start_date, MAX_PERIOD - 1),
];

// Anything unexpected (a failed read) is a 500 with a message, never a half-checked write
serve((req) =>
  handle(req).catch((err) =>
    new Response(JSON.stringify({ error: err?.message || "Something went wrong. Try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  )
);

async function handle(req: Request) {
  if (req.method === "OPTIONS") return handleOptions();

  const { admin } = createSupabaseClients(req);
  const userId = await getUserId(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (!userId) return json({ error: "Unauthorized" }, 401);

  const url = new URL(req.url);
  let path = url.pathname.replace(/^\/cycles/, "").replace(/\/+$/, "");
  if (!path) path = "/stats";

  async function getActiveRelationship() {
    const { data } = await admin
      .from("relationships")
      .select("*")
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
      .eq("status", "active")
      .maybeSingle();
    return data;
  }

  function getPartnerId(rel: any) {
    return rel.user_id === userId ? rel.partner_id : rel.user_id;
  }

  const periodsOf = async (id: string) => {
    const { data, error } = await admin.from("cycle_logs").select("id, start_date, end_date").eq("user_id", id).order("start_date", { ascending: true });
    if (error) throw error; // never check an overlap against a list that didn't load
    return data || [];
  };
  // profiles.has_periods is the answer to "Do you have periods?" (null until asked). Read with select("*")
  // so a database without the column yet reads as "not answered" instead of failing.
  const hasPeriodsOf = (row: Record<string, unknown> | null | undefined) =>
    typeof row?.has_periods === "boolean" ? row.has_periods : null;
  // Whether this partner's cycle is shared at all (nothing is, until they say yes or have 2+ periods)
  async function partnerShares(id: string) {
    const { data } = await admin.from("profiles").select("*").eq("id", id).maybeSingle();
    const { count } = await admin.from("cycle_logs").select("id", { count: "exact", head: true }).eq("user_id", id);
    return sharesCycle(hasPeriodsOf(data), count ?? 0);
  }

  // A period [start, end] must not overlap another one's blocked span (`except` is the one being edited)
  async function checkPeriod(start: unknown, endIn: unknown, except?: string) {
    if (!isDay(start)) return "Pick the day your period started.";
    if (endIn !== null && !isDay(endIn)) return "Pick the day your period ended.";
    const end = endIn as string | null;
    if (start > latestToday() || (end && end > latestToday())) return "That day hasn't happened yet.";
    if (end && end < start) return "A period can't end before it starts.";
    if (end && daysBetween(start, end) >= MAX_PERIOD) return `A period can be at most ${MAX_PERIOD} days. Check the dates.`;
    // Its own blocked span, as in `blocked`: an open period reaches 14 days
    const spanEnd = end ? [end, addDays(start, 9)].sort()[1] : addDays(start, MAX_PERIOD - 1);
    const others = (await periodsOf(userId!)).filter((p: Period) => p.id !== except);
    if (others.some((p: Period) => { const [a, b] = blocked(p); return start <= b && a <= spanEnd; }))
      return "That's too close to a period you already logged. Edit that one instead.";
    return null;
  }

  // GET /cycles/overview: both partners' answers and periods. A partner's periods come only when
  // their cycle is shared (sharesCycle). 404 when not paired.
  if (path === "/overview" && req.method === "GET") {
    const relationship = await getActiveRelationship();
    if (!relationship) return json({ error: "No active relationship" }, 404);
    const partnerId = getPartnerId(relationship);
    const [{ data: profiles, error }, mine, theirs] = await Promise.all([
      admin.from("profiles").select("*").in("id", [userId, partnerId]),
      periodsOf(userId),
      periodsOf(partnerId),
    ]);
    if (error) return json({ error: error.message }, 500);
    const profile = (id: string) => profiles?.find((p) => p.id === id);
    const partnerHasPeriods = hasPeriodsOf(profile(partnerId));
    return json({
      me: { name: profile(userId)?.display_name || "You", hasPeriods: hasPeriodsOf(profile(userId)), periods: mine },
      partner: {
        name: profile(partnerId)?.display_name || "Partner",
        hasPeriods: partnerHasPeriods,
        periods: sharesCycle(partnerHasPeriods, theirs.length) ? theirs : [],
      },
    });
  }

  // GET /cycles/symptoms and /cycles/partner/symptoms ?from&to
  if ((path === "/symptoms" || path === "/partner/symptoms") && req.method === "GET") {
    let ownerId = userId;
    if (path === "/partner/symptoms") {
      const relationship = await getActiveRelationship();
      if (!relationship) return json([]);
      ownerId = getPartnerId(relationship);
      if (!(await partnerShares(ownerId))) return json([]);
    }
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    if ((from && !isDay(from)) || (to && !isDay(to))) return json({ error: "Dates must look like 2026-10-17" }, 400);
    let query = admin.from("daily_symptom_logs").select("*").eq("user_id", ownerId);
    if (from) query = query.gte("log_date", from);
    if (to) query = query.lte("log_date", to);
    const { data, error } = await query.order("log_date", { ascending: true });
    if (error) return json({ error: error.message }, 500);
    return json(data || []);
  }

  // POST /cycles/log { start_date, end_date? }
  if (path === "/log" && req.method === "POST") {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid request body" }, 400);
    const relationship = await getActiveRelationship();
    if (!relationship) return json({ error: "No active relationship" }, 404);
    const end = body.end_date || null;
    const problem = await checkPeriod(body.start_date, end);
    if (problem) return json({ error: problem }, 400);
    const { data, error } = await admin
      .from("cycle_logs")
      .insert({ user_id: userId, relationship_id: relationship.id, start_date: body.start_date, end_date: end })
      .select("id, start_date, end_date")
      .single();
    if (error) return json({ error: error.message }, 500);
    return json(data, 201);
  }

  // PATCH /cycles/log/:id { start_date?, end_date? } and DELETE /cycles/log/:id
  const logMatch = path.match(/^\/log\/([0-9a-f-]{36})$/i);
  if (logMatch && (req.method === "PATCH" || req.method === "DELETE")) {
    const { data: existing } = await admin
      .from("cycle_logs").select("id, start_date, end_date").eq("id", logMatch[1]).eq("user_id", userId).maybeSingle();
    if (!existing) return json({ error: "That period isn't there anymore." }, 404);
    if (req.method === "DELETE") {
      const { error } = await admin.from("cycle_logs").delete().eq("id", existing.id);
      if (error) return json({ error: error.message }, 500);
      return json({ id: existing.id });
    }
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid request body" }, 400);
    const start = "start_date" in body ? body.start_date : existing.start_date;
    const end = "end_date" in body ? body.end_date || null : existing.end_date;
    const problem = await checkPeriod(start, end, existing.id);
    if (problem) return json({ error: problem }, 400);
    const { data, error } = await admin
      .from("cycle_logs")
      .update({ start_date: start, end_date: end, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select("id, start_date, end_date")
      .single();
    if (error) return json({ error: error.message }, 500);
    return json(data);
  }

  // POST /cycles/symptoms: one log per day, only the known fields. An empty log deletes the day.
  if (path === "/symptoms" && req.method === "POST") {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid request body" }, 400);
    if (!isDay(body.log_date)) return json({ error: "Pick a day to log." }, 400);
    if (body.log_date > latestToday()) return json({ error: "That day hasn't happened yet." }, 400);
    const one = (v: unknown, allowed: string[]) => (v == null || v === "" ? null : allowed.includes(v as string) ? (v as string) : undefined);
    const list = (v: unknown, allowed: string[]) => (Array.isArray(v) ? [...new Set(v.filter((x) => allowed.includes(x)))] : []);
    const life = body.lifestyle && typeof body.lifestyle === "object" ? body.lifestyle : {};
    const sleep = life.sleep_hours == null || life.sleep_hours === "" ? null : Number(life.sleep_hours);
    const row = {
      bleeding_intensity: one(body.bleeding_intensity, BLEEDING),
      physical_symptoms: list(body.physical_symptoms, SYMPTOMS),
      moods: list(body.moods, MOODS),
      discharge: one(body.discharge, DISCHARGE),
      sex_drive: one(body.sex_drive, LEVELS),
      sexual_activity: list(body.sexual_activity, SEX),
      lifestyle: { sleep_hours: sleep, stress: one(life.stress, LEVELS), alcohol: life.alcohol === true },
    };
    if (Object.values(row).includes(undefined) || row.lifestyle.stress === undefined) return json({ error: "Some of those choices aren't valid." }, 400);
    if (sleep !== null && !(sleep >= 0 && sleep <= 24)) return json({ error: "Sleep must be between 0 and 24 hours." }, 400);

    const empty = !row.bleeding_intensity && !row.discharge && !row.sex_drive && sleep === null && !row.lifestyle.stress &&
      !row.lifestyle.alcohol && !row.physical_symptoms.length && !row.moods.length && !row.sexual_activity.length;
    if (empty) {
      const { error } = await admin.from("daily_symptom_logs").delete().eq("user_id", userId).eq("log_date", body.log_date);
      if (error) return json({ error: error.message }, 500);
      return json(null);
    }
    const relationship = await getActiveRelationship();
    if (!relationship) return json({ error: "No active relationship" }, 404);
    const { data, error } = await admin
      .from("daily_symptom_logs")
      .upsert(
        { ...row, user_id: userId, relationship_id: relationship.id, log_date: body.log_date, updated_at: new Date().toISOString() },
        { onConflict: "user_id,log_date" },
      )
      .select()
      .single();
    if (error) return json({ error: error.message }, 500);
    return json(data, 201);
  }

  // GET /cycles/tips
  if (path === "/tips" && req.method === "GET") {
    const { data } = await admin
      .from("cycle_tips")
      .select("tip_text")
      .eq("phase", url.searchParams.get("phase"))
      .eq("target_audience", url.searchParams.get("audience"))
      .limit(5);
    return json(data || []);
  }

  // ---- Legacy: the frontend on main still calls these. Delete once new-feats is merged and deployed. ----

  // Helper: compute prediction from cycle logs
  function computePrediction(cycles: any[]) {
    const starts = cycles.map(c => c.start_date).sort();
    let avgCycleLength = 28;
    if (starts.length >= 2) {
      const intervals = [];
      for (let i = 1; i < starts.length; i++) {
        const diff = Math.round((new Date(starts[i]).getTime() - new Date(starts[i-1]).getTime()) / 86400000);
        if (diff >= 21 && diff <= 50) intervals.push(diff);
      }
      if (intervals.length > 0) avgCycleLength = Math.round(intervals.reduce((a,b) => a+b, 0) / intervals.length);
    }
    const lastPeriodStart = cycles.length ? cycles[cycles.length - 1].start_date : null;
    let nextPeriodStart = null;
    if (lastPeriodStart) {
      const next = new Date(lastPeriodStart);
      next.setDate(next.getDate() + avgCycleLength);
      nextPeriodStart = next.toISOString().split("T")[0];
    }
    let cycleDay = 1;
    if (lastPeriodStart) {
      cycleDay = Math.floor((Date.now() - new Date(lastPeriodStart).getTime()) / 86400000) + 1;
    }
    const bleedLengths = cycles
      .filter(c => c.end_date)
      .map(c => Math.ceil((new Date(c.end_date).getTime() - new Date(c.start_date).getTime()) / 86400000) + 1)
      .filter(d => d >= 1 && d <= 10);
    const bleeds = bleedLengths.length ? Math.round(bleedLengths.reduce((a, b) => a + b, 0) / bleedLengths.length) : 5;

    const remainingDays = avgCycleLength - bleeds;
    const follicularDays = Math.ceil(remainingDays / 3);
    const fertileDays = Math.max(1, Math.floor(remainingDays / 3));
    const follicularEnd = bleeds + follicularDays;
    const fertileEnd = follicularEnd + fertileDays;

    let phase = "follicular";
    if (cycleDay > avgCycleLength) phase = "menstrual";
    else if (cycleDay <= bleeds) phase = "menstrual";
    else if (cycleDay <= follicularEnd) phase = "follicular";
    else if (cycleDay <= fertileEnd) phase = "fertile";
    else phase = "luteal";

    const dayOfCycle = (n: number) => {
      if (!lastPeriodStart) return null;
      const d = new Date(lastPeriodStart);
      d.setDate(d.getDate() + n - 1);
      return d.toISOString().split("T")[0];
    };
    const nextPeriodEnd = dayOfCycle(avgCycleLength + bleeds);
    let daysUntilPeriod: number | null = null;
    if (nextPeriodStart) {
      daysUntilPeriod = Math.max(0, Math.ceil((new Date(nextPeriodStart).getTime() - Date.now()) / 86400000));
    }

    return {
      nextPeriodStart,
      nextPeriodEnd,
      ovulationDay: dayOfCycle(avgCycleLength - 13),
      fertileWindowStart: dayOfCycle(follicularEnd + 1),
      fertileWindowEnd: dayOfCycle(fertileEnd),
      cycleDay,
      daysUntilPeriod,
      averageCycleLength: avgCycleLength,
      averageBleedingDays: bleeds,
      phase,
    };
  }

  async function legacyStats(ownerId: string) {
    const { data: cycles } = await admin
      .from("cycle_logs").select("*").eq("user_id", ownerId)
      .lte("start_date", new Date().toISOString().split("T")[0])
      .order("start_date", { ascending: true });
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: symptoms } = await admin
      .from("daily_symptom_logs").select("*").eq("user_id", ownerId)
      .gte("log_date", thirtyDaysAgo.toISOString().split("T")[0]);
    return {
      prediction: computePrediction(cycles || []),
      calendar: symptoms || [],
      lastPeriodStart: cycles?.length ? cycles[cycles.length - 1].start_date : null,
    };
  }

  // GET /cycles/stats
  if (path === "/stats" && req.method === "GET") {
    const relationship = await getActiveRelationship();
    if (!relationship) return json({ error: "No active relationship found" }, 404);
    return json(await legacyStats(userId));
  }

  // GET /cycles/history
  if (path === "/history" && req.method === "GET") {
    const { data } = await admin.from("cycle_logs").select("*").eq("user_id", userId).order("start_date", { ascending: true });
    return json(data || []);
  }

  if (path === "/partner/stats" && req.method === "GET") {
    const relationship = await getActiveRelationship();
    if (!relationship) return json({ error: "No active relationship" }, 404);
    const partnerId = getPartnerId(relationship);
    const { data: partnerProfile } = await admin.from("profiles").select("display_name").eq("id", partnerId).maybeSingle();
    const stats = !(await partnerShares(partnerId))
      ? { prediction: computePrediction([]), calendar: [], lastPeriodStart: null }
      : await legacyStats(partnerId);
    return json({ ...stats, partnerName: partnerProfile?.display_name || "Partner" });
  }

  if (path === "/partner/history" && req.method === "GET") {
    const relationship = await getActiveRelationship();
    if (!relationship || !(await partnerShares(getPartnerId(relationship)))) return json([]);
    const { data } = await admin
      .from("cycle_logs").select("*").eq("user_id", getPartnerId(relationship)).order("start_date", { ascending: true });
    return json(data || []);
  }

  return json({ error: "Not found" }, 404);
}
