import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { createSupabaseClients } from "../_shared/supabase.ts";
import { getUserId } from "../_shared/auth.ts";
import { removeLetterPhotos } from "../_shared/letterPhotos.ts";

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
  const path = url.pathname.replace(/^\/account/, "").replace(/\/+$/, "") || "/";

  // DELETE /account: the database cascades from the user to the profile, the relationship and
  // everything in it. Profile and letter photos live in Storage, outside those cascades, so they go first.
  if (path === "/" && req.method === "DELETE") {
    const failed = () =>
      new Response(JSON.stringify({ error: "Your account wasn't deleted. Try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const { data: photos, error: listError } = await admin.storage.from("avatars").list(userId, { limit: 1000 });
    if (listError) return failed();
    if (photos?.length) {
      const { error } = await admin.storage.from("avatars").remove(photos.map((p) => `${userId}/${p.name}`));
      if (error) return failed();
    }

    const { data: relationships, error: relError } = await admin
      .from("relationships")
      .select("id")
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`);
    if (relError) return failed();
    if (!(await removeLetterPhotos(admin, (relationships ?? []).map((r) => r.id), userId))) return failed();

    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return failed();
    return new Response(JSON.stringify({ message: "Account deleted" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
