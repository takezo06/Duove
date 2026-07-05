import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { createUserClient } from '../config/supabase';
import { createServiceClient } from '../config/supabaseAdmin';
import { logger } from '../config/logger';

const router = Router();
router.use(authMiddleware);

// Helper to ensure a user profile exists
async function ensureProfile(supabase: any, userId: string) {
  const { data: existing, error: checkError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (checkError && checkError.code !== 'PGRST116') {
    throw checkError;
  }

  if (!existing) {
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({ id: userId });
    if (insertError) {
      // Ignore duplicate key errors (race condition)
      if (insertError.code !== '23505') {
        throw insertError;
      }
    }
  }
}

// GET /api/relationships/me
router.get('/me', async (req, res, next) => {
  try {
    const supabase = createUserClient(req.token!);
    const userId = req.user!.id;

    await ensureProfile(supabase, userId);

    const { data, error } = await supabase
      .from('relationships')
      .select('*')
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      logger.error('Error fetching relationship', { error });
      return res.status(500).json({ error: error.message });
    }
    if (!data) return res.status(404).json({ error: 'No active relationship found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/relationships/pending
router.get('/pending', async (req, res, next) => {
  try {
    const supabase = createUserClient(req.token!);
    const userId = req.user!.id;

    const { data, error } = await supabase
      .from('relationships')
      .select('invite_code')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .maybeSingle();

    if (error) {
      logger.error('Error fetching pending', { error });
      return res.status(500).json({ error: error.message });
    }
    if (!data) return res.status(404).json({ error: 'No pending invite' });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /api/relationships/invite
router.post('/invite', async (req, res, next) => {
  try {
    const supabase = createUserClient(req.token!);
    const userId = req.user!.id;

    await ensureProfile(supabase, userId);

    // Check existing
    const { data: existing, error: checkError } = await supabase
      .from('relationships')
      .select('id, status')
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
      .maybeSingle();

    if (checkError) {
      logger.error('Error checking existing', { error: checkError });
      return res.status(500).json({ error: checkError.message });
    }

    if (existing) {
      if (existing.status === 'active') {
        return res.status(400).json({ error: 'You are already paired.' });
      }
      if (existing.status === 'pending') {
        // Return existing invite code
        const { data: codeData, error: codeError } = await supabase
          .from('relationships')
          .select('invite_code')
          .eq('id', existing.id)
          .single();
        if (codeError) {
          logger.error('Error fetching invite code', { error: codeError });
          return res.status(500).json({ error: codeError.message });
        }
        return res.json({ invite_code: codeData.invite_code });
      }
    }

    // Generate unique code
    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    let inviteCode = generateCode();
    let attempts = 0;
    let exists = true;
    while (exists && attempts < 10) {
      const { data: existingCode, error: codeCheck } = await supabase
        .from('relationships')
        .select('id')
        .eq('invite_code', inviteCode)
        .maybeSingle();
      if (codeCheck) {
        logger.error('Error checking invite code uniqueness', { error: codeCheck });
        return res.status(500).json({ error: codeCheck.message });
      }
      if (!existingCode) {
        exists = false;
      } else {
        inviteCode = generateCode();
        attempts++;
      }
    }
    if (exists) return res.status(500).json({ error: 'Failed to generate unique code' });

    // Insert pending relationship
    const { data: newRel, error: insertError } = await supabase
      .from('relationships')
      .insert({
        user_id: userId,
        partner_id: null,
        invite_code: inviteCode,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      logger.error('Error inserting relationship', { error: insertError });
      return res.status(500).json({ error: insertError.message });
    }

    logger.info('Invite generated', { userId, inviteCode });
    res.status(201).json({ invite_code: inviteCode });
  } catch (err) {
    next(err);
  }
});

// POST /api/relationships/join
router.post('/join', async (req, res, next) => {
  try {
    const { invite_code } = req.body;
    if (!invite_code) {
      return res.status(400).json({ error: 'invite_code required' });
    }

    const userId = req.user!.id;

    // 1. Use service role client to find the pending relationship (bypass RLS)
    const supabaseAdmin = createServiceClient();
    const { data: relationship, error: findError } = await supabaseAdmin
      .from('relationships')
      .select('*')
      .eq('invite_code', invite_code.trim().toUpperCase())
      .eq('status', 'pending')
      .maybeSingle();

    if (findError) {
      logger.error('Error finding relationship (admin)', { error: findError, invite_code });
      return res.status(500).json({ error: findError.message });
    }

    logger.info('Join attempt (admin)', { invite_code, found: !!relationship });

    if (!relationship) {
      return res.status(404).json({ error: 'Invite code not found or expired.' });
    }

    if (relationship.user_id === userId) {
      return res.status(400).json({ error: 'You cannot join your own invite.' });
    }

    // 2. Check if the joining user already has a relationship (using user-scoped client)
    const supabase = createUserClient(req.token!);
    const { data: existing, error: checkError } = await supabase
      .from('relationships')
      .select('id, status')
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
      .maybeSingle();

    if (checkError) {
      logger.error('Error checking existing for join', { error: checkError });
      return res.status(500).json({ error: checkError.message });
    }

    if (existing) {
      if (existing.status === 'active') {
        return res.status(400).json({ error: 'You are already paired.' });
      }
      if (existing.status === 'pending') {
        return res.status(400).json({ error: 'You have a pending invite. Wait for your partner to join.' });
      }
    }

    // 3. Update the relationship to active – use service role to bypass RLS
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('relationships')
      .update({ partner_id: userId, status: 'active', paired_at: new Date().toISOString() })
      .eq('id', relationship.id)
      .select()
      .single();

    if (updateError) {
      logger.error('Error updating relationship (admin)', { error: updateError });
      return res.status(500).json({ error: updateError.message });
    }

    logger.info('Relationship activated (admin)', { relationshipId: relationship.id, userId });
    res.json({ message: 'Relationship activated!', relationship: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
