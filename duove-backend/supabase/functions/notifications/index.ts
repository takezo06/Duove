import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { createSupabaseClients } from "../_shared/supabase.ts";
import { getUserId } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();

  const { admin } = createSupabaseClients(req);
  const userId = await getUserId(req);
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/notifications/, "").replace(/\/+$/, "") || "/";

  // GET /notifications
  if (path === "/" && req.method === "GET") {
    const relationship = await getActiveRelationship();
    if (!relationship) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const partnerId = getPartnerId(relationship);
    const { data: partnerProfile } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", partnerId)
      .single();
    const partnerDisplay = partnerProfile?.display_name || "Your partner";

    const { data: cravings } = await admin
      .from("cravings")
      .select("*")
      .eq("relationship_id", relationship.id)
      .neq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    const { data: letters } = await admin
      .from("love_letters")
      .select("*")
      .eq("relationship_id", relationship.id)
      .neq("sender_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    const notifications = [];
    cravings?.forEach((c) => {
      notifications.push({
        id: `craving_${c.id}`,
        type: c.fulfilled ? "craving_fulfilled" : "craving_added",
        message: c.fulfilled
          ? `${partnerDisplay} fulfilled a craving: "${c.content}"`
          : `${partnerDisplay} added a craving: "${c.content}"`,
        created_at: c.created_at,
        link: "/cravings",
        reference_id: c.id,
      });
    });
    letters?.forEach((l) => {
      notifications.push({
        id: `letter_${l.id}`,
        type: "letter_received",
        message: `${partnerDisplay} sent you a letter 💌`,
        created_at: l.created_at,
        link: "/letters",
        reference_id: l.id,
      });
    });

    notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return new Response(JSON.stringify(notifications.slice(0, 50)), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // GET /notifications/unread-count
  if (path === "/unread-count" && req.method === "GET") {
    const relationship = await getActiveRelationship();
    if (!relationship) {
      return new Response(JSON.stringify({ count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: profile } = await admin
      .from("profiles")
      .select("last_read_at")
      .eq("id", userId)
      .single();
    const lastReadAt = profile?.last_read_at || new Date(0).toISOString();

    const { count: cravingsCount } = await admin
      .from("cravings").select("*", { count: "exact", head: true })
      .eq("relationship_id", relationship.id)
      .neq("user_id", userId)
      .gt("created_at", lastReadAt);

    const { count: lettersCount } = await admin
      .from("love_letters").select("*", { count: "exact", head: true })
      .eq("relationship_id", relationship.id)
      .neq("sender_id", userId)
      .gt("created_at", lastReadAt);

    return new Response(JSON.stringify({ count: (cravingsCount || 0) + (lettersCount || 0) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // POST /notifications/read
  if (path === "/read" && req.method === "POST") {
    await admin
      .from("profiles")
      .update({ last_read_at: new Date().toISOString() })
      .eq("id", userId);
    return new Response(JSON.stringify({ message: "Marked as read" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
