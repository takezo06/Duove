-- Contraception: the method someone uses and what they log for it (a pill taken, a patch changed, a shot).
-- Only the contraception function reads and writes these tables, with the service role: RLS is on with no
-- rules, and browsers get no table rights at all. The partner sees a method only when its owner shares it.
-- The id lists in the checks match duove-backend/supabase/functions/contraception/index.ts and
-- frontend/src/lib/contraception.ts.

CREATE TABLE IF NOT EXISTS "public"."contraception_methods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "user_id" "uuid" NOT NULL REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    "relationship_id" "uuid" NOT NULL REFERENCES "public"."relationships"("id") ON DELETE CASCADE,
    "method" "text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "started_on" "date" NOT NULL,
    "ended_on" "date",
    "shared" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "contraception_methods_method_check" CHECK (("method" = ANY (ARRAY[
      'pill_combined', 'pill_progestin', 'patch', 'ring_monthly', 'ring_yearly', 'shot', 'implant', 'iud_hormonal', 'iud_copper',
      'condom_external', 'condom_internal', 'diaphragm', 'cervical_cap', 'sponge', 'spermicide',
      'fertility_awareness', 'withdrawal', 'lam', 'tubal', 'vasectomy'
    ]::"text"[]))),
    CONSTRAINT "contraception_methods_dates_check" CHECK (("ended_on" IS NULL OR "ended_on" >= "started_on"))
);

-- One current method per person
CREATE UNIQUE INDEX IF NOT EXISTS "contraception_methods_one_current" ON "public"."contraception_methods" ("user_id") WHERE ("ended_on" IS NULL);
CREATE INDEX IF NOT EXISTS "idx_contraception_methods_user" ON "public"."contraception_methods" ("user_id", "started_on" DESC);

CREATE TABLE IF NOT EXISTS "public"."contraception_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "user_id" "uuid" NOT NULL REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    -- Its own link to the relationship, so leaving removes emergency contraception logged with no method too
    "relationship_id" "uuid" NOT NULL REFERENCES "public"."relationships"("id") ON DELETE CASCADE,
    "method_id" "uuid" REFERENCES "public"."contraception_methods"("id") ON DELETE CASCADE,
    "kind" "text" NOT NULL,
    "on_date" "date" NOT NULL,
    "at_time" time without time zone,
    "detail" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "contraception_events_kind_check" CHECK (("kind" = ANY (ARRAY[
      'taken', 'missed', 'changed', 'removed', 'ring_in', 'ring_out', 'shot', 'used', 'emergency'
    ]::"text"[])))
);

-- A pill is taken or missed once a day; a change or a shot is logged once a day. Uses and emergency contraception can repeat.
CREATE UNIQUE INDEX IF NOT EXISTS "contraception_events_one_pill_a_day" ON "public"."contraception_events" ("method_id", "on_date") WHERE ("kind" = ANY (ARRAY['taken', 'missed']::"text"[]));
CREATE UNIQUE INDEX IF NOT EXISTS "contraception_events_one_step_a_day" ON "public"."contraception_events" ("method_id", "kind", "on_date") WHERE ("kind" = ANY (ARRAY['changed', 'removed', 'ring_in', 'ring_out', 'shot']::"text"[]));
CREATE INDEX IF NOT EXISTS "idx_contraception_events_user_date" ON "public"."contraception_events" ("user_id", "on_date" DESC);

ALTER TABLE "public"."contraception_methods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."contraception_events" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."contraception_methods" FROM "anon", "authenticated";
REVOKE ALL ON TABLE "public"."contraception_events" FROM "anon", "authenticated";
