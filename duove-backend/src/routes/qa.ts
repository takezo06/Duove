import { Router, Request, Response, NextFunction } from 'express';
import { createUserClient } from '../config/supabase';
import { logger } from '../config/logger';
import { authMiddleware } from '../middleware/auth';
import { dailyLimitMiddleware } from '../middleware/dailyLimit';
import { incrementDailyUsage } from '../services/limitService';
import {
  getCurrentPrompt,
  submitAnswer,
  getAnswersForPrompt,
  haveBothAnswered,
} from '../services/qaService';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/qa/current
 * Get the current week's prompt.
 */
router.get('/current', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const supabase = createUserClient(req.token!);
    const prompt = await getCurrentPrompt(supabase, today);

    if (!prompt) {
      res.status(404).json({ error: 'No prompt assigned for this week' });
      return;
    }

    res.status(200).json(prompt);
  } catch (error) {
    logger.error('GET /api/qa/current error', { error });
    next(error);
  }
});

/**
 * GET /api/qa/answers
 * Get answers for the current prompt (with reveal logic).
 * Query params: promptId, relationshipId
 */
router.get('/answers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { promptId, relationshipId } = req.query;
    const userId = req.user!.id;

    if (!promptId || !relationshipId) {
      res.status(400).json({ error: 'promptId and relationshipId are required' });
      return;
    }

    const supabase = createUserClient(req.token!);
    const result = await getAnswersForPrompt(
      supabase,
      promptId as string,
      relationshipId as string,
      userId
    );

    res.status(200).json(result);
  } catch (error) {
    logger.error('GET /api/qa/answers error', { error });
    next(error);
  }
});

/**
 * POST /api/qa/submit
 * Submit an answer to the current prompt (enforces daily limit: 5 Q&A/day).
 */
router.post(
  '/submit',
  dailyLimitMiddleware('qa'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { promptId, relationshipId, partnerId, answerText, imageUrl } = req.body;
      const userId = req.user!.id;

      // Validation
      if (!promptId || !relationshipId || !partnerId || !answerText) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      if (answerText.trim().length === 0) {
        res.status(400).json({ error: 'Answer cannot be empty' });
        return;
      }

      const supabase = createUserClient(req.token!);

      // Check if user already answered this prompt
      const { data: existing } = await supabase
        .from('qa_answers')
        .select('id')
        .eq('prompt_id', promptId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        res.status(400).json({ error: 'You have already answered this prompt' });
        return;
      }

      // Submit the answer
      const answer = await submitAnswer(
        supabase,
        promptId,
        relationshipId,
        userId,
        partnerId,
        answerText,
        imageUrl || null
      );

      // Increment daily usage
      await incrementDailyUsage(supabase, userId, 'qa');

      // Check if both have now answered
      const bothAnswered = await haveBothAnswered(supabase, promptId, relationshipId);

      res.status(201).json({
        answer,
        bothAnswered,
        message: bothAnswered
          ? 'Both partners have answered! Answers will reveal in 24 hours.'
          : 'Answer submitted! Waiting for your partner.',
      });
    } catch (error) {
      logger.error('POST /api/qa/submit error', { error });
      next(error);
    }
  }
);

export default router;
