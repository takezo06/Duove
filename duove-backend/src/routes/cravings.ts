import { Router, Request, Response, NextFunction } from 'express';
import { createUserClient } from '../config/supabase';
import { logger } from '../config/logger';
import { authMiddleware } from '../middleware/auth';
import { dailyLimitMiddleware } from '../middleware/dailyLimit';
import { incrementDailyUsage } from '../services/limitService';
import {
  getCravings,
  createCraving,
  toggleCraving,
  deleteCraving,
} from '../services/cravingsService';

const router = Router();
router.use(authMiddleware);

// GET /api/cravings?relationshipId=...
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const relationshipId = req.query.relationshipId as string;
    if (!relationshipId) {
      return res.status(400).json({ error: 'relationshipId query param is required' });
    }

    const supabase = createUserClient(req.token!);
    const cravings = await getCravings(supabase, relationshipId);
    res.status(200).json(cravings);
  } catch (error) {
    logger.error('GET /api/cravings error', { error });
    next(error);
  }
});

// POST /api/cravings
router.post(
  '/',
  dailyLimitMiddleware('craving'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { relationshipId, partnerId, content, category } = req.body;
      const userId = req.user!.id;

      if (!relationshipId || !partnerId || !content) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      if (content.trim().length === 0) {
        return res.status(400).json({ error: 'Content cannot be empty' });
      }

      const supabase = createUserClient(req.token!);
      const craving = await createCraving(
        supabase,
        relationshipId,
        userId,
        partnerId,
        content,
        category || 'Other'
      );

      await incrementDailyUsage(supabase, userId, 'craving');

      res.status(201).json(craving);
    } catch (error) {
      logger.error('POST /api/cravings error', { error });
      next(error);
    }
  }
);

// PATCH /api/cravings/:id/toggle
router.patch('/:id/toggle', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cravingId = req.params.id as string;
    const userId = req.user!.id;
    const supabase = createUserClient(req.token!);
    const updated = await toggleCraving(supabase, cravingId, userId);
    res.status(200).json(updated);
  } catch (error) {
    logger.error('PATCH /api/cravings/:id/toggle error', { error });
    next(error);
  }
});

// DELETE /api/cravings/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cravingId = req.params.id as string;
    const userId = req.user!.id;
    const supabase = createUserClient(req.token!);
    await deleteCraving(supabase, cravingId, userId);
    res.status(204).send();
  } catch (error) {
    logger.error('DELETE /api/cravings/:id error', { error });
    next(error);
  }
});

export default router;
