-- profiles.has_periods is the answer to "Do you have periods?": true, false, or null (not asked yet).
-- Everyone starts unanswered and is asked on the cycle page; 2 or more logged periods count as a yes
-- until they answer (that rule lives in code, not here). Safe to run more than once.
-- (The unused can_track_cycles column defaults to false, which would read as "No" for everyone,
-- so it isn't used for this.)
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "has_periods" boolean;

-- Tips were readable and writable by anyone with the anon key. Signed-in users can only read them now.
ALTER TABLE "public"."cycle_tips" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Signed-in users can read tips" ON "public"."cycle_tips";
CREATE POLICY "Signed-in users can read tips" ON "public"."cycle_tips" FOR SELECT TO "authenticated" USING (true);
