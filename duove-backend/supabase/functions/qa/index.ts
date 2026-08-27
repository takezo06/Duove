import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { createSupabaseClients } from "../_shared/supabase.ts";
import { getUserId } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();

  const { admin } = createSupabaseClients(req);
  const userId = await getUserId(req);
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/qa/, "").replace(/\/+$/, "") || "/";

  async function getActiveRelationship() {
    const { data } = await admin
      .from("relationships")
      .select("*")
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
      .eq("status", "active")
      .maybeSingle();
    return data;
  }

  function getPartnerId(rel: any) {
    return rel.user_id === userId ? rel.partner_id : rel.user_id;
  }

  // GET /qa/current
  if (path === "/current" && req.method === "GET") {
    const relationship = await getActiveRelationship();
    if (!relationship) {
      return new Response(JSON.stringify({ error: "No active relationship" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const today = new Date().toISOString().split("T")[0];
    const { data: assignment } = await admin
      .from("qa_assignments")
      .select("*, qa_questions(*)")
      .eq("relationship_id", relationship.id)
      .eq("assigned_date", today)
      .maybeSingle();

    if (assignment) {
      const { data: answers } = await admin
        .from("qa_answers")
        .select("*")
        .eq("question_id", assignment.question_id)
        .eq("relationship_id", relationship.id);
      const yourAnswer = answers?.find(a => a.user_id === userId);
      const partnerAnswer = answers?.find(a => a.user_id !== userId);
      const bothAnswered = answers?.length === 2;
      const revealed = assignment.revealed_at !== null || bothAnswered;
      if (bothAnswered && !assignment.revealed_at) {
        await admin.from("qa_assignments").update({ revealed_at: new Date().toISOString() }).eq("id", assignment.id);
      }
      const { data: partnerProfile } = await admin
        .from("profiles").select("display_name").eq("id", getPartnerId(relationship)).single();
      return new Response(JSON.stringify({
        assignment,
        question: assignment.qa_questions,
        yourAnswer,
        partnerAnswer: revealed ? partnerAnswer : null,
        bothAnswered,
        revealed,
        partnerName: partnerProfile?.display_name || "Partner",
        nextQuestionAvailableIn: 86400,
        preferredCategoryId: relationship.preferred_category_id,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
      const { data: questions } = await admin
        .from("qa_questions").select("*").eq("is_active", true).limit(1);
      if (questions?.length) {
        const { data: newAssignment } = await admin
          .from("qa_assignments")
          .insert({ question_id: questions[0].id, relationship_id: relationship.id, assigned_date: today })
          .select("*, qa_questions(*)").single();
        return new Response(JSON.stringify({ ...newAssignment, yourAnswer: null, partnerAnswer: null, bothAnswered: false, revealed: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "No questions available" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // GET /qa/categories
  if (path === "/categories" && req.method === "GET") {
    const { data } = await admin.from("qa_categories").select("*");
    return new Response(JSON.stringify(data || []), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // POST /qa/submit
  if (path === "/submit" && req.method === "POST") {
    const body = await req.json();
    const { question_id, answer_text } = body;
    const relationship = await getActiveRelationship();
    const { data, error } = await admin
      .from("qa_answers")
      .insert({ question_id, relationship_id: relationship?.id, user_id: userId, answer_text })
      .select().single();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(data), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // POST /qa/skip
  if (path === "/skip" && req.method === "POST") {
    const relationship = await getActiveRelationship();
    const today = new Date().toISOString().split("T")[0];
    await admin
      .from("qa_assignments")
      .update({ skipped_at: new Date().toISOString(), skipped_by: userId })
      .eq("relationship_id", relationship?.id)
      .eq("assigned_date", today);
    return new Response(JSON.stringify({ message: "Skipped" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // PATCH /qa/preferred-category
  if (path === "/preferred-category" && req.method === "PATCH") {
    const { category_id } = await req.json();
    const relationship = await getActiveRelationship();
    await admin
      .from("relationships")
      .update({ preferred_category_id: category_id || null })
      .eq("id", relationship?.id);
    return new Response(JSON.stringify({ message: "Updated" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // GET /qa/history
  if (path === "/history" && req.method === "GET") {
    const relationship = await getActiveRelationship();
    const { data: assignments } = await admin
      .from("qa_assignments")
      .select("*, qa_questions(*), qa_answers(*)")
      .eq("relationship_id", relationship?.id)
      .order("assigned_date", { ascending: false })
      .limit(50);
    return new Response(JSON.stringify({ items: assignments || [], hasMore: false, nextCursor: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
