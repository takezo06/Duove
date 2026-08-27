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
  const path = url.pathname.replace(/^\/love-letters/, "").replace(/\/+$/, "") || "/";

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

  // GET /love-letters
  if (path === "/" && req.method === "GET") {
    const relationship = await getActiveRelationship();
    if (!relationship) {
      return new Response(JSON.stringify([]), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const letterId = url.searchParams.get("id");
    let query;
    if (letterId) {
      query = admin.from("love_letters").select("*").eq("id", letterId).eq("relationship_id", relationship.id);
    } else {
      query = admin.from("love_letters").select("*").eq("relationship_id", relationship.id)
        .order("created_at", { ascending: false }).limit(limit);
    }
    const { data } = await query;
    return new Response(JSON.stringify(data || []), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // POST /love-letters
  if (path === "/" && req.method === "POST") {
    const body = await req.json();
    const relationship = await getActiveRelationship();
    const { data, error } = await admin
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
    await admin.from("notifications").insert({
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

  // GET /love-letters/search-song
  if (path === "/search-song" && req.method === "GET") {
    const q = url.searchParams.get("q");
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + btoa(`${Deno.env.get("SPOTIFY_CLIENT_ID")}:${Deno.env.get("SPOTIFY_CLIENT_SECRET")}`)
      },
      body: new URLSearchParams({ grant_type: "client_credentials" }).toString(),
    });
    const spotifyData = await tokenRes.json();
    const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=10`, {
      headers: { Authorization: `Bearer ${spotifyData.access_token}` }
    });
    const searchData = await searchRes.json();
    const tracks = searchData.tracks?.items.map((item) => ({
      id: item.id,
      name: item.name,
      artist: item.artists.map(a => a.name).join(", "),
      albumArt: item.album.images[0]?.url || "",
    })) || [];
    return new Response(JSON.stringify(tracks), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
