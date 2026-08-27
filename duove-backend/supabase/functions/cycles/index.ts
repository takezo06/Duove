import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { createSupabaseClients } from "../_shared/supabase.ts";
import { getUserId } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();

  const { client, admin } = createSupabaseClients(req);
  const userId = await getUserId(req);
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  // Remove /cycles prefix
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
    // Phase calculation (simplified but consistent with frontend)
    const bleeds = 5;
    let phase = "follicular";
    if (cycleDay > avgCycleLength) phase = "menstrual";
    else if (cycleDay <= bleeds) phase = "menstrual";
    else {
      const remainingDays = avgCycleLength - bleeds;
      const follicularDays = Math.ceil(remainingDays / 3);
      const fertileDays = Math.max(1, Math.floor(remainingDays / 3));
      const follicularEnd = bleeds + follicularDays;
      const fertileEnd = follicularEnd + fertileDays;
      if (cycleDay <= follicularEnd) phase = "follicular";
      else if (cycleDay <= fertileEnd) phase = "fertile";
      else phase = "luteal";
    }
    return {
      nextPeriodStart,
      cycleDay,
      averageCycleLength: avgCycleLength,
      averageBleedingDays: bleeds,
      phase,
    };
  }

  // GET /cycles/stats
  if (path === "/stats" && req.method === "GET") {
    const relationship = await getActiveRelationship();
    if (!relationship) {
      return new Response(JSON.stringify({ error: "No active relationship found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: cycles } = await admin
      .from("cycle_logs")
      .select("*")
      .eq("user_id", userId)
      .lte("start_date", new Date().toISOString().split("T")[0])
      .order("start_date", { ascending: true });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: symptoms } = await admin
      .from("daily_symptom_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("log_date", thirtyDaysAgo.toISOString().split("T")[0]);

    const prediction = computePrediction(cycles || []);
    return new Response(JSON.stringify({
      prediction,
      calendar: symptoms || [],
      lastPeriodStart: cycles?.length ? cycles[cycles.length - 1].start_date : null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // GET /cycles/history
  if (path === "/history" && req.method === "GET") {
    const { data } = await admin
      .from("cycle_logs")
      .select("*")
      .eq("user_id", userId)
      .order("start_date", { ascending: true });
    return new Response(JSON.stringify(data || []), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // GET /cycles/symptoms
  if (path === "/symptoms" && req.method === "GET") {
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    let query = admin.from("daily_symptom_logs").select("*").eq("user_id", userId);
    if (from) query = query.gte("log_date", from);
    if (to) query = query.lte("log_date", to);
    const { data } = await query;
    return new Response(JSON.stringify(data || []), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // POST /cycles/log
  if (path === "/log" && req.method === "POST") {
    const body = await req.json();
    const { start_date, end_date } = body;
    const relationship = await getActiveRelationship();
    const { data, error } = await admin
      .from("cycle_logs")
      .insert({ user_id: userId, relationship_id: relationship?.id, start_date, end_date })
      .select().single();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(data), {
      status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // POST /cycles/symptoms
  if (path === "/symptoms" && req.method === "POST") {
    const body = await req.json();
    const { log_date, ...symptomData } = body;
    const relationship = await getActiveRelationship();
    const { data, error } = await admin
      .from("daily_symptom_logs")
      .upsert({
        user_id: userId,
        relationship_id: relationship?.id,
        log_date,
        ...symptomData,
      }, { onConflict: "user_id,log_date" })
      .select().single();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(data), {
      status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Partner endpoints
  if (path === "/partner/stats" && req.method === "GET") {
    const relationship = await getActiveRelationship();
    if (!relationship) {
      return new Response(JSON.stringify({ error: "No active relationship" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const partnerId = getPartnerId(relationship);
    const { data: cycles } = await admin
      .from("cycle_logs").select("*").eq("user_id", partnerId)
      .lte("start_date", new Date().toISOString().split("T")[0])
      .order("start_date", { ascending: true });
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: symptoms } = await admin
      .from("daily_symptom_logs").select("*").eq("user_id", partnerId)
      .gte("log_date", thirtyDaysAgo.toISOString().split("T")[0]);
    const prediction = computePrediction(cycles || []);
    return new Response(JSON.stringify({
      prediction,
      calendar: symptoms || [],
      lastPeriodStart: cycles?.length ? cycles[cycles.length - 1].start_date : null,
      partnerName: relationship.partner_name || "Partner",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (path === "/partner/history" && req.method === "GET") {
    const relationship = await getActiveRelationship();
    if (!relationship) {
      return new Response(JSON.stringify([]), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const partnerId = getPartnerId(relationship);
    const { data } = await admin
      .from("cycle_logs").select("*").eq("user_id", partnerId)
      .order("start_date", { ascending: true });
    return new Response(JSON.stringify(data || []), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (path === "/partner/symptoms" && req.method === "GET") {
    const relationship = await getActiveRelationship();
    if (!relationship) {
      return new Response(JSON.stringify([]), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const partnerId = getPartnerId(relationship);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    let query = admin.from("daily_symptom_logs").select("*").eq("user_id", partnerId);
    if (from) query = query.gte("log_date", from);
    if (to) query = query.lte("log_date", to);
    const { data } = await query;
    return new Response(JSON.stringify(data || []), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // GET /cycles/tips
  if (path === "/tips" && req.method === "GET") {
    const phase = url.searchParams.get("phase");
    const audience = url.searchParams.get("audience");
    const { data } = await admin
      .from("cycle_tips")
      .select("tip_text")
      .eq("phase", phase)
      .eq("target_audience", audience)
      .limit(5);
    return new Response(JSON.stringify(data || []), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
