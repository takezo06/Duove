import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Clean the path: remove any duplicate /api and ensure it starts with /api
    let path = url.pathname;
    // Remove leading /api if present
    path = path.replace(/^\/api/, "");
    // Remove trailing slash
    path = path.replace(/\/$/, "");
    // If empty, set to /health as default
    if (!path || path === "") path = "/health";

    const authHeader = req.headers.get("Authorization") || "";
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    );

    // HEALTH CHECK (no auth required)
    if (path === "/health" && req.method === "GET") {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get authenticated user for all other routes
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CYCLES/STATS
    if (path === "/cycles/stats" && req.method === "GET") {
      const { data: relationship, error: relError } = await supabaseClient
        .from("relationships")
        .select("id")
        .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`)
        .eq("status", "active")
        .maybeSingle();

      if (relError || !relationship) {
        return new Response(JSON.stringify({ error: "No active relationship found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: cycles, error: cyclesError } = await supabaseClient
        .from("cycle_logs")
        .select("*")
        .eq("user_id", user.id)
        .lte("start_date", new Date().toISOString().split("T")[0])
        .order("start_date", { ascending: true });

      if (cyclesError) {
        return new Response(JSON.stringify({ error: cyclesError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const starts = cycles?.map((c: any) => c.start_date).sort() || [];
      let avgCycleLength = 28;
      if (starts.length >= 2) {
        const intervals: number[] = [];
        for (let i = 1; i < starts.length; i++) {
          const prev = new Date(starts[i - 1]);
          const curr = new Date(starts[i]);
          const diff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
          if (diff >= 21 && diff <= 50) intervals.push(diff);
        }
        if (intervals.length > 0) {
          avgCycleLength = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
        }
      }

      const lastPeriodStart = cycles && cycles.length > 0 ? cycles[cycles.length - 1].start_date : null;
      let nextPeriodStart = null;
      if (lastPeriodStart) {
        const next = new Date(lastPeriodStart);
        next.setDate(next.getDate() + avgCycleLength);
        nextPeriodStart = next.toISOString().split("T")[0];
      }

      let cycleDay = 1;
      if (lastPeriodStart) {
        const start = new Date(lastPeriodStart);
        const now = new Date();
        cycleDay = Math.floor((now.getTime() - start.getTime()) / 86400000) + 1;
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: symptoms } = await supabaseClient
        .from("daily_symptom_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("log_date", thirtyDaysAgo.toISOString().split("T")[0]);

      return new Response(JSON.stringify({
        prediction: {
          nextPeriodStart,
          cycleDay,
          averageCycleLength: avgCycleLength,
          phase: "menstrual",
        },
        calendar: symptoms || [],
        lastPeriodStart,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // RELATIONSHIPS/STATS
    if (path === "/relationships/stats" && req.method === "GET") {
      const { data: relationship, error: relError } = await supabaseClient
        .from("relationships")
        .select("*")
        .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`)
        .eq("status", "active")
        .maybeSingle();

      if (relError || !relationship) {
        return new Response(JSON.stringify({ error: "No active relationship found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const partnerId = relationship.user_id === user.id ? relationship.partner_id : relationship.user_id;
      const { data: partnerProfile } = await supabaseClient
        .from("profiles")
        .select("display_name")
        .eq("id", partnerId)
        .maybeSingle();

      return new Response(JSON.stringify({
        relationship,
        partner: {
          id: partnerId,
          display_name: partnerProfile?.display_name || "Partner",
        },
        stats: {
          cravings: 0,
          letters_sent: 0,
          letters_received: 0,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // NOTIFICATIONS
    if (path === "/notifications" && req.method === "GET") {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default 404
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
