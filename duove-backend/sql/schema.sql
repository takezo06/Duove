


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'username', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."enforce_one_active_relationship"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."cravings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "relationship_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "partner_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "fulfilled" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "category" "text" DEFAULT 'Other'::"text",
    "archived_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "fulfilled_at" timestamp with time zone
);


ALTER TABLE "public"."cravings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cycle_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "relationship_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "duration" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_manual_override" boolean DEFAULT false,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "cycle_logs_check" CHECK (("end_date" >= "start_date"))
);


ALTER TABLE "public"."cycle_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cycle_tips" (
    "id" integer NOT NULL,
    "phase" character varying(20) NOT NULL,
    "target_audience" character varying(10) NOT NULL,
    "category" character varying(30) NOT NULL,
    "tip_text" "text" NOT NULL,
    "evidence_strength" character varying(20) DEFAULT 'moderate'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "cycle_tips_category_check" CHECK ((("category")::"text" = ANY ((ARRAY['nutrition'::character varying, 'exercise'::character varying, 'sleep'::character varying, 'stress_management'::character varying, 'symptom_relief'::character varying, 'emotional_support'::character varying, 'practical_support'::character varying, 'communication'::character varying, 'general_wellness'::character varying])::"text"[]))),
    CONSTRAINT "cycle_tips_evidence_strength_check" CHECK ((("evidence_strength")::"text" = ANY ((ARRAY['strong'::character varying, 'moderate'::character varying, 'emerging'::character varying])::"text"[]))),
    CONSTRAINT "cycle_tips_phase_check" CHECK ((("phase")::"text" = ANY ((ARRAY['menstrual'::character varying, 'follicular'::character varying, 'ovulatory'::character varying, 'luteal'::character varying, 'general'::character varying])::"text"[]))),
    CONSTRAINT "cycle_tips_target_audience_check" CHECK ((("target_audience")::"text" = ANY ((ARRAY['self'::character varying, 'partner'::character varying])::"text"[])))
);


ALTER TABLE "public"."cycle_tips" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."cycle_tips_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."cycle_tips_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."cycle_tips_id_seq" OWNED BY "public"."cycle_tips"."id";



CREATE TABLE IF NOT EXISTS "public"."daily_symptom_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "relationship_id" "uuid" NOT NULL,
    "log_date" "date" NOT NULL,
    "bleeding_intensity" "text",
    "physical_symptoms" "jsonb" DEFAULT '[]'::"jsonb",
    "moods" "jsonb" DEFAULT '[]'::"jsonb",
    "discharge" "text",
    "sex_drive" "text",
    "sexual_activity" "jsonb" DEFAULT '[]'::"jsonb",
    "lifestyle" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "daily_symptom_logs_bleeding_intensity_check" CHECK (("bleeding_intensity" = ANY (ARRAY['spotting'::"text", 'light'::"text", 'medium'::"text", 'heavy'::"text"]))),
    CONSTRAINT "daily_symptom_logs_discharge_check" CHECK (("discharge" = ANY (ARRAY['none'::"text", 'creamy'::"text", 'sticky'::"text", 'eggwhite'::"text", 'watery'::"text", 'dry'::"text"]))),
    CONSTRAINT "daily_symptom_logs_sex_drive_check" CHECK (("sex_drive" = ANY (ARRAY['high'::"text", 'medium'::"text", 'low'::"text"])))
);


ALTER TABLE "public"."daily_symptom_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."love_letters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "relationship_id" "uuid",
    "sender_id" "uuid",
    "message" "text" NOT NULL,
    "spotify_track_id" "text",
    "spotify_track_name" "text",
    "spotify_artist_name" "text",
    "spotify_album_art" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "heading" "text" DEFAULT 'Untitled'::"text" NOT NULL,
    "recipient_name" "text" DEFAULT 'My love'::"text" NOT NULL,
    "sender_name" "text",
    "opened_at" timestamp with time zone,
    "bouquet" "jsonb"
);


ALTER TABLE "public"."love_letters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "timezone_offset" "text" DEFAULT '+00:00'::"text",
    "can_track_cycles" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "last_active" timestamp with time zone DEFAULT "now"(),
    "avatar_url" "text",
    "display_name" "text" DEFAULT ''::"text",
    "last_read_at" timestamp with time zone DEFAULT "now"(),
    "has_periods" boolean
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qa_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid",
    "relationship_id" "uuid",
    "user_id" "uuid",
    "partner_id" "uuid",
    "answer_text" "text" NOT NULL,
    "image_url" "text",
    "submitted_at" timestamp with time zone DEFAULT "now"(),
    "revealed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."qa_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qa_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "relationship_id" "uuid" NOT NULL,
    "assigned_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "skipped_at" timestamp with time zone,
    "skipped_by" "uuid",
    "revealed_at" timestamp with time zone
);


ALTER TABLE "public"."qa_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qa_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."qa_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qa_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid",
    "question_text" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."qa_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."relationships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "partner_id" "uuid",
    "invite_code" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "paired_at" timestamp with time zone,
    "anniversary_date" "date",
    "preferred_category_id" "uuid",
    CONSTRAINT "no_self_pair" CHECK (("user_id" <> "partner_id")),
    CONSTRAINT "relationships_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'dissolved'::"text"])))
);


ALTER TABLE "public"."relationships" OWNER TO "postgres";


ALTER TABLE ONLY "public"."cycle_tips" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."cycle_tips_id_seq"'::"regclass");





ALTER TABLE ONLY "public"."cravings"
    ADD CONSTRAINT "cravings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cycle_logs"
    ADD CONSTRAINT "cycle_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cycle_logs"
    ADD CONSTRAINT "cycle_logs_user_id_start_date_key" UNIQUE ("user_id", "start_date");



ALTER TABLE ONLY "public"."cycle_logs"
    ADD CONSTRAINT "cycle_logs_user_id_start_date_key1" UNIQUE ("user_id", "start_date");



ALTER TABLE ONLY "public"."cycle_tips"
    ADD CONSTRAINT "cycle_tips_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_symptom_logs"
    ADD CONSTRAINT "daily_symptom_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_symptom_logs"
    ADD CONSTRAINT "daily_symptom_logs_user_id_log_date_key" UNIQUE ("user_id", "log_date");







ALTER TABLE ONLY "public"."love_letters"
    ADD CONSTRAINT "love_letters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qa_answers"
    ADD CONSTRAINT "qa_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qa_answers"
    ADD CONSTRAINT "qa_answers_question_id_relationship_id_user_id_key" UNIQUE ("question_id", "relationship_id", "user_id");



ALTER TABLE ONLY "public"."qa_assignments"
    ADD CONSTRAINT "qa_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qa_assignments"
    ADD CONSTRAINT "qa_assignments_relationship_id_assigned_date_key" UNIQUE ("relationship_id", "assigned_date");



ALTER TABLE ONLY "public"."qa_categories"
    ADD CONSTRAINT "qa_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."qa_categories"
    ADD CONSTRAINT "qa_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qa_questions"
    ADD CONSTRAINT "qa_questions_pkey" PRIMARY KEY ("id");







ALTER TABLE ONLY "public"."relationships"
    ADD CONSTRAINT "relationships_invite_code_key" UNIQUE ("invite_code");



ALTER TABLE ONLY "public"."relationships"
    ADD CONSTRAINT "relationships_pkey" PRIMARY KEY ("id");







CREATE INDEX "idx_cravings_archived_at" ON "public"."cravings" USING "btree" ("archived_at");



CREATE INDEX "idx_cravings_category" ON "public"."cravings" USING "btree" ("category");



CREATE INDEX "idx_cravings_fulfilled" ON "public"."cravings" USING "btree" ("fulfilled");



CREATE INDEX "idx_cravings_relationship" ON "public"."cravings" USING "btree" ("relationship_id");



CREATE INDEX "idx_cravings_relationship_id" ON "public"."cravings" USING "btree" ("relationship_id");



CREATE INDEX "idx_cravings_user_id" ON "public"."cravings" USING "btree" ("user_id");



CREATE INDEX "idx_cravings_user_partner" ON "public"."cravings" USING "btree" ("user_id", "partner_id");



CREATE INDEX "idx_cycle_dates" ON "public"."cycle_logs" USING "btree" ("start_date");



CREATE INDEX "idx_cycle_logs_relationship_id" ON "public"."cycle_logs" USING "btree" ("relationship_id");



CREATE INDEX "idx_cycle_logs_start_date" ON "public"."cycle_logs" USING "btree" ("start_date");



CREATE INDEX "idx_cycle_logs_user_id" ON "public"."cycle_logs" USING "btree" ("user_id");



CREATE INDEX "idx_cycle_tips_phase_audience" ON "public"."cycle_tips" USING "btree" ("phase", "target_audience");



CREATE INDEX "idx_cycle_user" ON "public"."cycle_logs" USING "btree" ("user_id");



CREATE INDEX "idx_cycle_user_dates" ON "public"."cycle_logs" USING "btree" ("user_id", "start_date" DESC);







CREATE INDEX "idx_invite_code" ON "public"."relationships" USING "btree" ("invite_code");















CREATE INDEX "idx_qa_assignments_revealed" ON "public"."qa_assignments" USING "btree" ("revealed_at");



CREATE INDEX "idx_qa_assignments_skipped" ON "public"."qa_assignments" USING "btree" ("skipped_at");







CREATE INDEX "idx_relationships_anniversary_date" ON "public"."relationships" USING "btree" ("anniversary_date");



CREATE INDEX "idx_relationships_invite_code" ON "public"."relationships" USING "btree" ("invite_code");



CREATE INDEX "idx_relationships_partner_id" ON "public"."relationships" USING "btree" ("partner_id");



CREATE INDEX "idx_relationships_status" ON "public"."relationships" USING "btree" ("status");



CREATE INDEX "idx_relationships_user_id" ON "public"."relationships" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_unique_pair" ON "public"."relationships" USING "btree" ("user_id", "partner_id");



CREATE OR REPLACE TRIGGER "relationships_one_active" BEFORE INSERT OR UPDATE OF "status", "user_id", "partner_id" ON "public"."relationships" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_one_active_relationship"();



CREATE UNIQUE INDEX "qa_assignments_one_per_day" ON "public"."qa_assignments" USING "btree" ("relationship_id", "assigned_date");





ALTER TABLE ONLY "public"."cravings"
    ADD CONSTRAINT "cravings_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cravings"
    ADD CONSTRAINT "cravings_relationship_id_fkey" FOREIGN KEY ("relationship_id") REFERENCES "public"."relationships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cravings"
    ADD CONSTRAINT "cravings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cycle_logs"
    ADD CONSTRAINT "cycle_logs_relationship_id_fkey" FOREIGN KEY ("relationship_id") REFERENCES "public"."relationships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cycle_logs"
    ADD CONSTRAINT "cycle_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_symptom_logs"
    ADD CONSTRAINT "daily_symptom_logs_relationship_id_fkey" FOREIGN KEY ("relationship_id") REFERENCES "public"."relationships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_symptom_logs"
    ADD CONSTRAINT "daily_symptom_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;











ALTER TABLE ONLY "public"."love_letters"
    ADD CONSTRAINT "love_letters_relationship_id_fkey" FOREIGN KEY ("relationship_id") REFERENCES "public"."relationships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."love_letters"
    ADD CONSTRAINT "love_letters_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qa_answers"
    ADD CONSTRAINT "qa_answers_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qa_answers"
    ADD CONSTRAINT "qa_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."qa_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qa_answers"
    ADD CONSTRAINT "qa_answers_relationship_id_fkey" FOREIGN KEY ("relationship_id") REFERENCES "public"."relationships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qa_answers"
    ADD CONSTRAINT "qa_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qa_assignments"
    ADD CONSTRAINT "qa_assignments_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."qa_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qa_assignments"
    ADD CONSTRAINT "qa_assignments_relationship_id_fkey" FOREIGN KEY ("relationship_id") REFERENCES "public"."relationships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qa_assignments"
    ADD CONSTRAINT "qa_assignments_skipped_by_fkey" FOREIGN KEY ("skipped_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."qa_questions"
    ADD CONSTRAINT "qa_questions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."qa_categories"("id") ON DELETE CASCADE;





ALTER TABLE ONLY "public"."relationships"
    ADD CONSTRAINT "relationships_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."relationships"
    ADD CONSTRAINT "relationships_preferred_category_id_fkey" FOREIGN KEY ("preferred_category_id") REFERENCES "public"."qa_categories"("id");



ALTER TABLE ONLY "public"."relationships"
    ADD CONSTRAINT "relationships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Partners can read love letters" ON "public"."love_letters" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."relationships"
  WHERE (("relationships"."id" = "love_letters"."relationship_id") AND (("relationships"."user_id" = "auth"."uid"()) OR ("relationships"."partner_id" = "auth"."uid"()))))));



CREATE POLICY "Sender can insert love letters" ON "public"."love_letters" FOR INSERT WITH CHECK ((("sender_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."relationships"
  WHERE (("relationships"."id" = "love_letters"."relationship_id") AND (("relationships"."user_id" = "auth"."uid"()) OR ("relationships"."partner_id" = "auth"."uid"())))))));







CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));







CREATE POLICY "Users can manage own cycle logs" ON "public"."cycle_logs" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own symptom logs" ON "public"."daily_symptom_logs" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));





CREATE POLICY "Users can view assignments in their relationship" ON "public"."qa_assignments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."relationships"
  WHERE (("relationships"."id" = "qa_assignments"."relationship_id") AND (("relationships"."user_id" = "auth"."uid"()) OR ("relationships"."partner_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view categories" ON "public"."qa_categories" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));





CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));





CREATE POLICY "Users can view questions" ON "public"."qa_questions" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));









ALTER TABLE "public"."cravings" ENABLE ROW LEVEL SECURITY;


-- Read-only, for the live updates on the Cravings page (Supabase Realtime only delivers rows the
-- subscriber may SELECT). Every write still goes through the cravings function.
CREATE POLICY "cravings_select_own_relationship" ON "public"."cravings" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."relationships" "r"
  WHERE (("r"."id" = "cravings"."relationship_id") AND ("r"."status" = 'active'::"text") AND (("r"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("r"."partner_id" = ( SELECT "auth"."uid"() AS "uid")))))));









ALTER TABLE "public"."cycle_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cycle_tips" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Signed-in users can read tips" ON "public"."cycle_tips" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."daily_symptom_logs" ENABLE ROW LEVEL SECURITY;















ALTER TABLE "public"."love_letters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;





ALTER TABLE "public"."qa_answers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."qa_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."qa_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."qa_questions" ENABLE ROW LEVEL SECURITY;







ALTER TABLE "public"."relationships" ENABLE ROW LEVEL SECURITY;



CREATE POLICY "relationships_select_own" ON "public"."relationships" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = "partner_id")));







GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



-- Only the sign-up trigger runs it; nobody calls it through the API
REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC, "anon", "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";





GRANT ALL ON TABLE "public"."cravings" TO "anon";
GRANT ALL ON TABLE "public"."cravings" TO "authenticated";
GRANT ALL ON TABLE "public"."cravings" TO "service_role";



GRANT ALL ON TABLE "public"."cycle_logs" TO "anon";
GRANT ALL ON TABLE "public"."cycle_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."cycle_logs" TO "service_role";



GRANT ALL ON TABLE "public"."cycle_tips" TO "anon";
GRANT ALL ON TABLE "public"."cycle_tips" TO "authenticated";
GRANT ALL ON TABLE "public"."cycle_tips" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cycle_tips_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cycle_tips_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cycle_tips_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."daily_symptom_logs" TO "anon";
GRANT ALL ON TABLE "public"."daily_symptom_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_symptom_logs" TO "service_role";







GRANT ALL ON TABLE "public"."love_letters" TO "anon";
GRANT ALL ON TABLE "public"."love_letters" TO "authenticated";
GRANT ALL ON TABLE "public"."love_letters" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."qa_answers" TO "anon";
GRANT ALL ON TABLE "public"."qa_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."qa_answers" TO "service_role";



GRANT ALL ON TABLE "public"."qa_assignments" TO "anon";
GRANT ALL ON TABLE "public"."qa_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."qa_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."qa_categories" TO "anon";
GRANT ALL ON TABLE "public"."qa_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."qa_categories" TO "service_role";



GRANT ALL ON TABLE "public"."qa_questions" TO "anon";
GRANT ALL ON TABLE "public"."qa_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."qa_questions" TO "service_role";





GRANT ALL ON TABLE "public"."relationships" TO "anon";
GRANT ALL ON TABLE "public"."relationships" TO "authenticated";
GRANT ALL ON TABLE "public"."relationships" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";










-- Storage: the avatars bucket (public, so photos load by address without a sign-in). Browsers may only add new photos to their own folder. Nobody lists, overwrites or deletes
-- through the browser; the profile function removes old photos with the service role.
UPDATE "storage"."buckets"
  SET "public" = true,
      "file_size_limit" = 2097152,
      "allowed_mime_types" = ARRAY['image/webp', 'image/jpeg', 'image/gif']
  WHERE "id" = 'avatars';

DROP POLICY IF EXISTS "Users can upload their own avatar" ON "storage"."objects";
DROP POLICY IF EXISTS "Users can update their own avatar" ON "storage"."objects";
DROP POLICY IF EXISTS "Users can view their own avatar" ON "storage"."objects";
DROP POLICY IF EXISTS "Users can delete their own avatar" ON "storage"."objects";

CREATE POLICY "Users can upload their own avatar" ON "storage"."objects" FOR INSERT TO "authenticated"
  WITH CHECK ((("bucket_id" = 'avatars'::"text") AND (("storage"."foldername"("name"))[1] = (( SELECT "auth"."uid"() AS "uid"))::"text")));
