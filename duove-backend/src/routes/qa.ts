import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth';
import { createUserClient } from '../config/supabase';
import { createServiceClient } from '../config/supabaseAdmin';
import { logger } from '../config/logger';
import { dailyLimitMiddleware } from '../middleware/dailyLimit';
import { incrementDailyUsage } from '../services/limitService';

const router = Router();
router.use(authMiddleware);

// ---- Helper: get or create today's assignment ----
async function getOrCreateTodayAssignment(
  supabase: any,
  supabaseAdmin: any,
  relationshipId: string,
  preferredCategoryId: string | null = null
) {
  const today = new Date().toISOString().split('T')[0];

  // 1. Check if there's already an assignment for today
  let { data: assignment, error } = await supabase
    .from('qa_assignments')
    .select('*, qa_questions(*)')
    .eq('relationship_id', relationshipId)
    .eq('assigned_date', today)
    .maybeSingle();

  if (assignment) return assignment;

  // 2. No assignment yet – create one
  let query = supabaseAdmin
    .from('qa_questions')
    .select('*')
    .eq('is_active', true);

  if (preferredCategoryId) {
    query = query.eq('category_id', preferredCategoryId);
  }

  // Avoid recent questions (last 10)
  const { data: usedQuestions } = await supabase
    .from('qa_assignments')
    .select('question_id')
    .eq('relationship_id', relationshipId)
    .order('assigned_date', { ascending: false })
    .limit(10);

  const usedIds = usedQuestions?.map((q: any) => q.question_id) || [];
  if (usedIds.length > 0) {
    query = query.not('id', 'in', `(${usedIds.join(',')})`);
  }

  const { data: available, error: availError } = await query.limit(1);

  let question;
  if (availError || !available || available.length === 0) {
    // Fallback: get any active question
    const { data: fallback, error: fbError } = await supabaseAdmin
      .from('qa_questions')
      .select('*')
      .eq('is_active', true)
      .limit(1);
    if (fbError || !fallback || fallback.length === 0) {
      throw new Error('No questions available');
    }
    question = fallback[0];
  } else {
    question = available[0];
  }

  const { data: newAssignment, error: insertError } = await supabaseAdmin
    .from('qa_assignments')
    .insert({
      question_id: question.id,
      relationship_id: relationshipId,
      assigned_date: today,
    })
    .select('*, qa_questions(*)')
    .single();

  if (insertError) throw insertError;
  return newAssignment;
}

// ---- GET /api/qa/current ----
router.get('/current', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = createUserClient(req.token!);
    const supabaseAdmin = createServiceClient();
    const userId = req.user!.id;

    const { data: relationship, error: relError } = await supabase
      .from('relationships')
      .select('id, user_id, partner_id, preferred_category_id')
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
      .eq('status', 'active')
      .maybeSingle();

    if (relError || !relationship) {
      return res.status(404).json({ error: 'No active relationship found' });
    }

    // Check if today's assignment exists; if not, create it
    const assignment = await getOrCreateTodayAssignment(
      supabase,
      supabaseAdmin,
      relationship.id,
      relationship.preferred_category_id
    );

    // Get answers for this assignment
    const { data: answers, error: ansError } = await supabase
      .from('qa_answers')
      .select('*')
      .eq('question_id', assignment.question_id)
      .eq('relationship_id', relationship.id);

    if (ansError) {
      logger.error('Error fetching answers', { error: ansError });
      return res.status(500).json({ error: ansError.message });
    }

    const yourAnswer = answers?.find((a: any) => a.user_id === userId) || null;
    const partnerAnswer = answers?.find((a: any) => a.user_id !== userId) || null;
    const bothAnswered = answers?.length === 2;

    // Reveal automatically if both answered and not yet revealed
    let revealed = assignment.revealed_at !== null;
    if (bothAnswered && !revealed) {
      // Reveal immediately
      const { error: updateError } = await supabaseAdmin
        .from('qa_assignments')
        .update({ revealed_at: new Date().toISOString() })
        .eq('id', assignment.id);
      if (!updateError) {
        revealed = true;
        assignment.revealed_at = new Date().toISOString();
      }
    }

    // Compute next available time (midnight)
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const secondsUntilNext = Math.floor((nextMidnight.getTime() - now.getTime()) / 1000);

    // Partner name
    const partnerId = relationship.user_id === userId ? relationship.partner_id : relationship.user_id;
    const { data: partnerData } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', partnerId)
      .maybeSingle();

    res.json({
      assignment,
      question: assignment.qa_questions,
      answers,
      yourAnswer,
      partnerAnswer: bothAnswered && revealed ? partnerAnswer : null,
      bothAnswered,
      revealed,
      partnerName: partnerData?.display_name || 'Partner',
      nextQuestionAvailableIn: secondsUntilNext,
      preferredCategoryId: relationship.preferred_category_id,
    });
  } catch (err) {
    next(err);
  }
});

// ---- POST /api/qa/submit ----
router.post('/submit', dailyLimitMiddleware('qa'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { question_id, answer_text, image_url } = req.body;
    if (!question_id || !answer_text) {
      return res.status(400).json({ error: 'question_id and answer_text required' });
    }

    const supabase = createUserClient(req.token!);
    const userId = req.user!.id;

    const { data: relationship, error: relError } = await supabase
      .from('relationships')
      .select('id, user_id, partner_id')
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
      .eq('status', 'active')
      .maybeSingle();

    if (relError || !relationship) {
      return res.status(404).json({ error: 'No active relationship found' });
    }

    const partnerId = relationship.user_id === userId ? relationship.partner_id : relationship.user_id;

    const { data: existing, error: existError } = await supabase
      .from('qa_answers')
      .select('id')
      .eq('question_id', question_id)
      .eq('relationship_id', relationship.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: 'You have already answered this question' });
    }

    const { data: answer, error: ansError } = await supabase
      .from('qa_answers')
      .insert({
        question_id,
        relationship_id: relationship.id,
        user_id: userId,
        partner_id: partnerId,
        answer_text: answer_text.trim(),
        image_url: image_url || null,
      })
      .select()
      .single();

    if (ansError) {
      logger.error('Error submitting answer', { error: ansError });
      return res.status(500).json({ error: ansError.message });
    }

    await incrementDailyUsage(supabase, userId, 'qa');

    const { count, error: countError } = await supabase
      .from('qa_answers')
      .select('*', { count: 'exact', head: true })
      .eq('question_id', question_id)
      .eq('relationship_id', relationship.id);

    const bothAnswered = count === 2;

    if (bothAnswered) {
      logger.info('Both partners have answered question', { question_id, relationshipId: relationship.id });
    }

    res.json({
      answer,
      bothAnswered,
      message: bothAnswered
        ? 'Both partners have answered. Answers will reveal in 24 hours.'
        : 'Answer submitted. Waiting for your partner.',
    });
  } catch (err) {
    next(err);
  }
});

// ---- POST /api/qa/skip ----
router.post('/skip', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = createUserClient(req.token!);
    const supabaseAdmin = createServiceClient();
    const userId = req.user!.id;

    const { data: relationship, error: relError } = await supabase
      .from('relationships')
      .select('id')
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
      .eq('status', 'active')
      .maybeSingle();

    if (relError || !relationship) {
      return res.status(404).json({ error: 'No active relationship found' });
    }

    const today = new Date().toISOString().split('T')[0];

    const { data: assignment, error: assignError } = await supabase
      .from('qa_assignments')
      .select('id')
      .eq('relationship_id', relationship.id)
      .eq('assigned_date', today)
      .is('skipped_at', null)
      .maybeSingle();

    if (assignError || !assignment) {
      return res.status(404).json({ error: 'No active question to skip' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('qa_assignments')
      .update({
        skipped_at: new Date().toISOString(),
        skipped_by: userId,
      })
      .eq('id', assignment.id);

    if (updateError) {
      logger.error('Error skipping question', { error: updateError });
      return res.status(500).json({ error: updateError.message });
    }

    res.json({ message: 'Question skipped. A new one will be assigned.' });
  } catch (err) {
    next(err);
  }
});


// ---- PATCH /api/qa/preferred-category ----
router.patch('/preferred-category', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category_id } = req.body;
    const supabase = createUserClient(req.token!);
    const userId = req.user!.id;

    const { data: relationship, error: relError } = await supabase
      .from('relationships')
      .select('id')
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
      .eq('status', 'active')
      .maybeSingle();

    if (relError || !relationship) {
      return res.status(404).json({ error: 'No active relationship found' });
    }

    const { error: updateError } = await supabase
      .from('relationships')
      .update({ preferred_category_id: category_id || null })
      .eq('id', relationship.id);

    if (updateError) {
      logger.error('Error updating preferred category', { error: updateError });
      return res.status(500).json({ error: updateError.message });
    }

    res.json({ message: 'Preferred category updated' });
  } catch (err) {
    next(err);
  }
});

// GET /api/qa/history?limit=20&offset=0
router.get('/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const supabase = createUserClient(req.token!);
    const userId = req.user!.id;

    // Get relationship
    const { data: relationship, error: relError } = await supabase
      .from('relationships')
      .select('id')
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
      .eq('status', 'active')
      .maybeSingle();

    if (relError || !relationship) {
      return res.status(404).json({ error: 'No active relationship found' });
    }

    // Fetch assignments with question and answers (joined)
    // We can use a single query with nested selects
    const { data: assignments, error, count } = await supabase
      .from('qa_assignments')
      .select(`
        id,
        assigned_date,
        revealed_at,
        qa_questions (*),
        qa_answers!inner (
          id,
          user_id,
          partner_id,
          answer_text,
          image_url,
          submitted_at,
          revealed_at
        )
      `, { count: 'exact' })
      .eq('relationship_id', relationship.id)
      .not('revealed_at', 'is', null) // only revealed assignments
      .order('assigned_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Error fetching history', { error });
      return res.status(500).json({ error: error.message });
    }

    // We also need the partner's display name for each answer, but we can fetch separately or include in query.
    // For simplicity, we'll fetch partner names in a separate query for all partner ids.
    // We'll extract all partner ids from answers.
    const partnerIds = new Set<string>();
    assignments?.forEach((a: any) => {
      a.qa_answers?.forEach((ans: any) => {
        if (ans.user_id !== userId) partnerIds.add(ans.user_id);
        if (ans.partner_id !== userId) partnerIds.add(ans.partner_id);
      });
    });
    const partnerIdArray = Array.from(partnerIds);
    let partnerNames: Record<string, string> = {};
    if (partnerIdArray.length > 0) {
      const { data: partners, error: partnerError } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', partnerIdArray);
      if (!partnerError) {
        partnerNames = partners.reduce((acc: any, p: any) => {
          acc[p.id] = p.display_name || 'Partner';
          return acc;
        }, {});
      }
    }

    // Format the response
    const formatted = assignments?.map((a: any) => {
      const answers = a.qa_answers || [];
      const yourAnswer = answers.find((ans: any) => ans.user_id === userId);
      const partnerAnswer = answers.find((ans: any) => ans.user_id !== userId);
      return {
        id: a.id,
        assigned_date: a.assigned_date,
        revealed_at: a.revealed_at,
        question: a.qa_questions,
        yourAnswer: yourAnswer ? {
          answer_text: yourAnswer.answer_text,
          image_url: yourAnswer.image_url,
          submitted_at: yourAnswer.submitted_at,
        } : null,
        partnerAnswer: partnerAnswer ? {
          answer_text: partnerAnswer.answer_text,
          image_url: partnerAnswer.image_url,
          submitted_at: partnerAnswer.submitted_at,
          partner_name: partnerNames[partnerAnswer.user_id] || 'Partner',
        } : null,
      };
    });

    res.json({
      data: formatted,
      count: count || 0,
      limit,
      offset,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
