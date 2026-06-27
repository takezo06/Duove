import { Request, Response, NextFunction } from 'express';
import { createUserClient } from '../config/supabase';
import { checkDailyLimit, LimitType } from '../services/limitService';
import { logger } from '../config/logger';

/**
 * Factory middleware that enforces daily limits for a given action type.
 * Expects `authMiddleware` to have run first (so `req.user` and `req.token` exist).
 * Returns 429 if the limit is exceeded, otherwise passes control.
 */
export const dailyLimitMiddleware = (type: LimitType) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Ensure authentication data is present
      if (!req.user || !req.token) {
        res.status(401).json({ error: 'Authentication required before checking limits' });
        return;
      }

      // 2. Create a user‑scoped Supabase client using the JWT
      const supabase = createUserClient(req.token);

      // 3. Check the daily limit
      const result = await checkDailyLimit(supabase, req.user.id, type);

      // 4. If not allowed, return 429 with details
      if (!result.allowed) {
        res.status(429).json({
          error: 'Daily limit exceeded',
          message: `You have reached your daily limit of ${result.limit} ${type}(s).`,
          current: result.current,
          limit: result.limit,
          resetAt: result.resetAt,
        });
        return;
      }

      // 5. (Optional) Attach limit info to the request for downstream use
      (req as any).limitInfo = result;

      // 6. Proceed
      next();
    } catch (error) {
      logger.error('Daily limit middleware error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        type,
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};
