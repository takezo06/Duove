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
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/cravings/, "").replace(/\/+$/, "") || "/";

  // GET /cravings
  if (path === "/" && req.method === "GET") {
    const relationshipId = url.searchParams.get("relationshipId");
    const { data } = await admin
      .from("cravings")
      .select("*")
      .eq("relationship_id", relationshipId)
      .order("created_at", { ascending: false });
    return new Response(JSON.stringify(data || []), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // POST /cravings
  if (path === "/" && req.method === "POST") {
    const body = await req.json();
    const { relationshipId, partnerId, content, category } = body;
    const { data, error } = await admin
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

  // PATCH /cravings/:id/toggle
  if (path.match(/^\/[\w-]+\/toggle$/) && req.method === "PATCH") {
    const cravingId = path.split("/")[1];
    const { data: existing } = await admin.from("cravings").select("fulfilled").eq("id", cravingId).single();
    const { data } = await admin
      .from("cravings")
      .update({ fulfilled: !existing?.fulfilled })
      .eq("id", cravingId)
      .select().single();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // DELETE /cravings/:id
  if (path.match(/^\/[\w-]+$/) && req.method === "DELETE") {
    const cravingId = path.split("/")[1];
    await admin.from("cravings").delete().eq("id", cravingId);
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
