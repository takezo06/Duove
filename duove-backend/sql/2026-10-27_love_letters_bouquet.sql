-- Flowers can come with a letter. null means a letter without flowers, so existing rows need no backfill.
-- Shape: { "v": 1, "stems": ["tulip", "peony", ...], "wrap": "kraft", "seed": 123 }, checked by the love-letters function.
ALTER TABLE "public"."love_letters" ADD COLUMN IF NOT EXISTS "bouquet" "jsonb";
