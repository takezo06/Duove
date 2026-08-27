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
    const body = await req.json();
    const { data } = await admin
      .from("profiles")
      .update(body)
      .eq("id", userId)
      .select()
      .single();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
