import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization") || "";
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
  );
  const { data: { user } } = await client.auth.getUser();
  return user?.id || null;
}
