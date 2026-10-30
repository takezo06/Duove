-- Only the relationships edge function (service role) may write to relationships.
-- Browsers keep read access to their own row.
DROP POLICY IF EXISTS "relationships_insert_own" ON "public"."relationships";
DROP POLICY IF EXISTS "relationships_update_own" ON "public"."relationships";
DROP POLICY IF EXISTS "Users can delete their own relationships" ON "public"."relationships";
DROP POLICY IF EXISTS "relationships_select_pair" ON "public"."relationships";

-- One active relationship per person, whether they are user_id or partner_id.
CREATE OR REPLACE FUNCTION "public"."enforce_one_active_relationship"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  IF NEW.partner_id IS NULL OR NEW.partner_id = NEW.user_id THEN
    RAISE EXCEPTION 'An active relationship needs two different people'
      USING ERRCODE = '23514';
  END IF;

  -- Lock both people in a fixed order so two joins at once can't both pass.
  PERFORM pg_advisory_xact_lock(hashtext(LEAST(NEW.user_id::text, NEW.partner_id::text)));
  PERFORM pg_advisory_xact_lock(hashtext(GREATEST(NEW.user_id::text, NEW.partner_id::text)));

  IF EXISTS (
    SELECT 1 FROM relationships r
    WHERE r.status = 'active'
      AND r.id <> NEW.id
      AND (r.user_id IN (NEW.user_id, NEW.partner_id)
        OR r.partner_id IN (NEW.user_id, NEW.partner_id))
  ) THEN
    RAISE EXCEPTION 'Already in an active relationship'
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "relationships_one_active" ON "public"."relationships";
CREATE TRIGGER "relationships_one_active"
  BEFORE INSERT OR UPDATE OF "status", "user_id", "partner_id" ON "public"."relationships"
  FOR EACH ROW EXECUTE FUNCTION "public"."enforce_one_active_relationship"();
