import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { createSupabaseClients } from "../_shared/supabase.ts";
import { getUserId } from "../_shared/auth.ts";
import { answerWindow, answersFor, clock, pickQuestion } from "./day.mts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();

  const { admin } = createSupabaseClients(req);
  const userId = await getUserId(req);
  if (!userId) return json({ error: "Unauthorized" }, 401);

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/qa/, "").replace(/\/+$/, "") || "/";
  // "Today" is the caller's local day, so the question turns over at their midnight.
  const { today, secondsUntilNext } = clock(url.searchParams.get("tz"));

  const must = <T>({ data, error }: { data: T; error: unknown }) => {
    if (error) throw error;
    return data;
  };

  async function getActiveRelationship() {
    return must(
      await admin
        .from("relationships")
        .select("*")
        .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
        .eq("status", "active")
        .maybeSingle(),
    );
  }

  function getPartnerId(rel: any) {
    return rel.user_id === userId ? rel.partner_id : rel.user_id;
  }

  async function pickFor(rel: any, exclude?: string) {
    const all = must(await admin.from("qa_questions").select("*").eq("is_active", true)) ?? [];
    const used = must(
      await admin
        .from("qa_assignments")
        .select("question_id, assigned_date")
        .eq("relationship_id", rel.id)
        .order("assigned_date", { ascending: false }),
    ) ?? [];
    const preferred = rel.preferred_category_id
      ? all.filter((q: any) => q.category_id === rel.preferred_category_id)
      : all;
    // An empty or exhausted category falls back to every question.
    return pickQuestion(preferred, used, exclude) ?? pickQuestion(all, used, exclude);
  }

  async function findToday(rel: any) {
    return must(
      await admin
        .from("qa_assignments")
        .select("*, qa_questions(*)")
        .eq("relationship_id", rel.id)
        .eq("assigned_date", today)
        // No unique (relationship_id, assigned_date) constraint yet: if two requests raced and
        // both inserted, the oldest row is today's question for everyone.
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    );
  }

  async function getOrCreateToday(rel: any) {
    const existing = await findToday(rel);
    if (existing) return existing;
    const question = await pickFor(rel);
    if (!question) return null;
    // Re-read instead of trusting our insert, so racing requests agree on the same row.
    await admin
      .from("qa_assignments")
      .insert({ question_id: question.id, relationship_id: rel.id, assigned_date: today });
    return await findToday(rel);
  }

  async function answersOf(rel: any, assignment: any) {
    const { from, to } = answerWindow(assignment.assigned_date);
    return must(
      await admin
        .from("qa_answers")
        .select("*")
        .eq("relationship_id", rel.id)
        .eq("question_id", assignment.question_id)
        .gte("submitted_at", from)
        .lt("submitted_at", to),
    ) ?? [];
  }

  async function reassign(rel: any, assignment: any) {
    const next = await pickFor(rel, assignment.question_id);
    if (!next) return null;
    must(
      await admin
        .from("qa_assignments")
        .update({ question_id: next.id, revealed_at: null })
        .eq("id", assignment.id),
    );
    return next;
  }

  try {
    // GET /qa/current
    if (path === "/current" && req.method === "GET") {
      const rel = await getActiveRelationship();
      if (!rel) return json({ error: "No active relationship" }, 404);
      const assignment = await getOrCreateToday(rel);
      if (!assignment) return json({ error: "No questions available" }, 404);

      const answers = await answersOf(rel, assignment);
      const yourAnswer = answers.find((a: any) => a.user_id === userId) ?? null;
      const partnerAnswer = answers.find((a: any) => a.user_id !== userId) ?? null;
      const bothAnswered = !!yourAnswer && !!partnerAnswer;
      if (bothAnswered && !assignment.revealed_at) {
        assignment.revealed_at = new Date().toISOString();
        must(await admin.from("qa_assignments").update({ revealed_at: assignment.revealed_at }).eq("id", assignment.id));
      }
      const partner = must(
        await admin.from("profiles").select("display_name").eq("id", getPartnerId(rel)).maybeSingle(),
      );
      return json({
        assignment,
        question: assignment.qa_questions,
        yourAnswer,
        partnerAnswer: bothAnswered ? partnerAnswer : null,
        partnerAnswered: !!partnerAnswer,
        bothAnswered,
        revealed: bothAnswered,
        partnerName: partner?.display_name || "Partner",
        nextQuestionAvailableIn: secondsUntilNext,
        preferredCategoryId: rel.preferred_category_id,
      });
    }

    // GET /qa/categories
    if (path === "/categories" && req.method === "GET") {
      return json(must(await admin.from("qa_categories").select("*").order("name", { ascending: true })) ?? []);
    }

    // POST /qa/submit
    if (path === "/submit" && req.method === "POST") {
      const { question_id, answer_text, image_url } = await req.json();
      if (!question_id || !answer_text?.trim()) {
        return json({ error: "question_id and answer_text required" }, 400);
      }
      const rel = await getActiveRelationship();
      if (!rel) return json({ error: "No active relationship" }, 404);
      const assignment = await getOrCreateToday(rel);
      if (!assignment || assignment.question_id !== question_id) {
        return json({ error: "There's a new question for today. Refresh to see it." }, 409);
      }
      const answers = await answersOf(rel, assignment);
      if (answers.some((a: any) => a.user_id === userId)) {
        return json({ error: "You have already answered this question" }, 400);
      }
      const answer = must(
        await admin
          .from("qa_answers")
          // qa_answers is unique on (question_id, relationship_id, user_id), so a question that
          // comes around again replaces your answer from last time.
          .upsert({
            question_id,
            relationship_id: rel.id,
            user_id: userId,
            partner_id: getPartnerId(rel),
            answer_text: answer_text.trim(),
            image_url: image_url || null,
            submitted_at: new Date().toISOString(),
            revealed_at: null,
          }, { onConflict: "question_id,relationship_id,user_id" })
          .select()
          .single(),
      );
      const bothAnswered = answers.length > 0;
      return json({
        answer,
        bothAnswered,
        message: bothAnswered ? "You both answered. Your answers are revealed." : "Answer submitted. Waiting for your partner.",
      }, 201);
    }

    // POST /qa/skip: swap today's question, only while nobody has answered it.
    if (path === "/skip" && req.method === "POST") {
      const rel = await getActiveRelationship();
      if (!rel) return json({ error: "No active relationship" }, 404);
      const assignment = await getOrCreateToday(rel);
      if (!assignment) return json({ error: "No active question to skip" }, 404);
      if ((await answersOf(rel, assignment)).length) {
        return json({ error: "One of you already answered, so this question can't be skipped." }, 409);
      }
      if (!(await reassign(rel, assignment))) return json({ error: "No other questions available" }, 404);
      return json({ message: "Question skipped. Here's a new one." });
    }

    // PATCH /qa/preferred-category: also swaps today's question if it's unanswered and off-category.
    if (path === "/preferred-category" && req.method === "PATCH") {
      const { category_id } = await req.json();
      const rel = await getActiveRelationship();
      if (!rel) return json({ error: "No active relationship" }, 404);
      rel.preferred_category_id = category_id || null;
      must(await admin.from("relationships").update({ preferred_category_id: rel.preferred_category_id }).eq("id", rel.id));
      const assignment = rel.preferred_category_id && await findToday(rel);
      if (
        assignment &&
        assignment.qa_questions?.category_id !== rel.preferred_category_id &&
        !(await answersOf(rel, assignment)).length
      ) {
        await reassign(rel, assignment);
      }
      return json({ message: "Preferred category updated" });
    }

    // GET /qa/history?cursor=<assigned_date>&limit=20
    if (path === "/history" && req.method === "GET") {
      const limit = Number(url.searchParams.get("limit")) || 20;
      const cursor = url.searchParams.get("cursor");
      const rel = await getActiveRelationship();
      if (!rel) return json({ error: "No active relationship" }, 404);

      let query = admin
        .from("qa_assignments")
        .select("id, question_id, assigned_date, revealed_at, qa_questions(*)")
        .eq("relationship_id", rel.id)
        .order("assigned_date", { ascending: false })
        .limit(limit + 1);
      if (cursor) query = query.lt("assigned_date", cursor);
      const assignments = must(await query) ?? [];
      const hasMore = assignments.length > limit;
      const page = assignments.slice(0, limit);

      const answers = page.length
        ? must(
          await admin
            .from("qa_answers")
            .select("*")
            .eq("relationship_id", rel.id)
            .in("question_id", page.map((a: any) => a.question_id)),
        ) ?? []
        : [];

      const items = page.map((a: any) => {
        const mine = answersFor(a, answers);
        const your = mine.find((x: any) => x.user_id === userId) ?? null;
        const partner = mine.find((x: any) => x.user_id !== userId) ?? null;
        const both = !!your && !!partner;
        return {
          id: a.id,
          assigned_date: a.assigned_date,
          revealed_at: a.revealed_at,
          question: { id: a.qa_questions?.id, question_text: a.qa_questions?.question_text, category_id: a.qa_questions?.category_id },
          your_answer: your && { answer_text: your.answer_text, submitted_at: your.submitted_at },
          // Partner's text stays hidden until you've answered too.
          partner_answer: partner && (both
            ? { answer_text: partner.answer_text, submitted_at: partner.submitted_at }
            : { answer_text: null, submitted_at: partner.submitted_at }),
          both_answered: both,
        };
      });

      return json({ items, hasMore, nextCursor: hasMore ? page[page.length - 1].assigned_date : null });
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    // Supabase errors are plain objects, so pull the message out explicitly.
    const message = (err as any)?.message ?? String(err);
    console.error("qa function failed", req.method, path, JSON.stringify(err));
    return json({ error: `Something went wrong: ${message}` }, 500);
  }
});
