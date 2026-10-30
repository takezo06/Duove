-- A photo can be tucked into a letter's flowers. null means no photo, so existing rows need no backfill.
-- The path is "<sender id>/<uuid>.<webp|jpg|gif>" in the private letter-images bucket, checked by the love-letters function.
ALTER TABLE "public"."love_letters" ADD COLUMN IF NOT EXISTS "photo_path" "text";

-- Storage: the letter-images bucket is private. Photos are only read through links the love-letters function signs
-- for the two people in the letter's relationship, and they stop working after an hour.
INSERT INTO "storage"."buckets" ("id", "name", "public", "file_size_limit", "allowed_mime_types")
  VALUES ('letter-images', 'letter-images', false, 2097152, ARRAY['image/webp', 'image/jpeg', 'image/gif'])
  ON CONFLICT ("id") DO UPDATE
    SET "public" = false,
        "file_size_limit" = 2097152,
        "allowed_mime_types" = ARRAY['image/webp', 'image/jpeg', 'image/gif'];

-- The bucket's older rules were made by hand and only checked that someone was signed in. Their names aren't
-- known, so drop every rule that mentions the bucket.
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT "policyname" FROM "pg_policies"
    WHERE "schemaname" = 'storage' AND "tablename" = 'objects'
      AND (coalesce("qual", '') || coalesce("with_check", '')) LIKE '%letter-images%'
  LOOP
    EXECUTE format('DROP POLICY %I ON "storage"."objects"', p."policyname");
  END LOOP;
END $$;

-- Browsers may only add new photos to their own folder. Nobody reads, lists, overwrites or deletes through the
-- browser; the functions do that with the service role.
CREATE POLICY "Users can upload their own letter photos" ON "storage"."objects" FOR INSERT TO "authenticated"
  WITH CHECK ((("bucket_id" = 'letter-images'::"text") AND (("storage"."foldername"("name"))[1] = (( SELECT "auth"."uid"() AS "uid"))::"text")));
