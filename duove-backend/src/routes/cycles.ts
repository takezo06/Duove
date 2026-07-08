import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth';
import { createUserClient } from '../config/supabase';
import { createServiceClient } from '../config/supabaseAdmin';
import { CycleEngine } from '../services/cycleService';
import { logger } from '../config/logger';
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

    // Use the exported prediction function
    const prediction = await predictNextCycle(supabase, userId);

    const cycles = await getCycleLogs(supabase, userId);
    const lastPeriodStart = cycles.length > 0 ? cycles[cycles.length - 1].start_date : null;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const symptoms = await getSymptomLogs(
      supabase,
      userId,
      thirtyDaysAgo.toISOString().split('T')[0]
    );

    const now = new Date();
    const calendarData = [];
    for (let i = -7; i <= 7; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const found = symptoms.find((s: any) => s.log_date === dateStr);
      const hasBleeding = found?.bleeding_intensity ? true : false;
      const hasSymptoms = !!found?.physical_symptoms?.length;
      calendarData.push({ date: dateStr, bleeding: hasBleeding, symptoms: hasSymptoms });
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
    const logs = await getSymptomLogs(
      supabase,
      userId,
      from as string | undefined,
      to as string | undefined
    );
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

// POST /api/cycles/log
router.post('/log', async (req: Request, res: Response, next: NextFunction) => {
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
  } catch (err) {
    next(err);
  }
});

// GET /api/cycles/partner/stats – partner's cycle stats (read-only)
router.get('/partner/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = createUserClient(req.token!);
    const userId = req.user!.id;

    // Get the active relationship
    const { data: relationship, error: relError } = await supabase
      .from('relationships')
      .select('id, user_id, partner_id')
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
      .eq('status', 'active')
      .maybeSingle();

    if (relError || !relationship) {
      return res.status(404).json({ error: 'No active relationship found' });
    }

    // Determine partner ID
    const partnerId = relationship.user_id === userId ? relationship.partner_id : relationship.user_id;

    // Use service role to fetch partner's data (bypass RLS)
    const supabaseAdmin = createServiceClient();
    const partnerCycles = await getCycleLogs(supabaseAdmin, partnerId);
    const partnerSymptoms = await getSymptomLogs(supabaseAdmin, partnerId);

    // Build prediction using CycleEngine
    const engine = new CycleEngine(partnerCycles);
    const prediction = engine.getPrediction();

    const lastPeriodStart = partnerCycles.length > 0 ? partnerCycles[partnerCycles.length - 1].start_date : null;

    // Build calendar for the last 7 days
    const now = new Date();
    const calendarData = [];
    for (let i = -7; i <= 7; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const found = partnerSymptoms.find((s: any) => s.log_date === dateStr);
      const hasBleeding = found?.bleeding_intensity ? true : false;
      const hasSymptoms = !!found?.physical_symptoms?.length;
      calendarData.push({ date: dateStr, bleeding: hasBleeding, symptoms: hasSymptoms });
    }

    // Get partner's display name
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

// POST /api/cycles/symptoms
router.post('/symptoms', async (req: Request, res: Response, next: NextFunction) => {
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

    const result = await logSymptoms(
      supabase,
      userId,
      relationship.id,
      log_date,
      symptomData
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/cycles/tips?phase=...&audience=...
router.get('/tips', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phase, audience } = req.query;
    if (!phase || !audience) {
      return res.status(400).json({ error: 'phase and audience are required' });
    }

    const supabase = createUserClient(req.token!);
    // Use service role to get tips (or regular supabase if RLS allows)
    // Since tips are public, we can use the user-scoped client.
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

    // If no tips found, return an empty array
    res.json(tips || []);
  } catch (err) {
    next(err);
  }
});

// GET /api/cycles/partner/symptoms – partner's symptom logs (read-only)
router.get('/partner/symptoms', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = createUserClient(req.token!);
    const userId = req.user!.id;

    // Get relationship and partner ID
    const { data: relationship, error: relError } = await supabase
      .from('relationships')
      .select('id, user_id, partner_id')
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
      .eq('status', 'active')
      .maybeSingle();

    if (relError || !relationship) return res.status(404).json({ error: 'No active relationship found' });

    const partnerId = relationship.user_id === userId ? relationship.partner_id : relationship.user_id;

    // Use service role to bypass RLS
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
