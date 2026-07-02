import { incrementDailyUsage } from '../services/limitService';
import { Router, Request, Response, NextFunction } from 'express';
import { createUserClient } from '../config/supabase';
import { logger } from '../config/logger';
import {
  getCravings,
  createCraving,
  toggleCraving,
  deleteCraving,
} from '../services/cravingsService';
import { authMiddleware } from '../middleware/auth';
import { dailyLimitMiddleware } from '../middleware/dailyLimit';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/cravings
 * Fetch all cravings for the user's active relationship.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Fetch the user's active relationship ID from the database.
    // For now, we assume it's passed or we'll hardcode a placeholder.
    // We'll properly implement relationship fetching in Phase 2 refinement.
    // Right now, we expect the frontend to pass ?relationshipId=xxx
    const relationshipId = req.query.relationshipId as string;
    if (!relationshipId) {
      res.status(400).json({ error: 'relationshipId query param is required' });
      return;
    }

    const supabase = createUserClient(req.token!);
    const cravings = await getCravings(supabase, relationshipId);
    res.status(200).json(cravings);
  } catch (error) {
    logger.error('GET /api/cravings error', { error });
    next(error);
  }
});

/**
 * POST /api/cravings
 * Create a new craving (enforces daily limit: 5 per user per day).
 */
router.post(
  '/',
  dailyLimitMiddleware('craving'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { relationshipId, partnerId, content } = req.body;
      const userId = req.user!.id;

      if (!relationshipId || !partnerId || !content) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      if (content.trim().length === 0) {
        res.status(400).json({ error: 'Content cannot be empty' });
        return;
      }

      const supabase = createUserClient(req.token!);
      await incrementDailyUsage(supabase, userId, 'craving'); 
      const craving = await createCraving(
        supabase,
        relationshipId,
        userId,
        partnerId,
        content
      );

      res.status(201).json(craving);
    } catch (error) {
      logger.error('POST /api/cravings error', { error });
      next(error);
    }
  }
);

/**
 * PATCH /api/cravings/:id/toggle
 * Toggle the fulfilled status of a craving.
 */
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

/**
 * DELETE /api/cravings/:id
 * Delete a craving (only creator).
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cravingId = req.params.id as string;
    const userId = req.user!.id;

    const supabase = createUserClient(req.token!);
    await deleteCraving(supabase, cravingId, userId);
    res.status(204).send(); // No content
  } catch (error) {
    logger.error('DELETE /api/cravings/:id error', { error });
    next(error);
  }
});

export default router;
