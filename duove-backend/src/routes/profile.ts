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

    let { data: profile, error } = await supabase
      .from('profiles')
      .select('display_name, avatar_url, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      logger.error('Error fetching profile', { error });
      return res.status(500).json({ error: error.message });
    }

    // If no profile exists, create one
    if (!profile) {
      const meta = req.user?.user_metadata || {};
      const displayName = meta.full_name || meta.name || meta.username || req.user.email?.split('@')[0] || 'User';
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({ id: userId, display_name: displayName })
        .select()
        .single();
      if (insertError) {
        logger.error('Error creating default profile', { error: insertError });
        return res.status(500).json({ error: insertError.message });
      }
      profile = newProfile;
    }

    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/profile – using upsert
router.patch('/', async (req, res, next) => {
  try {
    const { display_name, avatar_url } = req.body;
    const supabase = createUserClient(req.token!);
    const userId = req.user!.id;

    const updateData: any = { id: userId };
    if (display_name !== undefined) updateData.display_name = display_name;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

    const { data: profile, error } = await supabase
      .from('profiles')
      .upsert(updateData, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      logger.error('Error upserting profile', { error });
      return res.status(500).json({ error: error.message });
    }

    res.json(profile);
  } catch (err) {
    next(err);
  }
});

export default router;
