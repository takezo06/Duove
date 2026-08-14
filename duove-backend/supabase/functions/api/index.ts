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
    // Parse URL and path
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api/, ""); 

    // Create Supabase client with user's auth
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 🔥 HEALTH CHECK
    if (path === "/health" && req.method === "GET") {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 🔥 CYCLES/STATS
    if (path === "/api/cycles/stats" && req.method === "GET") {
      // Get active relationship
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

      // Fetch cycle logs
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

      // Calculate average cycle length
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

      // Get last period start
      const lastPeriodStart = cycles && cycles.length > 0 ? cycles[cycles.length - 1].start_date : null;

      // Predict next period
      let nextPeriodStart = null;
      if (lastPeriodStart) {
        const next = new Date(lastPeriodStart);
        next.setDate(next.getDate() + avgCycleLength);
        nextPeriodStart = next.toISOString().split("T")[0];
      }

      // Calculate current cycle day
      let cycleDay = 1;
      if (lastPeriodStart) {
        const start = new Date(lastPeriodStart);
        const now = new Date();
        cycleDay = Math.floor((now.getTime() - start.getTime()) / 86400000) + 1;
      }

      // Get symptoms for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: symptoms } = await supabaseClient
        .from("daily_symptom_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("log_date", thirtyDaysAgo.toISOString().split("T")[0]);

      // Build response
      const response = {
        prediction: {
          nextPeriodStart,
          cycleDay,
          averageCycleLength: avgCycleLength,
          phase: "menstrual", // You'll need your phase logic here
        },
        calendar: symptoms || [],
        lastPeriodStart,
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default 404
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
