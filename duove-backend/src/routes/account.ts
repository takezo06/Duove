import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth';
import { createUserClient } from '../config/supabase';
import { createServiceClient } from '../config/supabaseAdmin';
import { logger } from '../config/logger';

const router = Router();
router.use(authMiddleware);

// DELETE /api/account – delete own account (WARNING: irreversible)
router.delete('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const supabaseAdmin = createServiceClient();

    // Delete the auth user (this also removes the profile via CASCADE if set up)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
      logger.error('Error deleting auth user', { userId, error: authError });
      return res.status(500).json({ error: authError.message });
    }

    // Optionally delete user's data explicitly (cravings, letters, etc.)
    // But if you have ON DELETE CASCADE on your tables, this is unnecessary.
    // We'll assume you have cascading deletes; if not, add manual deletes here.

    logger.info('User account deleted', { userId });
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
