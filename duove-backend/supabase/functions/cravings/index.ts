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

  const url = new URL(req.url);
  // Remove /cravings prefix; default to "/"
  let path = url.pathname.replace(/^\/cravings/, "").replace(/\/+$/, "") || "/";

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  // Every request works on the caller's own relationship; ids sent by the browser are ignored.
  async function getActiveRelationship() {
    const { data } = await admin
      .from("relationships")
      .select("*")
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
      .eq("status", "active")
      .maybeSingle();
    return data;
  }

  // ✅ GET /cravings
  if (path === "/" && req.method === "GET") {
    const relationship = await getActiveRelationship();
    if (!relationship) return json([]);

    // 1) Delete cravings marked done more than 24 hours ago
    await admin
      .from("cravings")
      .delete()
      .eq("fulfilled", true)
      .lt("fulfilled_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // 2) Fetch remaining cravings
    const { data } = await admin
      .from("cravings")
      .select("*")
      .eq("relationship_id", relationship.id)
      .order("created_at", { ascending: false });

    return json(data || []);
  }

  // POST /cravings
  if (path === "/" && req.method === "POST") {
    const relationship = await getActiveRelationship();
    if (!relationship) return json({ error: "No active relationship" }, 404);

    const { content, category } = await req.json();
    const partnerId = relationship.user_id === userId ? relationship.partner_id : relationship.user_id;

    const { data, error } = await admin
      .from("cravings")
      .insert({
        relationship_id: relationship.id,
        user_id: userId,
        partner_id: partnerId,
        content,
        category,
      })
      .select()
      .single();

    if (error) return json({ error: "Couldn't save this craving" }, 500);
    return json(data, 201);
  }

  // PATCH /cravings/:id/toggle
  if (path.match(/^\/[\w-]+\/toggle$/) && req.method === "PATCH") {
    const relationship = await getActiveRelationship();
    if (!relationship) return json({ error: "Not found" }, 404);

    const cravingId = path.split("/")[1];
    const { data: existing } = await admin
      .from("cravings")
      .select("fulfilled")
      .eq("id", cravingId)
      .eq("relationship_id", relationship.id)
      .maybeSingle();
    if (!existing) return json({ error: "Not found" }, 404);

    const { data } = await admin
      .from("cravings")
      .update({
        fulfilled: !existing.fulfilled,
        fulfilled_at: existing.fulfilled ? null : new Date().toISOString(),
      })
      .eq("id", cravingId)
      .eq("relationship_id", relationship.id)
      .select()
      .single();

    return json(data);
  }

  // DELETE /cravings/:id
  if (path.match(/^\/[\w-]+$/) && req.method === "DELETE") {
    const relationship = await getActiveRelationship();
    if (!relationship) return json({ error: "Not found" }, 404);

    const cravingId = path.split("/")[1];
    await admin
      .from("cravings")
      .delete()
      .eq("id", cravingId)
      .eq("relationship_id", relationship.id);
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  return json({ error: "Not found" }, 404);
});
