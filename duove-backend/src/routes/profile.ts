import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { createUserClient } from '../config/supabase';
import { logger } from '../config/logger';

const router = Router();
router.use(authMiddleware);

// GET /api/profile
router.get('/', async (req, res, next) => {
  try {
    const supabase = createUserClient(req.token!);
    const userId = req.user!.id;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('display_name, avatar_url, created_at')
      .eq('id', userId)
      .single();

    if (error) {
      logger.error('Error fetching profile', { error });
      return res.status(500).json({ error: error.message });
    }

    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/profile
router.patch('/', async (req, res, next) => {
  try {
    const { display_name, avatar_url } = req.body;
    const supabase = createUserClient(req.token!);
    const userId = req.user!.id;

    const updateData: any = {};
    if (display_name !== undefined) updateData.display_name = display_name;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating profile', { error });
      return res.status(500).json({ error: error.message });
    }

    res.json(profile);
  } catch (err) {
    next(err);
  }
});

export default router;
