-- Letters stay sealed until the recipient opens them.
-- opened_at is null while sealed and set once by POST /love-letters/:id/open.
ALTER TABLE "public"."love_letters" ADD COLUMN IF NOT EXISTS "opened_at" timestamp with time zone;

-- Everything sent before this change counts as already read, so the history doesn't reseal.
UPDATE "public"."love_letters" SET "opened_at" = "created_at" WHERE "opened_at" IS NULL;
