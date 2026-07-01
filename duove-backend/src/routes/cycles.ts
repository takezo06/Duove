import { Router, Request, Response, NextFunction } from 'express';
import { createUserClient } from '../config/supabase';
import { logger } from '../config/logger';
import { authMiddleware } from '../middleware/auth';
import {
  logCycle,
  getCycleLogs,
  getLatestCycle,
  predictNextCycle,
} from '../services/cycleService';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * Helper function to check if user can track cycles.
 */
async function canTrackCycles(
  supabase: any,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('can_track_cycles')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.can_track_cycles === true;
}

/**
 * GET /api/cycles
 * Get all cycle logs for the authenticated user.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const supabase = createUserClient(req.token!);
    const cycles = await getCycleLogs(supabase, userId);
    res.status(200).json(cycles);
  } catch (error) {
    logger.error('GET /api/cycles error', { error });
    next(error);
  }
});

/**
 * GET /api/cycles/latest
 * Get the most recent cycle log.
 */
router.get('/latest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const supabase = createUserClient(req.token!);
    const cycle = await getLatestCycle(supabase, userId);
    
    if (!cycle) {
      res.status(404).json({ error: 'No cycles found' });
      return;
    }
    
    res.status(200).json(cycle);
  } catch (error) {
    logger.error('GET /api/cycles/latest error', { error });
    next(error);
  }
});

/**
 * GET /api/cycles/predict
 * Get the predicted next cycle start date.
 */
router.get('/predict', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const supabase = createUserClient(req.token!);
    const prediction = await predictNextCycle(supabase, userId);
    res.status(200).json(prediction);
  } catch (error) {
    logger.error('GET /api/cycles/predict error', { error });
    next(error);
  }
});

/**
 * POST /api/cycles
 * Log a new cycle.
 * Only allowed if user has can_track_cycles = true.
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { relationshipId, startDate, endDate } = req.body;
    const userId = req.user!.id;

    // Validate required fields
    if (!relationshipId || !startDate || !endDate) {
      res.status(400).json({ error: 'Missing required fields: relationshipId, startDate, endDate' });
      return;
    }

    const supabase = createUserClient(req.token!);

    // Check if user can track cycles
    const canTrack = await canTrackCycles(supabase, userId);
    if (!canTrack) {
      res.status(403).json({ 
        error: 'You do not have permission to track cycles',
        message: 'Please ask your partner to enable cycle tracking for you.'
      });
      return;
    }

    // Log the cycle
    const cycle = await logCycle(
      supabase,
      userId,
      relationshipId,
      startDate,
      endDate
    );

    res.status(201).json(cycle);
  } catch (error) {
    logger.error('POST /api/cycles error', { error });
    next(error);
  }
});

export default router;
