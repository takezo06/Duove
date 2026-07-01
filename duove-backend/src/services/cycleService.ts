import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../config/logger';

export interface CycleLog {
  id: string;
  relationship_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  duration: number | null;
  created_at: string;
}

export interface PredictionResult {
  nextPredictedDate: string | null;
  averageDuration: number | null;
  cyclesUsed: number;
  totalCycles: number;
}

/**
 * Log a new cycle.
 * Only the user with can_track_cycles = true can log.
 */
export async function logCycle(
  supabase: SupabaseClient,
  userId: string,
  relationshipId: string,
  startDate: string,
  endDate: string
): Promise<CycleLog> {
  // Validate dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date format');
  }
  
  if (end < start) {
    throw new Error('End date must be after start date');
  }

  // Calculate duration in days
  const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  const { data, error } = await supabase
    .from('cycle_logs')
    .insert({
      user_id: userId,
      relationship_id: relationshipId,
      start_date: startDate,
      end_date: endDate,
      duration,
    })
    .select()
    .single();

  if (error) {
    logger.error('Error logging cycle', { userId, relationshipId, error });
    throw new Error('Failed to log cycle');
  }

  return data;
}

/**
 * Get all cycle logs for a user, ordered by start_date (newest first).
 */
export async function getCycleLogs(
  supabase: SupabaseClient,
  userId: string
): Promise<CycleLog[]> {
  const { data, error } = await supabase
    .from('cycle_logs')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: false });

  if (error) {
    logger.error('Error fetching cycle logs', { userId, error });
    throw new Error('Failed to fetch cycle logs');
  }

  return data || [];
}

/**
 * Get the latest cycle log for a user.
 */
export async function getLatestCycle(
  supabase: SupabaseClient,
  userId: string
): Promise<CycleLog | null> {
  const { data, error } = await supabase
    .from('cycle_logs')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error('Error fetching latest cycle', { userId, error });
    throw new Error('Failed to fetch latest cycle');
  }

  return data;
}

/**
 * Calculate the predicted next cycle start date using rolling average.
 * Algorithm:
 * - Until 6 cycles: use last 3 cycles
 * - After 6 cycles: use last 5 cycles
 * - Average duration is calculated from the selected cycles
 * - Next start = last start_date + average duration
 */
export async function predictNextCycle(
  supabase: SupabaseClient,
  userId: string
): Promise<PredictionResult> {
  // Fetch all cycles for this user (oldest first for calculation)
  const { data: cycles, error } = await supabase
    .from('cycle_logs')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: true });

  if (error) {
    logger.error('Error fetching cycles for prediction', { userId, error });
    throw new Error('Failed to fetch cycles for prediction');
  }

  if (!cycles || cycles.length === 0) {
    return {
      nextPredictedDate: null,
      averageDuration: null,
      cyclesUsed: 0,
      totalCycles: 0,
    };
  }

  // Calculate durations for all cycles
  const cyclesWithDuration = cycles.map((cycle) => ({
    ...cycle,
    duration: cycle.duration || Math.ceil(
      (new Date(cycle.end_date).getTime() - new Date(cycle.start_date).getTime()) /
      (1000 * 60 * 60 * 24)
    ),
  }));

  // Determine how many cycles to use for prediction
  const totalCycles = cyclesWithDuration.length;
  let cyclesToUse: number;
  
  if (totalCycles < 6) {
    cyclesToUse = Math.min(3, totalCycles); // Use up to 3 cycles (or fewer if less)
  } else {
    cyclesToUse = 5; // After 6+ cycles, use last 5
  }

  // Take the most recent N cycles
  const recentCycles = cyclesWithDuration.slice(-cyclesToUse);
  
  // Calculate average duration
  const totalDuration = recentCycles.reduce((sum, cycle) => sum + cycle.duration, 0);
  const averageDuration = Math.round(totalDuration / recentCycles.length);

  // Get the most recent start date
  const lastCycle = cyclesWithDuration[cyclesWithDuration.length - 1];
  const lastStartDate = new Date(lastCycle.start_date);

  // Predict next start date
  const nextPredicted = new Date(lastStartDate);
  nextPredicted.setDate(nextPredicted.getDate() + averageDuration);

  return {
    nextPredictedDate: nextPredicted.toISOString().split('T')[0],
    averageDuration,
    cyclesUsed: recentCycles.length,
    totalCycles,
  };
}
