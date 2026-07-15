import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth';
import { createUserClient } from '../config/supabase';
import { createServiceClient } from '../config/supabaseAdmin';
import { logger } from '../config/logger';
import rateLimit from 'express-rate-limit';

const inviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                  // max 10 invite attempts per window
  message: { error: 'Too many invite attempts, please try again later.' },
});

const joinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,                  // slightly higher for join attempts (guessing codes)
  message: { error: 'Too many join attempts, please try again later.' },
});

const router = Router();
router.use(authMiddleware);

// ----- Helper: ensure profile exists -----
async function ensureProfile(supabase: any, userId: string) {
  const { data: existing, error: checkError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (checkError && checkError.code !== 'PGRST116') throw checkError;
  if (!existing) {
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({ id: userId });
    if (insertError && insertError.code !== '23505') throw insertError;
  }
}

// ----- Helper: format duration -----
function formatDuration(startDate: Date, endDate: Date): string {
  let diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs < 0) return '0 seconds';
  const totalSeconds = Math.floor(diffMs / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  const years = Math.floor(totalDays / 365.25);
  let remainingDays = totalDays - Math.floor(years * 365.25);
  const months = Math.floor(remainingDays / 30.44);
  remainingDays = remainingDays - Math.floor(months * 30.44);
  const weeks = Math.floor(remainingDays / 7);
  const days = remainingDays - weeks * 7;
  const remainingHours = totalHours - totalDays * 24;
  const remainingMinutes = totalMinutes - totalHours * 60;
  const remainingSeconds = totalSeconds - totalMinutes * 60;

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years > 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} month${months > 1 ? 's' : ''}`);
  if (weeks > 0) parts.push(`${weeks} week${weeks > 1 ? 's' : ''}`);
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (remainingHours > 0) parts.push(`${remainingHours} hour${remainingHours > 1 ? 's' : ''}`);
  if (remainingMinutes > 0) parts.push(`${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`);
  if (remainingSeconds > 0) parts.push(`${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''}`);
  if (parts.length === 0) return '0 seconds';
  return parts.join(', ');
}

// ----- Helper: get conversion -----
function getConversion(startDate: Date, endDate: Date): string {
  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs <= 0) return '';
  const totalSeconds = diffMs / 1000;
  const totalMinutes = totalSeconds / 60;
  const totalHours = totalMinutes / 60;
  const totalDays = totalHours / 24;
  if (totalDays >= 1) {
    return `= ${totalDays.toFixed(2)} days (${Math.floor(totalDays)}d, ${Math.floor((totalDays % 1) * 24)}h)`;
  } else if (totalHours >= 1) {
    return `= ${totalHours.toFixed(2)} hours (${Math.floor(totalHours)}h, ${Math.floor((totalHours % 1) * 60)}m)`;
  } else if (totalMinutes >= 1) {
    return `= ${totalMinutes.toFixed(2)} minutes (${Math.floor(totalMinutes)}m, ${Math.floor((totalMinutes % 1) * 60)}s)`;
  } else {
    return `= ${totalSeconds.toFixed(2)} seconds`;
  }
}

// ----- Helper: resolve partner display name -----
async function getPartnerDisplayName(partnerId: string): Promise<string> {
  const supabaseAdmin = createServiceClient();
  // Try the profiles table first (where display_name is stored)
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('display_name')
    .eq('id', partnerId)
    .maybeSingle();

  if (!error && profile?.display_name) {
    return profile.display_name;
  }

  // Fallback to auth metadata
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(partnerId);
  if (authUser?.user) {
    const meta = authUser.user.user_metadata || {};
    if (meta.full_name) return meta.full_name;
    if (meta.name) return meta.name;
    if (meta.username) return meta.username;
    if (authUser.user.email) return authUser.user.email.split('@')[0];
  }

  return 'Partner';
}
// ----- GET /me -----
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = createUserClient(req.token!);
    const userId = req.user!.id;
    await ensureProfile(supabase, userId);

    const { data: relationship, error: relError } = await supabase
      .from('relationships')
      .select('*')
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
      .eq('status', 'active')
      .maybeSingle();

    if (relError) {
      logger.error('Error fetching relationship', { error: relError });
      return res.status(500).json({ error: relError.message });
    }
    if (!relationship) {
      return res.status(404).json({ error: 'No active relationship found' });
    }

    const partnerId = relationship.user_id === userId ? relationship.partner_id : relationship.user_id;
    const partnerDisplayName = await getPartnerDisplayName(partnerId);

    res.json({
      relationship,
      partner: {
        id: partnerId,
        display_name: partnerDisplayName,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ----- GET /pending -----
router.get('/pending', async (req: Request, res: Response, next: NextFunction) => {
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
  } catch (err) { next(err); }
});

// ----- POST /invite -----
router.post('/invite', inviteLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = createUserClient(req.token!);
    const userId = req.user!.id;
    await ensureProfile(supabase, userId);

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
  } catch (err) { next(err); }
});

// ----- POST /join -----
router.post('/join', joinLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { invite_code } = req.body;
    if (!invite_code) return res.status(400).json({ error: 'invite_code required' });

    const userId = req.user!.id;
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
    if (!relationship) return res.status(404).json({ error: 'Invite code not found or expired.' });
    if (relationship.user_id === userId) {
      return res.status(400).json({ error: 'You cannot join your own invite.' });
    }

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
  } catch (err) { next(err); }
});

// ----- GET /stats -----
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = createUserClient(req.token!);
    const userId = req.user!.id;

    // User profile
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('created_at')
      .eq('id', userId)
      .single();

    if (userError) {
      logger.error('Error fetching user profile', { error: userError });
      return res.status(500).json({ error: userError.message });
    }

    // Active relationship
    const { data: relationship, error: relError } = await supabase
      .from('relationships')
      .select('*')
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
      .eq('status', 'active')
      .maybeSingle();

    if (relError) {
      logger.error('Error fetching relationship', { error: relError });
      return res.status(500).json({ error: relError.message });
    }
    if (!relationship) {
      return res.status(404).json({ error: 'No active relationship found' });
    }

    const partnerId = relationship.user_id === userId ? relationship.partner_id : relationship.user_id;
    const partnerDisplayName = await getPartnerDisplayName(partnerId);

    // Fetch partner's avatar URL using service client (bypass RLS)
    let partnerAvatarUrl: string | null = null;
    try {
      const supabaseAdmin = createServiceClient();
      const { data: partnerProfile } = await supabaseAdmin
        .from('profiles')
        .select('avatar_url')
        .eq('id', partnerId)
        .single();
      partnerAvatarUrl = partnerProfile?.avatar_url || null;
    } catch {
      partnerAvatarUrl = null;
    }

    // Count cravings
    const { count: cravingsCount, error: cravingsError } = await supabase
      .from('cravings')
      .select('*', { count: 'exact', head: true })
      .eq('relationship_id', relationship.id)
      .is('archived_at', null);

    // Count letters
    const { count: lettersSent, error: lettersSentError } = await supabase
      .from('love_letters')
      .select('*', { count: 'exact', head: true })
      .eq('relationship_id', relationship.id)
      .eq('sender_id', userId);

    // Letters received (sent by the partner in this relationship)
    const { count: lettersReceived, error: lettersReceivedError } = await supabase
      .from('love_letters')
      .select('*', { count: 'exact', head: true })
      .eq('relationship_id', relationship.id)
      .neq('sender_id', userId);

    // ----- Durations -----
    const now = new Date();
    const accountCreated = new Date(userData.created_at);
    const pairedAt = relationship.paired_at ? new Date(relationship.paired_at) : null;
    const anniversaryDate = relationship.anniversary_date ? new Date(relationship.anniversary_date) : null;

    const accountAge = formatDuration(accountCreated, now);

    let togetherDuration = 'Not yet';
    let togetherConversion = '';
    if (pairedAt) {
      togetherDuration = formatDuration(pairedAt, now);
      togetherConversion = getConversion(pairedAt, now);
    }

    let anniversaryDuration = 'Not set';
    let anniversaryConversion = '';
    let nextAnniversary = null;
    let daysUntilAnniversary = null;
    let nextMonthsary = null;
    let daysUntilMonthsary = null;

    if (anniversaryDate) {
      // Last anniversary
      let lastAnniversary = new Date(anniversaryDate);
      while (lastAnniversary > now) {
        lastAnniversary.setFullYear(lastAnniversary.getFullYear() - 1);
      }
      if (now.getFullYear() - lastAnniversary.getFullYear() > 0) {
        lastAnniversary.setFullYear(now.getFullYear());
        if (lastAnniversary > now) {
          lastAnniversary.setFullYear(lastAnniversary.getFullYear() - 1);
        }
      }
      const durationMs = now.getTime() - lastAnniversary.getTime();
      if (durationMs > 0) {
        anniversaryDuration = formatDuration(lastAnniversary, now);
        anniversaryConversion = getConversion(lastAnniversary, now);
      } else {
        anniversaryDuration = 'Just started';
      }

      // Next anniversary
      let next = new Date(anniversaryDate);
      next.setFullYear(now.getFullYear());
      if (next < now) {
        next.setFullYear(now.getFullYear() + 1);
      }
      nextAnniversary = next.toISOString().split('T')[0];
      daysUntilAnniversary = Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilAnniversary < 0) daysUntilAnniversary = 0;

      // Next monthsary
      const dayOfMonth = anniversaryDate.getDate();
      let candidate = new Date(now);
      candidate.setDate(dayOfMonth);
      if (candidate < now) {
        candidate.setMonth(candidate.getMonth() + 1);
      }
      if (candidate.getDate() !== dayOfMonth) {
        candidate.setMonth(candidate.getMonth() + 1);
        candidate.setDate(dayOfMonth);
      }
      if (candidate.getDate() !== dayOfMonth) {
        candidate = new Date(now);
        candidate.setMonth(candidate.getMonth() + 1);
        candidate.setDate(1);
      }
      nextMonthsary = candidate.toISOString().split('T')[0];
      daysUntilMonthsary = Math.ceil((candidate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilMonthsary < 0) daysUntilMonthsary = 0;
    }

    res.setHeader('Cache-Control', 'no-store');

    res.json({
      user: {
        id: userId,
        account_created: userData.created_at,
        account_age: accountAge,
      },
      relationship: {
        id: relationship.id,
        paired_at: relationship.paired_at,
        anniversary_date: relationship.anniversary_date,
        together_duration: togetherDuration,
        together_conversion: togetherConversion,
        anniversary_duration: anniversaryDuration,
        anniversary_conversion: anniversaryConversion,
        next_anniversary: nextAnniversary,
        days_until_anniversary: daysUntilAnniversary,
        next_monthsary: nextMonthsary,
        days_until_monthsary: daysUntilMonthsary,
        status: relationship.status,
      },
      partner: {
        id: partnerId,
        display_name: partnerDisplayName,
        avatar_url: partnerAvatarUrl,
      },
      stats: {
        cravings: cravingsCount || 0,
        letters_sent: lettersSent || 0,
        letters_received: lettersReceived || 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ----- PATCH /anniversary -----
router.patch('/anniversary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { anniversary_date } = req.body;
    if (!anniversary_date) {
      return res.status(400).json({ error: 'anniversary_date required' });
    }
    const parsedDate = new Date(anniversary_date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const supabase = createUserClient(req.token!);
    const userId = req.user!.id;

    const { data: relationship, error: findError } = await supabase
      .from('relationships')
      .select('id')
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
      .eq('status', 'active')
      .maybeSingle();

    if (findError) {
      logger.error('Error finding relationship', { error: findError });
      return res.status(500).json({ error: findError.message });
    }
    if (!relationship) {
      return res.status(404).json({ error: 'No active relationship found' });
    }

    const { data: updated, error: updateError } = await supabase
      .from('relationships')
      .update({ anniversary_date })
      .eq('id', relationship.id)
      .select()
      .single();

    if (updateError) {
      logger.error('Error updating anniversary', { error: updateError });
      return res.status(500).json({ error: updateError.message });
    }

    res.json({
      message: 'Anniversary updated!',
      anniversary_date: updated.anniversary_date,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/relationships – delete the active relationship
router.delete('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = createUserClient(req.token!);
    const userId = req.user!.id;

    // Find the active relationship
    const { data: relationship, error: relError } = await supabase
      .from('relationships')
      .select('id')
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
      .eq('status', 'active')
      .maybeSingle();

    if (relError || !relationship) {
      return res.status(404).json({ error: 'No active relationship found' });
    }

    // Delete the relationship (the row is removed)
    const { error: deleteError } = await supabase
      .from('relationships')
      .delete()
      .eq('id', relationship.id);

    if (deleteError) {
      logger.error('Error deleting relationship', { userId, error: deleteError });
      return res.status(500).json({ error: deleteError.message });
    }

    logger.info('Relationship deleted', { userId, relationshipId: relationship.id });
    res.json({ message: 'Relationship deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
