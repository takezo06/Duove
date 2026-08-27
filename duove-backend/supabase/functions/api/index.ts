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
    // Remove leading "/api" and trailing slashes
    let path = url.pathname.replace(/^\/api/, "").replace(/\/+$/, "");
    if (!path) path = "/health";

    const authHeader = req.headers.get("Authorization") || "";
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    );
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Health check – no auth needed
    if (path === "/health" && req.method === "GET") {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth required for all other routes
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    // Ensure profile exists (in case signup trigger missing)
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles").select("id").eq("id", userId).maybeSingle();
    if (!existingProfile) {
      await supabaseAdmin.from("profiles").insert({ id: userId });
    }

    // Helper: get active relationship
    async function getActiveRelationship() {
      const { data, error } = await supabaseAdmin
        .from("relationships")
        .select("*")
        .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
        .eq("status", "active")
        .maybeSingle();
      return { relationship: data, error };
    }

    function getPartnerId(rel: any) {
      return rel.user_id === userId ? rel.partner_id : rel.user_id;
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
        .from("profiles").select("display_name, avatar_url").eq("id", partnerId).single();

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
        partner: {
          id: partnerId,
          display_name: partnerProfile?.display_name || "Partner",
          avatar_url: partnerProfile?.avatar_url,
        },
        stats: {
          cravings: cravingsCount || 0,
          letters_sent: lettersSent || 0,
          letters_received: lettersReceived || 0,
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (path === "/relationships/me" && req.method === "GET") {
      const { relationship, error } = await getActiveRelationship();
      if (error || !relationship) {
        return new Response(JSON.stringify({ error: "No active relationship" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const partnerId = getPartnerId(relationship);
      const { data: partnerProfile } = await supabaseAdmin
        .from("profiles").select("display_name").eq("id", partnerId).single();
      return new Response(JSON.stringify({
        relationship,
        partner: { id: partnerId, display_name: partnerProfile?.display_name || "Partner" },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (path === "/relationships/pending" && req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("relationships")
        .select("invite_code")
        .eq("user_id", userId)
        .eq("status", "pending")
        .maybeSingle();
      if (error || !data) {
        return new Response(JSON.stringify({ error: "No pending invite" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/relationships/invite" && req.method === "POST") {
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const { data, error } = await supabaseAdmin
        .from("relationships")
        .insert({ user_id: userId, invite_code: inviteCode, status: "pending" })
        .select().single();
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ invite_code: inviteCode }), {
        status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/relationships/join" && req.method === "POST") {
      const { invite_code } = await req.json();
      const { data: pending } = await supabaseAdmin
        .from("relationships")
        .select("*")
        .eq("invite_code", invite_code?.trim().toUpperCase())
        .eq("status", "pending")
        .maybeSingle();
      if (!pending) {
        return new Response(JSON.stringify({ error: "Invite code not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data } = await supabaseAdmin
        .from("relationships")
        .update({ partner_id: userId, status: "active", paired_at: new Date().toISOString() })
        .eq("id", pending.id)
        .select().single();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/relationships/anniversary" && req.method === "PATCH") {
      const { anniversary_date } = await req.json();
      const { relationship } = await getActiveRelationship();
      const { data, error } = await supabaseAdmin
        .from("relationships")
        .update({ anniversary_date })
        .eq("id", relationship?.id)
        .select().single();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/relationships" && req.method === "DELETE") {
      const { relationship } = await getActiveRelationship();
      const { error } = await supabaseAdmin
        .from("relationships")
        .delete()
        .eq("id", relationship?.id);
      return new Response(JSON.stringify({ message: "Relationship deleted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
        .from("cycle_logs").select("*").eq("user_id", userId)
        .lte("start_date", new Date().toISOString().split("T")[0])
        .order("start_date", { ascending: true });

      const starts = cycles?.map((c) => c.start_date).sort() || [];
      let avgCycleLength = 28;
      if (starts.length >= 2) {
        const intervals = [];
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
        .from("daily_symptom_logs").select("*").eq("user_id", userId)
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

    if (path === "/cycles/history" && req.method === "GET") {
      const { data } = await supabaseAdmin
        .from("cycle_logs").select("*").eq("user_id", userId)
        .order("start_date", { ascending: true });
      return new Response(JSON.stringify(data || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/cycles/symptoms" && req.method === "GET") {
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      let query = supabaseAdmin.from("daily_symptom_logs").select("*").eq("user_id", userId);
      if (from) query = query.gte("log_date", from);
      if (to) query = query.lte("log_date", to);
      const { data } = await query;
      return new Response(JSON.stringify(data || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/cycles/log" && req.method === "POST") {
      const body = await req.json();
      const { start_date, end_date } = body;
      const { relationship } = await getActiveRelationship();
      const { data, error } = await supabaseAdmin
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

    if (path === "/cycles/symptoms" && req.method === "POST") {
      const body = await req.json();
      const { log_date, ...symptomData } = body;
      const { relationship } = await getActiveRelationship();
      const { data, error } = await supabaseAdmin
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
    if (path === "/cycles/partner/stats" && req.method === "GET") {
      const { relationship } = await getActiveRelationship();
      if (!relationship) {
        return new Response(JSON.stringify({ error: "No active relationship" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const partnerId = getPartnerId(relationship);
      const { data: cycles } = await supabaseAdmin
        .from("cycle_logs").select("*").eq("user_id", partnerId)
        .lte("start_date", new Date().toISOString().split("T")[0])
        .order("start_date", { ascending: true });
      const starts = cycles?.map((c) => c.start_date).sort() || [];
      let avgCycleLength = 28;
      if (starts.length >= 2) {
        const intervals = [];
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
        .from("daily_symptom_logs").select("*").eq("user_id", partnerId)
        .gte("log_date", thirtyDaysAgo.toISOString().split("T")[0]);
      return new Response(JSON.stringify({
        prediction: { nextPeriodStart, cycleDay, averageCycleLength: avgCycleLength, phase: "menstrual", averageBleedingDays: 5 },
        calendar: symptoms || [],
        lastPeriodStart,
        partnerName: relationship?.partner_name || "Partner",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (path === "/cycles/partner/history" && req.method === "GET") {
      const { relationship } = await getActiveRelationship();
      if (!relationship) {
        return new Response(JSON.stringify([]), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const partnerId = getPartnerId(relationship);
      const { data } = await supabaseAdmin
        .from("cycle_logs").select("*").eq("user_id", partnerId)
        .order("start_date", { ascending: true });
      return new Response(JSON.stringify(data || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/cycles/partner/symptoms" && req.method === "GET") {
      const { relationship } = await getActiveRelationship();
      if (!relationship) {
        return new Response(JSON.stringify([]), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const partnerId = getPartnerId(relationship);
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      let query = supabaseAdmin.from("daily_symptom_logs").select("*").eq("user_id", partnerId);
      if (from) query = query.gte("log_date", from);
      if (to) query = query.lte("log_date", to);
      const { data } = await query;
      return new Response(JSON.stringify(data || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/cycles/tips" && req.method === "GET") {
      const phase = url.searchParams.get("phase");
      const audience = url.searchParams.get("audience");
      const { data } = await supabaseAdmin
        .from("cycle_tips")
        .select("tip_text")
        .eq("phase", phase)
        .eq("target_audience", audience)
        .limit(5);
      return new Response(JSON.stringify(data || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== CRAVINGS ====================
    if (path === "/cravings" && req.method === "GET") {
      const relationshipId = url.searchParams.get("relationshipId");
      const { data } = await supabaseAdmin
        .from("cravings").select("*").eq("relationship_id", relationshipId)
        .order("created_at", { ascending: false });
      return new Response(JSON.stringify(data || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/cravings" && req.method === "POST") {
      const body = await req.json();
      const { relationshipId, partnerId, content, category } = body;
      const { data, error } = await supabaseAdmin
        .from("cravings")
        .insert({ relationship_id: relationshipId, user_id: userId, partner_id: partnerId, content, category })
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

    if (path.match(/^\/cravings\/[\w-]+\/toggle$/) && req.method === "PATCH") {
      const cravingId = path.split("/")[2];
      const { data: existing } = await supabaseAdmin.from("cravings").select("fulfilled").eq("id", cravingId).single();
      const { data } = await supabaseAdmin
        .from("cravings").update({ fulfilled: !existing?.fulfilled }).eq("id", cravingId).select().single();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path.match(/^\/cravings\/[\w-]+$/) && req.method === "DELETE") {
      const cravingId = path.split("/")[2];
      await supabaseAdmin.from("cravings").delete().eq("id", cravingId);
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ==================== LOVE LETTERS ====================
    if (path === "/love-letters" && req.method === "GET") {
      const { relationship } = await getActiveRelationship();
      if (!relationship) {
        return new Response(JSON.stringify([]), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const limit = parseInt(url.searchParams.get("limit") || "20");
      const letterId = url.searchParams.get("id");
      let query;
      if (letterId) {
        query = supabaseAdmin.from("love_letters").select("*").eq("id", letterId).eq("relationship_id", relationship.id);
      } else {
        query = supabaseAdmin.from("love_letters").select("*").eq("relationship_id", relationship.id)
          .order("created_at", { ascending: false }).limit(limit);
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
        .select().single();
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Notify partner
      const partnerId = getPartnerId(relationship);
      await supabaseAdmin.from("notifications").insert({
        user_id: partnerId,
        type: "love_letter",
        title: `${body.sender_name || "Partner"} sent you a love letter`,
        message: body.heading || "You have a new love letter!",
        data: { letter_id: data.id },
        read: false,
        created_at: new Date().toISOString(),
      });
      return new Response(JSON.stringify(data), {
        status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/love-letters/search-song" && req.method === "GET") {
      const q = url.searchParams.get("q");
      const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "client_credentials" }).toString(),
        headers: {
          "Authorization": "Basic " + btoa(
            `${Deno.env.get("SPOTIFY_CLIENT_ID")}:${Deno.env.get("SPOTIFY_CLIENT_SECRET")}`
          ),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
      const spotifyData = await tokenRes.json();
      const searchRes = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=10`,
        { headers: { Authorization: `Bearer ${spotifyData.access_token}` } }
      );
      const searchData = await searchRes.json();
      const tracks = searchData.tracks?.items.map((item) => ({
        id: item.id,
        name: item.name,
        artist: item.artists.map((a) => a.name).join(", "),
        albumArt: item.album.images[0]?.url || "",
      })) || [];
      return new Response(JSON.stringify(tracks), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== NOTIFICATIONS ====================
    if (path === "/notifications" && req.method === "GET") {
      const { relationship } = await getActiveRelationship();
      if (!relationship) {
        return new Response(JSON.stringify([]), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
      const notifications = [];
      cravings?.forEach((c) => {
        notifications.push({
          id: `craving_${c.id}`,
          type: c.fulfilled ? "craving_fulfilled" : "craving_added",
          message: c.fulfilled ? `${partnerDisplay} fulfilled a craving: "${c.content}"` : `${partnerDisplay} added a craving: "${c.content}"`,
          created_at: c.created_at, link: "/cravings", reference_id: c.id,
        });
      });
      letters?.forEach((l) => {
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

    if (path === "/notifications/unread-count" && req.method === "GET") {
      const { relationship } = await getActiveRelationship();
      if (!relationship) {
        return new Response(JSON.stringify({ count: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: profile } = await supabaseAdmin
        .from("profiles").select("last_read_at").eq("id", userId).single();
      const lastReadAt = profile?.last_read_at || new Date(0).toISOString();
      const { count: cravingsCount } = await supabaseAdmin
        .from("cravings").select("*", { count: "exact", head: true })
        .eq("relationship_id", relationship.id).neq("user_id", userId).gt("created_at", lastReadAt);
      const { count: lettersCount } = await supabaseAdmin
        .from("love_letters").select("*", { count: "exact", head: true })
        .eq("relationship_id", relationship.id).neq("sender_id", userId).gt("created_at", lastReadAt);
      return new Response(JSON.stringify({ count: (cravingsCount || 0) + (lettersCount || 0) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/notifications/read" && req.method === "POST") {
      await supabaseAdmin
        .from("profiles").update({ last_read_at: new Date().toISOString() }).eq("id", userId);
      return new Response(JSON.stringify({ message: "Marked as read" }), {
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

    if (path === "/profile" && req.method === "PATCH") {
      const body = await req.json();
      const { data } = await supabaseAdmin
        .from("profiles").update(body).eq("id", userId).select().single();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== QA ====================
    if (path === "/qa/current" && req.method === "GET") {
      const { relationship } = await getActiveRelationship();
      if (!relationship) {
        return new Response(JSON.stringify({ error: "No active relationship" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const today = new Date().toISOString().split("T")[0];
      const { data: assignment } = await supabaseAdmin
        .from("qa_assignments")
        .select("*, qa_questions(*)")
        .eq("relationship_id", relationship.id)
        .eq("assigned_date", today)
        .maybeSingle();
      if (assignment) {
        const { data: answers } = await supabaseAdmin
          .from("qa_answers").select("*")
          .eq("question_id", assignment.question_id)
          .eq("relationship_id", relationship.id);
        const yourAnswer = answers?.find(a => a.user_id === userId);
        const partnerAnswer = answers?.find(a => a.user_id !== userId);
        const bothAnswered = answers?.length === 2;
        const revealed = assignment.revealed_at !== null || bothAnswered;
        if (bothAnswered && !assignment.revealed_at) {
          await supabaseAdmin.from("qa_assignments").update({ revealed_at: new Date().toISOString() }).eq("id", assignment.id);
        }
        return new Response(JSON.stringify({
          assignment,
          question: assignment.qa_questions,
          yourAnswer,
          partnerAnswer: revealed ? partnerAnswer : null,
          bothAnswered,
          revealed,
          partnerName: (await supabaseAdmin.from("profiles").select("display_name").eq("id", getPartnerId(relationship)).single())?.display_name || "Partner",
          nextQuestionAvailableIn: 86400,
          preferredCategoryId: relationship.preferred_category_id,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } else {
        const { data: questions } = await supabaseAdmin
          .from("qa_questions").select("*").eq("is_active", true).limit(1);
        if (questions?.length) {
          const { data: newAssignment } = await supabaseAdmin
            .from("qa_assignments")
            .insert({ question_id: questions[0].id, relationship_id: relationship.id, assigned_date: today })
            .select("*, qa_questions(*)").single();
          return new Response(JSON.stringify({ ...newAssignment, yourAnswer: null, partnerAnswer: null, bothAnswered: false, revealed: false }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "No questions available" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (path === "/qa/categories" && req.method === "GET") {
      const { data } = await supabaseAdmin.from("qa_categories").select("*");
      return new Response(JSON.stringify(data || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/qa/submit" && req.method === "POST") {
      const body = await req.json();
      const { question_id, answer_text } = body;
      const { relationship } = await getActiveRelationship();
      const { data, error } = await supabaseAdmin
        .from("qa_answers")
        .insert({ question_id, relationship_id: relationship?.id, user_id: userId, answer_text })
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

    if (path === "/qa/skip" && req.method === "POST") {
      // find today assignment and mark skipped
      const { relationship } = await getActiveRelationship();
      const today = new Date().toISOString().split("T")[0];
      await supabaseAdmin
        .from("qa_assignments")
        .update({ skipped_at: new Date().toISOString(), skipped_by: userId })
        .eq("relationship_id", relationship?.id)
        .eq("assigned_date", today);
      return new Response(JSON.stringify({ message: "Skipped" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/qa/preferred-category" && req.method === "PATCH") {
      const { category_id } = await req.json();
      const { relationship } = await getActiveRelationship();
      await supabaseAdmin
        .from("relationships")
        .update({ preferred_category_id: category_id || null })
        .eq("id", relationship?.id);
      return new Response(JSON.stringify({ message: "Updated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/qa/history" && req.method === "GET") {
      const { relationship } = await getActiveRelationship();
      const { data: assignments } = await supabaseAdmin
        .from("qa_assignments")
        .select("*, qa_questions(*), qa_answers(*)")
        .eq("relationship_id", relationship?.id)
        .order("assigned_date", { ascending: false })
        .limit(50);
      return new Response(JSON.stringify({ items: assignments || [], hasMore: false, nextCursor: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== ACCOUNT (deletion) ====================
    if (path === "/account" && req.method === "DELETE") {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ message: "Account deleted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found", path }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error.message);
    return new Response(JSON.stringify({ error: error.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
