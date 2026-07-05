import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { createUserClient } from '../config/supabase';
import { logger } from '../config/logger';

const router = Router();
router.use(authMiddleware);

// GET /api/notifications
router.get('/', async (req, res, next) => {
  try {
    const supabase = createUserClient(req.token!);
    const userId = req.user!.id;

    // 1. Get the user's active relationship
    const { data: relationship, error: relError } = await supabase
      .from('relationships')
      .select('id')
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
      .eq('status', 'active')
      .maybeSingle();

    if (relError) {
      logger.error('Error fetching relationship for notifications', { error: relError });
      return res.status(500).json({ error: relError.message });
    }
    if (!relationship) {
      return res.status(404).json({ error: 'No active relationship found' });
    }

    const relationshipId = relationship.id;

    // 2. Fetch recent cravings (by partner)
    const { data: cravings, error: cravingsError } = await supabase
      .from('cravings')
      .select('id, content, fulfilled, user_id, created_at')
      .eq('relationship_id', relationshipId)
      .neq('user_id', userId) // Only partner's actions
      .order('created_at', { ascending: false })
      .limit(20);

    // 3. Fetch recent letters (received)
    const { data: letters, error: lettersError } = await supabase
      .from('letters')
      .select('id, sender_id, created_at')
      .eq('relationship_id', relationshipId)
      .neq('sender_id', userId) // Only received letters
      .order('created_at', { ascending: false })
      .limit(20);

    // 4. Fetch recent QA answers (by partner)
    const { data: qaAnswers, error: qaError } = await supabase
      .from('qa_answers')
      .select('id, user_id, created_at')
      .eq('relationship_id', relationshipId)
      .neq('user_id', userId) // Only partner's answers
      .order('created_at', { ascending: false })
      .limit(20);

    // 5. Format notifications
    const notifications: any[] = [];

    // Map cravings
    cravings?.forEach((c: any) => {
      notifications.push({
        id: `craving_${c.id}`,
        type: c.fulfilled ? 'craving_fulfilled' : 'craving_added',
        message: c.fulfilled
          ? `Partner fulfilled a craving: "${c.content}"`
          : `Partner added a craving: "${c.content}"`,
        created_at: c.created_at,
      });
    });

    // Map letters
    letters?.forEach((l: any) => {
      notifications.push({
        id: `letter_${l.id}`,
        type: 'letter_received',
        message: `Partner sent you a letter 💌`,
        created_at: l.created_at,
      });
    });

    // Map QA answers
    qaAnswers?.forEach((q: any) => {
      notifications.push({
        id: `qa_${q.id}`,
        type: 'qa_answered',
        message: `Partner answered the daily Q&A`,
        created_at: q.created_at,
      });
    });

    // 6. Sort by created_at descending
    notifications.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // 7. Limit to 50
    res.json(notifications.slice(0, 50));
  } catch (error) {
    logger.error('Error fetching notifications', { error });
    next(error);
  }
});

export default router;
