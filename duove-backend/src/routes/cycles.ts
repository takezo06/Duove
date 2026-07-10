import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth';
import { createUserClient } from '../config/supabase';
import { createServiceClient } from '../config/supabaseAdmin';
import { CycleEngine } from '../services/cycleService';
import { logger } from '../config/logger';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import {
  getCycleLogs,
  getLatestCycle,
  getSymptomLogs,
  logCycle,
  logSymptoms,
  predictNextCycle,
} from '../services/cycleService';

const router = Router();
router.use(authMiddleware);

// Rate limiter for cycle logging (start date + symptoms)
const cycleLogLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                  // max 20 requests per window (realistic usage)
  message: { error: 'Too many requests, please slow down.' },
});

// GET /api/cycles/stats
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = createUserClient(req.token!);
    const userId = req.user!.id;

    const { data: relationship, error: relError } = await supabase
      .from('relationships')
      .select('id')
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
      .eq('status', 'active')
      .maybeSingle();

    if (relError || !relationship) {
      return res.status(404).json({ error: 'No active relationship found' });
    }

    const prediction = await predictNextCycle(supabase, userId);
    const cycles = await getCycleLogs(supabase, userId);
    const lastPeriodStart = cycles.length > 0 ? cycles[cycles.length - 1].start_date : null;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const symptoms = await getSymptomLogs(supabase, userId, thirtyDaysAgo.toISOString().split('T')[0]);

    const now = new Date();
    const calendarData = [];
    for (let i = -7; i <= 7; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const found = symptoms.find((s: any) => s.log_date === dateStr);
      calendarData.push({
        date: dateStr,
        bleeding: found?.bleeding_intensity ? true : false,
        symptoms: !!found?.physical_symptoms?.length,
      });
    }

    res.json({
      prediction,
      calendar: calendarData,
      recentCycles: cycles.slice(-6).map((c: any) => ({
        start: c.start_date,
        end: c.end_date,
      })),
      lastPeriodStart,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/cycles/history
router.get('/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = createUserClient(req.token!);
    const userId = req.user!.id;
    const cycles = await getCycleLogs(supabase, userId);
    res.json(cycles);
  } catch (err) {
    next(err);
  }
});

// GET /api/cycles/symptoms
router.get('/symptoms', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = createUserClient(req.token!);
    const userId = req.user!.id;
    const { from, to } = req.query;
    const logs = await getSymptomLogs(supabase, userId, from as string | undefined, to as string | undefined);
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

// POST /api/cycles/log (with validation + rate limit)
router.post(
  '/log',
  cycleLogLimiter,
  body('start_date').isISO8601().withMessage('Valid start_date required'),
  body('end_date').optional().isISO8601().withMessage('end_date must be a valid date'),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { start_date, end_date, is_manual_override } = req.body;
      const supabase = createUserClient(req.token!);
      const userId = req.user!.id;

      const { data: relationship, error: relError } = await supabase
        .from('relationships')
        .select('id')
        .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
        .eq('status', 'active')
        .maybeSingle();

      if (relError || !relationship) {
        return res.status(404).json({ error: 'No active relationship found' });
      }

      const newCycle = await logCycle(
        supabase,
        userId,
        relationship.id,
        start_date,
        end_date,
        is_manual_override || false
      );
      res.status(201).json(newCycle);
    } catch (err: any) {
      logger.error('Error in POST /api/cycles/log', { error: err.message || err });
      res.status(500).json({ error: err.message || 'Failed to save cycle start' });
    }
  }
);

// POST /api/cycles/symptoms (with validation + rate limit)
router.post(
  '/symptoms',
  cycleLogLimiter,
  body('log_date').isISO8601().withMessage('Valid log_date required'),
  body('bleeding_intensity')
    .optional()
    .isIn(['spotting', 'light', 'medium', 'heavy'])
    .withMessage('Invalid bleeding intensity'),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { log_date, ...symptomData } = req.body;
      const supabase = createUserClient(req.token!);
      const userId = req.user!.id;

      const { data: relationship, error: relError } = await supabase
        .from('relationships')
        .select('id')
        .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
        .eq('status', 'active')
        .maybeSingle();

      if (relError || !relationship) {
        return res.status(404).json({ error: 'No active relationship found' });
      }

      const result = await logSymptoms(supabase, userId, relationship.id, log_date, symptomData);
      res.status(201).json(result);
    } catch (err: any) {
      logger.error('Error in POST /api/cycles/symptoms', { error: err.message || err });
      res.status(500).json({ error: err.message || 'Failed to save symptoms' });
    }
  }
);

// GET /api/cycles/partner/stats
router.get('/partner/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = createUserClient(req.token!);
    const userId = req.user!.id;

    const { data: relationship, error: relError } = await supabase
      .from('relationships')
      .select('id, user_id, partner_id')
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
      .eq('status', 'active')
      .maybeSingle();

    if (relError || !relationship) {
      return res.status(404).json({ error: 'No active relationship found' });
    }

    const partnerId = relationship.user_id === userId ? relationship.partner_id : relationship.user_id;
    const supabaseAdmin = createServiceClient();
    const partnerCycles = await getCycleLogs(supabaseAdmin, partnerId);
    const partnerSymptoms = await getSymptomLogs(supabaseAdmin, partnerId);

    const engine = new CycleEngine(partnerCycles);
    const prediction = engine.getPrediction();
    const lastPeriodStart = partnerCycles.length > 0 ? partnerCycles[partnerCycles.length - 1].start_date : null;

    const now = new Date();
    const calendarData = [];
    for (let i = -7; i <= 7; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const found = partnerSymptoms.find((s: any) => s.log_date === dateStr);
      calendarData.push({
        date: dateStr,
        bleeding: found?.bleeding_intensity ? true : false,
        symptoms: !!found?.physical_symptoms?.length,
      });
    }

    const { data: partnerProfile } = await supabaseAdmin
      .from('profiles')
      .select('display_name')
      .eq('id', partnerId)
      .single();

    res.json({
      prediction,
      calendar: calendarData,
      lastPeriodStart,
      partnerName: partnerProfile?.display_name || 'Partner',
      symptom_logs: partnerSymptoms,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/cycles/tips
router.get('/tips', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phase, audience } = req.query;
    if (!phase || !audience) {
      return res.status(400).json({ error: 'phase and audience are required' });
    }

    const supabase = createUserClient(req.token!);
    const { data: tips, error } = await supabase
      .from('cycle_tips')
      .select('tip_text')
      .eq('phase', phase)
      .eq('audience', audience)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Error fetching tips', { error });
      return res.status(500).json({ error: error.message });
    }

    res.json(tips || []);
  } catch (err) {
    next(err);
  }
});

// GET /api/cycles/partner/symptoms
router.get('/partner/symptoms', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = createUserClient(req.token!);
    const userId = req.user!.id;

    const { data: relationship, error: relError } = await supabase
      .from('relationships')
      .select('id, user_id, partner_id')
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
      .eq('status', 'active')
      .maybeSingle();

    if (relError || !relationship) return res.status(404).json({ error: 'No active relationship found' });

    const partnerId = relationship.user_id === userId ? relationship.partner_id : relationship.user_id;
    const supabaseAdmin = createServiceClient();
    const { data: symptoms, error } = await supabaseAdmin
      .from('daily_symptom_logs')
      .select('*')
      .eq('user_id', partnerId)
      .order('log_date', { ascending: false });

    if (error) {
      logger.error('Error fetching partner symptoms', { error });
      return res.status(500).json({ error: error.message });
    }

    res.json(symptoms);
  } catch (err) {
    next(err);
  }
});

export default router;
