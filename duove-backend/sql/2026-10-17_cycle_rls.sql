-- Cycle logs and symptom logs are read and written only through the cycles edge function (service role),
-- which shares a partner's data only while they track a cycle. These policies let a partner read the rows
-- directly with their own token even after saying "No", and two let them change or create rows that
-- aren't theirs (FOR ALL with no relationship status check, an INSERT that never checks user_id).
-- Each person keeps full access to their own rows through "Users can manage own ...".
DROP POLICY IF EXISTS "Partners can view cycle logs" ON "public"."cycle_logs";
DROP POLICY IF EXISTS "cycle_couple_access" ON "public"."cycle_logs";
DROP POLICY IF EXISTS "cycle_logs_insert_own_relationship" ON "public"."cycle_logs";
DROP POLICY IF EXISTS "cycle_logs_select_own_relationship" ON "public"."cycle_logs";
DROP POLICY IF EXISTS "Partners can view symptom logs" ON "public"."daily_symptom_logs";
