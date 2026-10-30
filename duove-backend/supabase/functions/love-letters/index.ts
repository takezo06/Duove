import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { createSupabaseClients } from "../_shared/supabase.ts";
import { getUserId } from "../_shared/auth.ts";
import { isOwnPhotoPath, signPhoto, signPhotos } from "../_shared/letterPhotos.ts";

// The flowers and wraps a letter's bouquet can use. A copy of the ids in frontend/src/lib/bouquet.ts;
// frontend/scripts/bouquet.check.ts fails when the two lists differ.
const FLOWER_IDS = ["garden-rose", "peony", "ranunculus", "tulip", "anemone", "cosmos", "daisy", "carnation", "sweet-pea", "lily", "snapdragon", "babys-breath"];
const WRAP_IDS = ["kraft", "wine", "charcoal", "tissue"];
const MAX_STEMS = 12;

// A bouquet is its stems in the order they were added, a wrap and the seed that places them.
// undefined/null means no flowers; anything else malformed is rejected rather than half-saved.
function cleanBouquet(v: unknown): { ok: true; value: unknown } | { ok: false } {
  if (v === undefined || v === null) return { ok: true, value: null };
  if (typeof v !== "object" || Array.isArray(v)) return { ok: false };
  const b = v as Record<string, unknown>;
  const stems = b.stems;
  const valid = b.v === 1 &&
    Array.isArray(stems) && stems.length >= 1 && stems.length <= MAX_STEMS &&
    stems.every((s) => typeof s === "string" && FLOWER_IDS.includes(s)) &&
    typeof b.wrap === "string" && WRAP_IDS.includes(b.wrap) &&
    Number.isInteger(b.seed) && (b.seed as number) >= 0 && (b.seed as number) <= 2 ** 31 - 1;
  return valid ? { ok: true, value: { v: 1, stems, wrap: b.wrap, seed: b.seed } } : { ok: false };
}

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
  // Database errors name tables and columns: log them here, never send them to the browser
  const failed = (error: unknown) => {
    console.error("love-letters failed", req.method, path, error);
    return json({ error: "Something went wrong. Try again." }, 500);
  };
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
    if (error) return failed(error);
    return json(await signPhotos(admin, data || []));
  }

  // POST /love-letters
  if (path === "/" && req.method === "POST") {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid request body" }, 400);
    const heading = text(body.heading, 120);
    const message = text(body.message, 5000);
    if (!heading || !message) return json({ error: "A letter needs a heading and a message" }, 400);
    const bouquet = cleanBouquet(body.bouquet);
    if (!bouquet.ok) return json({ error: "Those flowers didn't come through. Pick them again." }, 400);
    // A photo is tucked into the flowers, so it needs them, and it must be one this sender uploaded
    const photoPath = typeof body.photo_path === "string" && body.photo_path !== "" ? body.photo_path : null;
    let photoUrl: string | null = null;
    if (photoPath) {
      if (!bouquet.value) return json({ error: "A photo goes with flowers. Pick some flowers too." }, 400);
      photoUrl = isOwnPhotoPath(photoPath, userId) ? await signPhoto(admin, photoPath) : null;
      if (!photoUrl) return json({ error: "Your photo didn't upload. Add it again." }, 400);
    }
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
        bouquet: bouquet.value,
        photo_path: photoPath,
      })
      .select().single();
    if (error) return failed(error);
    const { photo_path: _path, ...letter } = data;
    return json({ ...letter, photo_url: photoUrl }, 201);
  }

  // POST /love-letters/:id/open: the recipient breaks the seal. Safe to call twice.
  const opening = path.match(/^\/([0-9a-f-]{36})\/open$/i);
  if (opening && req.method === "POST") {
    const relationship = await getActiveRelationship();
    if (!relationship) return json({ error: "Pair with your partner first" }, 400);
    const { data: letter } = await admin
      .from("love_letters")
      .select("id, sender_id, opened_at")
      .eq("id", opening[1])
      .eq("relationship_id", relationship.id)
      .maybeSingle();
    if (!letter) return json({ error: "Letter not found" }, 404);
    if (letter.sender_id === userId) return json({ error: "Only the person it was written to can open it" }, 403);
    if (letter.opened_at) return json({ id: letter.id, opened_at: letter.opened_at });
    const { data, error } = await admin
      .from("love_letters")
      .update({ opened_at: new Date().toISOString() })
      .eq("id", letter.id)
      .is("opened_at", null)
      .select("id, opened_at")
      .maybeSingle();
    if (error) return failed(error);
    // null means a second tab opened it a moment earlier; either way it's open now
    return json(data ?? { id: letter.id, opened_at: new Date().toISOString() });
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
