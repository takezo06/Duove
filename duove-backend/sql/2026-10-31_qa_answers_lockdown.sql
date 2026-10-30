-- Only the qa edge function (service role) may read or write qa_answers.
-- It keeps a partner's answer hidden until you've sent yours.
DROP POLICY IF EXISTS "Users can view answers in their relationship" ON "public"."qa_answers";
DROP POLICY IF EXISTS "Users can insert their own answers" ON "public"."qa_answers";
