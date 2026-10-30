-- Only the cravings edge function (service role) may read or write cravings.
-- It ties every request to the caller's own active relationship.
DROP POLICY IF EXISTS "cravings_couple_access" ON "public"."cravings";
DROP POLICY IF EXISTS "cravings_insert_own_relationship" ON "public"."cravings";
DROP POLICY IF EXISTS "cravings_select_own_relationship" ON "public"."cravings";
DROP POLICY IF EXISTS "cravings_update_own_relationship" ON "public"."cravings";
