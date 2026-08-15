import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let path = url.pathname.replace(/^\/api/, "").replace(/\/+$/, "");
    if (!path) path = "/health";

    const authHeader = req.headers.get("Authorization") || "";
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    if (path === "/health" && req.method === "GET") {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    async function getActiveRelationship() {
      const { data, error } = await supabaseAdmin
        .from("relationships")
        .select("*")
        .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
        .eq("status", "active")
        .maybeSingle();
      return { relationship: data, error };
    }

    function getPartnerId(rel: any): string {
      return rel.user_id === userId ? rel.partner_id : rel.user_id;
    }

    // ==================== LOVE LETTERS ====================
    if (path === "/love-letters" && req.method === "GET") {
      const { relationship } = await getActiveRelationship();
      if (!relationship) {
        return new Response(JSON.stringify([]), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const limit = parseInt(url.searchParams.get("limit") || "20");
      const letterId = url.searchParams.get("id");
      
      let query = supabaseAdmin
        .from("love_letters")
        .select("*")
        .eq("relationship_id", relationship.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      
      if (letterId) {
        query = supabaseAdmin.from("love_letters").select("*").eq("id", letterId).eq("relationship_id", relationship.id);
      }
      
      const { data } = await query;
      return new Response(JSON.stringify(data || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/love-letters" && req.method === "POST") {
      const body = await req.json();
      const { relationship } = await getActiveRelationship();
      const { data, error } = await supabaseAdmin
        .from("love_letters")
        .insert({ ...body, relationship_id: relationship?.id, sender_id: userId })
        .select()
        .single();
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(data), {
        status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== RELATIONSHIPS ====================
    if (path === "/relationships/stats" && req.method === "GET") {
      const { relationship, error } = await getActiveRelationship();
      if (error || !relationship) {
        return new Response(JSON.stringify({ error: "No active relationship found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const partnerId = getPartnerId(relationship);
      const { data: partnerProfile } = await supabaseAdmin
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", partnerId)
        .single();

      const { count: cravingsCount } = await supabaseAdmin
        .from("cravings").select("*", { count: "exact", head: true })
        .eq("relationship_id", relationship.id).is("archived_at", null);
      const { count: lettersSent } = await supabaseAdmin
        .from("love_letters").select("*", { count: "exact", head: true })
        .eq("relationship_id", relationship.id).eq("sender_id", userId);
      const { count: lettersReceived } = await supabaseAdmin
        .from("love_letters").select("*", { count: "exact", head: true })
        .eq("relationship_id", relationship.id).neq("sender_id", userId);

      return new Response(JSON.stringify({
        relationship,
        partner: { id: partnerId, display_name: partnerProfile?.display_name || "Partner", avatar_url: partnerProfile?.avatar_url },
        stats: { cravings: cravingsCount || 0, letters_sent: lettersSent || 0, letters_received: lettersReceived || 0 },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ==================== CYCLES ====================
    if (path === "/cycles/stats" && req.method === "GET") {
      const { relationship } = await getActiveRelationship();
      if (!relationship) {
        return new Response(JSON.stringify({ error: "No active relationship" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: cycles } = await supabaseAdmin
        .from("cycle_logs")
        .select("*")
        .eq("user_id", userId)
        .lte("start_date", new Date().toISOString().split("T")[0])
        .order("start_date", { ascending: true });

      const starts = cycles?.map((c: any) => c.start_date).sort() || [];
      let avgCycleLength = 28;
      if (starts.length >= 2) {
        const intervals: number[] = [];
        for (let i = 1; i < starts.length; i++) {
          const diff = Math.round((new Date(starts[i]).getTime() - new Date(starts[i-1]).getTime()) / 86400000);
          if (diff >= 21 && diff <= 50) intervals.push(diff);
        }
        if (intervals.length > 0) avgCycleLength = Math.round(intervals.reduce((a,b) => a+b, 0) / intervals.length);
      }

      const lastPeriodStart = cycles?.length ? cycles[cycles.length - 1].start_date : null;
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

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: symptoms } = await supabaseAdmin
        .from("daily_symptom_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("log_date", thirtyDaysAgo.toISOString().split("T")[0]);

      return new Response(JSON.stringify({
        prediction: {
          nextPeriodStart,
          cycleDay,
          averageCycleLength: avgCycleLength,
          phase: "menstrual",
          averageBleedingDays: 5,
        },
        calendar: symptoms || [],
        lastPeriodStart,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ==================== NOTIFICATIONS ====================
    if (path === "/notifications" && req.method === "GET") {
      const { relationship } = await getActiveRelationship();
      if (!relationship) {
        return new Response(JSON.stringify([]), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const partnerId = getPartnerId(relationship);
      const { data: partnerProfile } = await supabaseAdmin
        .from("profiles").select("display_name").eq("id", partnerId).single();
      const partnerDisplay = partnerProfile?.display_name || "Your partner";

      const { data: cravings } = await supabaseAdmin
        .from("cravings").select("*").eq("relationship_id", relationship.id)
        .neq("user_id", userId).order("created_at", { ascending: false }).limit(10);
      const { data: letters } = await supabaseAdmin
        .from("love_letters").select("*").eq("relationship_id", relationship.id)
        .neq("sender_id", userId).order("created_at", { ascending: false }).limit(10);

      const notifications: any[] = [];
      cravings?.forEach((c: any) => {
        notifications.push({
          id: `craving_${c.id}`,
          type: c.fulfilled ? "craving_fulfilled" : "craving_added",
          message: c.fulfilled ? `${partnerDisplay} fulfilled a craving: "${c.content}"` : `${partnerDisplay} added a craving: "${c.content}"`,
          created_at: c.created_at, link: "/cravings", reference_id: c.id,
        });
      });
      letters?.forEach((l: any) => {
        notifications.push({
          id: `letter_${l.id}`,
          type: "letter_received",
          message: `${partnerDisplay} sent you a letter 💌`,
          created_at: l.created_at, link: "/letters", reference_id: l.id,
        });
      });

      notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return new Response(JSON.stringify(notifications.slice(0, 50)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== PROFILE ====================
    if (path === "/profile" && req.method === "GET") {
      const { data } = await supabaseAdmin.from("profiles").select("*").eq("id", userId).single();
      return new Response(JSON.stringify(data || {}), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== CRAVINGS ====================
    if (path === "/cravings" && req.method === "GET") {
      const relationshipId = url.searchParams.get("relationshipId");
      const { data } = await supabaseAdmin
        .from("cravings")
        .select("*")
        .eq("relationship_id", relationshipId)
        .order("created_at", { ascending: false });
      return new Response(JSON.stringify(data || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default 404
    return new Response(JSON.stringify({ error: "Not found", path }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
