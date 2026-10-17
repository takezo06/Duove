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
  const path = url.pathname.replace(/^\/profile/, "").replace(/\/+$/, "") || "/";

  // GET /profile
  if (path === "/" && req.method === "GET") {
    const { data } = await admin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    return new Response(JSON.stringify(data || {}), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // PATCH /profile
  if (path === "/" && req.method === "PATCH") {
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid request body" }, 400);
    // Only what the app edits: name, photo and the "Do you have periods?" answer
    const update: Record<string, unknown> = {};
    if ("display_name" in body) {
      if (typeof body.display_name !== "string" || !body.display_name.trim()) return json({ error: "Your name can't be empty." }, 400);
      update.display_name = body.display_name.trim().slice(0, 40);
    }
    if ("avatar_url" in body) {
      if (body.avatar_url !== null && typeof body.avatar_url !== "string") return json({ error: "Invalid photo." }, 400);
      update.avatar_url = body.avatar_url;
    }
    if ("has_periods" in body) {
      if (body.has_periods !== null && typeof body.has_periods !== "boolean") return json({ error: "Invalid answer." }, 400);
      update.has_periods = body.has_periods;
    }
    if (!Object.keys(update).length) return json({ error: "Nothing to update." }, 400);
    const { data, error } = await admin
      .from("profiles")
      .update(update)
      .eq("id", userId)
      .select()
      .single();
    if (error) return json({ error: error.message }, 500);
    return json(data);
  }

  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
