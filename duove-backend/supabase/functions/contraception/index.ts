import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { createSupabaseClients } from "../_shared/supabase.ts";
import { getUserId } from "../_shared/auth.ts";

// The contraception tracker. Schedules and insights are computed on the client (frontend/src/lib/contraception.ts);
// this function stores the method and what's logged for it, and decides who may see or change them:
// - only someone with periods (the cycle page's rule) sets a method or logs for it;
// - the partner sees a method only while its owner shares it, and never the uses or emergency contraception logged.
// The id lists match frontend/src/lib/contraception.ts (frontend/scripts/contraception.check.ts compares them).

const METHOD_IDS = [
  "pill_combined", "pill_progestin", "patch", "ring_monthly", "ring_yearly", "shot", "implant", "iud_hormonal", "iud_copper",
  "condom_external", "condom_internal", "diaphragm", "cervical_cap", "sponge", "spermicide",
  "fertility_awareness", "withdrawal", "lam", "tubal", "vasectomy",
];
const EVENT_KINDS = ["taken", "missed", "changed", "removed", "ring_in", "ring_out", "shot", "used", "emergency"];
const PILL_KINDS = ["combined_mono", "combined_multi", "pop_norethindrone", "pop_desogestrel", "pop_drospirenone"];
const PACK_IDS = ["21_7", "24_4", "26_2", "84_7", "28"];
const BRAND_IDS = ["nexplanon", "mirena", "liletta", "kyleena", "skyla", "paragard", "other"];
const SHOT_KINDS = ["im", "subq"];
const EC_KINDS = ["levonorgestrel", "ulipristal", "copper_iud"];

// What can be logged for each method (emergency contraception goes with any, or none)
const KINDS_FOR: Record<string, string[]> = {
  pill_combined: ["taken", "missed"],
  pill_progestin: ["taken", "missed"],
  patch: ["changed", "removed"],
  ring_monthly: ["ring_in", "ring_out"],
  ring_yearly: ["ring_in", "ring_out"],
  shot: ["shot"],
  condom_external: ["used"], condom_internal: ["used"], diaphragm: ["used"], cervical_cap: ["used"], sponge: ["used"], spermicide: ["used"], withdrawal: ["used"],
};
const PILL_DAY = ["taken", "missed"];
const PARTNER_KINDS = ["taken", "missed", "changed", "removed", "ring_in", "ring_out", "shot"];
const MIN_PERIODS_TO_SHOW = 2; // the cycle page's rule (sharesCycle in the cycles function)

const isDay = (v: unknown): v is string =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v);
const isClock = (v: unknown): v is string => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
// The latest "today" anywhere on Earth (UTC+14), and the earliest (UTC-12)
const latestToday = () => addDays(new Date().toISOString().slice(0, 10), 1);
const earliestToday = () => addDays(new Date().toISOString().slice(0, 10), -1);
const METHOD_COLUMNS = "id, method, details, started_on, ended_on, shared";
const EVENT_COLUMNS = "id, method_id, kind, on_date, at_time, detail";

serve((req) =>
  handle(req).catch((err) => {
    console.error("contraception crashed", err);
    return new Response(JSON.stringify({ error: "Something went wrong. Try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  })
);

// Only known keys of the right type; anything else turns the request away
function cleanDetails(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const d = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(d)) {
    if (v == null || v === "") continue;
    if (key === "pill" && PILL_KINDS.includes(v as string)) out.pill = v;
    else if (key === "pack" && PACK_IDS.includes(v as string)) out.pack = v;
    else if (key === "usual_time" && isClock(v)) out.usual_time = v;
    else if (key === "brand" && BRAND_IDS.includes(v as string)) out.brand = v;
    else if (key === "years" && Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 12) out.years = v;
    else if (key === "shot" && SHOT_KINDS.includes(v as string)) out.shot = v;
    else if (key === "confirmed" && typeof v === "boolean") out.confirmed = v;
    else return null;
  }
  return out;
}

async function handle(req: Request) {
  if (req.method === "OPTIONS") return handleOptions();

  const { admin } = createSupabaseClients(req);
  const userId = await getUserId(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  // Database errors name tables and columns: log them here, never send them to the browser
  const failed = (error: unknown) => {
    console.error("contraception failed", req.method, new URL(req.url).pathname, error);
    return json({ error: "Something went wrong. Try again." }, 500);
  };
  if (!userId) return json({ error: "Unauthorized" }, 401);

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/contraception/, "").replace(/\/+$/, "");

  async function getActiveRelationship() {
    const { data } = await admin
      .from("relationships")
      .select("*")
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
      .eq("status", "active")
      .maybeSingle();
    return data;
  }
  // Whether someone tracks a cycle: a yes to "Do you have periods?", or no answer and 2+ logged periods
  async function tracks(id: string) {
    const [{ data: profile, error }, { count, error: countError }] = await Promise.all([
      admin.from("profiles").select("*").eq("id", id).maybeSingle(),
      admin.from("cycle_logs").select("id", { count: "exact", head: true }).eq("user_id", id),
    ]);
    if (error || countError) throw error ?? countError;
    const hasPeriods = typeof profile?.has_periods === "boolean" ? profile.has_periods : null;
    return hasPeriods === true || (hasPeriods === null && (count ?? 0) >= MIN_PERIODS_TO_SHOW);
  }
  const current = async (id: string) => {
    const { data, error } = await admin.from("contraception_methods").select(METHOD_COLUMNS).eq("user_id", id).is("ended_on", null).maybeSingle();
    if (error) throw error;
    return data;
  };
  const notYours = () => json({ error: "Only the partner with periods sets contraception here." }, 403);

  // GET /contraception/overview?from: your current method, its logs since `from` (default 180 days), your past
  // methods, and your partner's current method and its logs when they share it. 404 when not paired.
  if (path === "/overview" && req.method === "GET") {
    const relationship = await getActiveRelationship();
    if (!relationship) return json({ error: "No active relationship" }, 404);
    const partnerId = relationship.user_id === userId ? relationship.partner_id : relationship.user_id;
    const fromParam = url.searchParams.get("from");
    if (fromParam && !isDay(fromParam)) return json({ error: "Dates must look like 2026-10-17" }, 400);
    const from = fromParam ?? addDays(earliestToday(), -180);

    const [{ data: methods, error }, { data: events, error: eventsError }, theirs] = await Promise.all([
      admin.from("contraception_methods").select(METHOD_COLUMNS).eq("user_id", userId).order("started_on", { ascending: false }).limit(20),
      admin.from("contraception_events").select(EVENT_COLUMNS).eq("user_id", userId).gte("on_date", from).order("on_date", { ascending: true }).limit(800),
      current(partnerId),
    ]);
    if (error || eventsError) return failed(error ?? eventsError);

    // The partner's method only while it's shared and they still track a cycle; only its own steps, never uses or emergency contraception
    let partner: Record<string, unknown> = { shared: false };
    if (theirs?.shared && (await tracks(partnerId))) {
      const { data: partnerEvents, error: partnerError } = await admin
        .from("contraception_events").select(EVENT_COLUMNS)
        .eq("user_id", partnerId).eq("method_id", theirs.id).in("kind", PARTNER_KINDS).gte("on_date", from)
        .order("on_date", { ascending: true }).limit(400);
      if (partnerError) return failed(partnerError);
      partner = { shared: true, method: theirs, events: partnerEvents ?? [] };
    }
    const mine = methods ?? [];
    return json({
      me: { method: mine.find((m) => !m.ended_on) ?? null, past: mine.filter((m) => m.ended_on), events: events ?? [] },
      partner,
    });
  }

  // POST /contraception/method { method, details, started_on }: start a method, ending the current one
  if (path === "/method" && req.method === "POST") {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid request body" }, 400);
    const relationship = await getActiveRelationship();
    if (!relationship) return json({ error: "No active relationship" }, 404);
    if (!(await tracks(userId))) return notYours();
    if (!METHOD_IDS.includes(body.method)) return json({ error: "Pick a method from the list." }, 400);
    const details = cleanDetails(body.details);
    if (!details) return json({ error: "Some of those choices aren't valid." }, 400);
    if (!isDay(body.started_on)) return json({ error: "Pick the start date." }, 400);
    // A pill pack or a shot can be planned a few weeks ahead, nothing further
    if (body.started_on > addDays(latestToday(), 60)) return json({ error: "Pick a start date in the next two months." }, 400);

    const now = await current(userId);
    if (now) {
      const ended_on = [now.started_on, [body.started_on, latestToday()].sort()[0]].sort()[1];
      const { error } = await admin.from("contraception_methods").update({ ended_on, updated_at: new Date().toISOString() }).eq("id", now.id);
      if (error) return failed(error);
    }
    const { data, error } = await admin
      .from("contraception_methods")
      .insert({ user_id: userId, relationship_id: relationship.id, method: body.method, details, started_on: body.started_on, shared: now?.shared ?? false })
      .select(METHOD_COLUMNS)
      .single();
    if (error) return failed(error);
    return json({ method: data, ended: now?.id ?? null }, 201);
  }

  // PATCH /contraception/method/:id { details?, started_on?, shared?, ended_on? }
  // Sharing off and stopping always work for the owner; anything else needs them to still track a cycle.
  const methodMatch = path.match(/^\/method\/([0-9a-f-]{36})$/i);
  if (methodMatch && req.method === "PATCH") {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid request body" }, 400);
    const { data: existing } = await admin.from("contraception_methods").select(METHOD_COLUMNS).eq("id", methodMatch[1]).eq("user_id", userId).maybeSingle();
    if (!existing) return json({ error: "That method isn't there anymore." }, 404);
    const patch: Record<string, unknown> = {};
    if ("details" in body || "started_on" in body || body.shared === true) {
      if (!(await tracks(userId))) return notYours();
    }
    if ("details" in body) {
      const details = cleanDetails(body.details);
      if (!details) return json({ error: "Some of those choices aren't valid." }, 400);
      patch.details = details;
    }
    if ("started_on" in body) {
      if (!isDay(body.started_on) || body.started_on > addDays(latestToday(), 60)) return json({ error: "Pick a start date in the next two months." }, 400);
      patch.started_on = body.started_on;
    }
    if ("shared" in body) {
      if (typeof body.shared !== "boolean") return json({ error: "Invalid request body" }, 400);
      patch.shared = body.shared;
    }
    if ("ended_on" in body) {
      if (existing.ended_on) return json({ error: "That method has already ended." }, 400);
      if (!isDay(body.ended_on) || body.ended_on > latestToday()) return json({ error: "Pick the day you stopped." }, 400);
      patch.ended_on = [body.ended_on, (patch.started_on as string) ?? existing.started_on].sort()[1];
    }
    if (!Object.keys(patch).length) return json(existing);
    const { data, error } = await admin
      .from("contraception_methods").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", existing.id).select(METHOD_COLUMNS).single();
    if (error) return failed(error);
    return json(data);
  }

  // POST /contraception/events { kind, on_date, at_time?, detail? }: log for the current method
  if (path === "/events" && req.method === "POST") {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid request body" }, 400);
    if (!EVENT_KINDS.includes(body.kind)) return json({ error: "That can't be logged here." }, 400);
    if (!isDay(body.on_date)) return json({ error: "Pick a day." }, 400);
    if (body.on_date > latestToday()) return json({ error: "That day hasn't happened yet." }, 400);
    if (body.on_date < addDays(earliestToday(), -366)) return json({ error: "That's more than a year ago." }, 400);
    if (body.at_time != null && !isClock(body.at_time)) return json({ error: "Invalid request body" }, 400);
    const relationship = await getActiveRelationship();
    if (!relationship) return json({ error: "No active relationship" }, 404);
    if (!(await tracks(userId))) return notYours();
    const method = await current(userId);

    let detail: Record<string, unknown> | null = null;
    if (body.kind === "emergency") {
      if (!EC_KINDS.includes(body.detail?.ec)) return json({ error: "Pick which emergency contraception." }, 400);
      detail = { ec: body.detail.ec };
    } else {
      if (!method) return json({ error: "Pick your method first." }, 400);
      if (!(KINDS_FOR[method.method] ?? []).includes(body.kind)) return json({ error: "That can't be logged for this method." }, 400);
      if (body.on_date < method.started_on) return json({ error: "That's before this method started." }, 400);
    }
    const method_id = body.kind === "emergency" ? method?.id ?? null : method!.id;

    // A day's pill is taken or missed, never both: the new answer replaces the old
    if (PILL_DAY.includes(body.kind)) {
      const { error } = await admin.from("contraception_events").delete().eq("method_id", method_id).eq("on_date", body.on_date).in("kind", PILL_DAY);
      if (error) return failed(error);
    } else if (body.kind !== "used" && body.kind !== "emergency") {
      // Logging the same change twice on one day returns the first
      const { data: same } = await admin.from("contraception_events").select(EVENT_COLUMNS).eq("method_id", method_id).eq("kind", body.kind).eq("on_date", body.on_date).maybeSingle();
      if (same) return json(same);
    }
    const { data, error } = await admin
      .from("contraception_events")
      .insert({ user_id: userId, relationship_id: relationship.id, method_id, kind: body.kind, on_date: body.on_date, at_time: body.at_time ?? null, detail })
      .select(EVENT_COLUMNS)
      .single();
    if (error) return failed(error);
    return json(data, 201);
  }

  // DELETE /contraception/events/:id: your own logs only
  const eventMatch = path.match(/^\/events\/([0-9a-f-]{36})$/i);
  if (eventMatch && req.method === "DELETE") {
    const { data: existing } = await admin.from("contraception_events").select("id").eq("id", eventMatch[1]).eq("user_id", userId).maybeSingle();
    if (!existing) return json({ error: "That log isn't there anymore." }, 404);
    const { error } = await admin.from("contraception_events").delete().eq("id", existing.id);
    if (error) return failed(error);
    return json({ id: existing.id });
  }

  return json({ error: "Not found" }, 404);
}
