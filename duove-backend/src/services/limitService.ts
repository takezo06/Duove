import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../config/logger';

export type LimitType = 'letter' | 'craving' | 'qa';

export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  resetAt?: string; // ISO date string for when the cap resets (next midnight UTC)
}

const MAX_LIMITS = {
  letter: 5,
  qa: 5,
  craving: 5,
};

/**
 * Get today's date in UTC as a string (YYYY-MM-DD)
 */
function getTodayUTC(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Check if a user has remaining capacity for a given type today.
 * Returns the current usage and whether they can still perform the action.
 */
export async function checkDailyLimit(
  supabase: SupabaseClient,
  userId: string,
  type: LimitType
): Promise<LimitCheckResult> {
  const today = getTodayUTC();
  const limit = MAX_LIMITS[type];

  // Query the daily_usage table for this user and today
  const { data, error } = await supabase
    .from('daily_usage')
    .select(`${type}_count`)
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  if (error) {
    logger.error('Error checking daily limit', { userId, type, error });
    throw new Error('Failed to check daily limit');
  }

  // Helper to safely extract count
  function getCount(data: any, type: LimitType): number {
    return data ? data[`${type}_count`] || 0 : 0;
  }

  const current = getCount(data, type);
  const allowed = current < limit;

  // Reset at midnight UTC
  const resetDate = new Date();
  resetDate.setUTCHours(24, 0, 0, 0); // next midnight

  return {
    allowed,
    current,
    limit,
    resetAt: resetDate.toISOString(),
  };
}

/**
 * Increment the usage count for a given type for the current user for today.
 * Uses an upsert pattern: if no record exists, insert one with count=1; else increment.
 */
export async function incrementDailyUsage(
  supabase: SupabaseClient,
  userId: string,
  type: LimitType
): Promise<void> {
  const today = getTodayUTC();
  const column = `${type}_count`;

  // First, try to update existing record (increment)
  const { data: existing, error: fetchError } = await supabase
    .from('daily_usage')
    .select(column)
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  if (fetchError) {
    logger.error('Error fetching daily usage for increment', { userId, type, error: fetchError });
    throw new Error('Failed to increment daily usage');
  }

  if (existing) {
    // Record exists – increment
    const { error: updateError } = await supabase
      .from('daily_usage')
      .update({ [column]: (existing as any)[column] + 1 })
      .eq('user_id', userId)
      .eq('date', today);

    if (updateError) {
      logger.error('Error updating daily usage', { userId, type, error: updateError });
      throw new Error('Failed to update daily usage');
    }
  } else {
    // No record – insert with count = 1
    const { error: insertError } = await supabase
      .from('daily_usage')
      .insert({
        user_id: userId,
        date: today,
        [column]: 1,
      });

    if (insertError) {
      logger.error('Error inserting daily usage', { userId, type, error: insertError });
      throw new Error('Failed to insert daily usage');
    }
  }

  logger.debug('Incremented daily usage', { userId, type, date: today });
}
