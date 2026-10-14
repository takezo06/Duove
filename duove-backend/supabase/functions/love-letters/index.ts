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

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

  async function getActiveRelationship() {
    const { data } = await admin
      .from("relationships")
      .select("*")
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
      .eq("status", "active")
      .maybeSingle();
    return data;
  }

  // GET /love-letters
  if (path === "/" && req.method === "GET") {
    const relationship = await getActiveRelationship();
    if (!relationship) return json([]);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "20") || 20, 1), 100);
    const letterId = url.searchParams.get("id");
    // Cursor paging: `before` is the created_at of the oldest letter the client already has.
    // ponytail: letters sharing the exact same microsecond would be skipped; add an id tiebreak if that ever happens
    const before = url.searchParams.get("before");
    if (before && Number.isNaN(Date.parse(before))) return json({ error: "Invalid before cursor" }, 400);
    let query;
    if (letterId) {
      query = admin.from("love_letters").select("*").eq("id", letterId).eq("relationship_id", relationship.id);
    } else {
      query = admin.from("love_letters").select("*").eq("relationship_id", relationship.id);
      if (before) query = query.lt("created_at", before);
      query = query.order("created_at", { ascending: false }).limit(limit);
    }
    const { data, error } = await query;
    if (error) return json({ error: error.message }, 500);
    return json(data || []);
  }

  // POST /love-letters
  if (path === "/" && req.method === "POST") {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid request body" }, 400);
    const heading = text(body.heading, 120);
    const message = text(body.message, 5000);
    if (!heading || !message) return json({ error: "A letter needs a heading and a message" }, 400);
    const relationship = await getActiveRelationship();
    if (!relationship) return json({ error: "Pair with your partner before sending letters" }, 400);
    // Only known columns: spreading the body let unknown keys fail the whole insert.
    const { data, error } = await admin
      .from("love_letters")
      .insert({
        relationship_id: relationship.id,
        sender_id: userId,
        heading,
        message,
        recipient_name: text(body.recipient_name, 80) || "My love",
        sender_name: text(body.sender_name, 80) || null,
        spotify_track_id: text(body.spotify_track_id, 64) || null,
        spotify_track_name: text(body.spotify_track_name, 200) || null,
        spotify_artist_name: text(body.spotify_artist_name, 200) || null,
        spotify_album_art: text(body.spotify_album_art, 500) || null,
      })
      .select().single();
    if (error) return json({ error: error.message }, 500);
    return json(data, 201);
  }

  // GET /love-letters/search-song
  if (path === "/search-song" && req.method === "GET") {
    const q = url.searchParams.get("q")?.trim();
    if (!q) return json([]);
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + btoa(`${Deno.env.get("SPOTIFY_CLIENT_ID")}:${Deno.env.get("SPOTIFY_CLIENT_SECRET")}`)
      },
      body: new URLSearchParams({ grant_type: "client_credentials" }).toString(),
    });
    if (!tokenRes.ok) return json({ error: "Song search is unavailable right now" }, 502);
    const spotifyData = await tokenRes.json();
    const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=10`, {
      headers: { Authorization: `Bearer ${spotifyData.access_token}` }
    });
    if (!searchRes.ok) return json({ error: "Song search is unavailable right now" }, 502);
    const searchData = await searchRes.json();
    const tracks = searchData.tracks?.items.map((item: any) => ({
      id: item.id,
      name: item.name,
      artist: item.artists.map((a: any) => a.name).join(", "),
      albumArt: item.album.images[0]?.url || "",
    })) || [];
    return json(tracks);
  }

  return json({ error: "Not found" }, 404);
});
