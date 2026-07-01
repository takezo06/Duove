import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../config/logger';

export interface Craving {
  id: string;
  relationship_id: string;
  user_id: string;
  partner_id: string;
  content: string;
  fulfilled: boolean;
  created_at: string;
}

/**
 * Fetch all cravings for a given relationship, ordered newest first.
 */
export async function getCravings(
  supabase: SupabaseClient,
  relationshipId: string
): Promise<Craving[]> {
  const { data, error } = await supabase
    .from('cravings')
    .select('*')
    .eq('relationship_id', relationshipId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching cravings', { relationshipId, error });
    throw new Error('Failed to fetch cravings');
  }

  return data || [];
}

/**
 * Create a new craving.
 */
export async function createCraving(
  supabase: SupabaseClient,
  relationshipId: string,
  userId: string,
  partnerId: string,
  content: string
): Promise<Craving> {
  const { data, error } = await supabase
    .from('cravings')
    .insert({
      relationship_id: relationshipId,
      user_id: userId,
      partner_id: partnerId,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) {
    logger.error('Error creating craving', { relationshipId, userId, error });
    throw new Error('Failed to create craving');
  }

  return data;
}

/**
 * Toggle the "fulfilled" status of a craving.
 * Only allows the user who created it or their partner to toggle.
 */
export async function toggleCraving(
  supabase: SupabaseClient,
  cravingId: string,
  userId: string
): Promise<Craving> {
  // First, fetch the current craving to check permissions and get current status
  const { data: existing, error: fetchError } = await supabase
    .from('cravings')
    .select('*')
    .eq('id', cravingId)
    .single();

  if (fetchError || !existing) {
    logger.error('Craving not found or fetch error', { cravingId, error: fetchError });
    throw new Error('Craving not found');
  }

  // Check if the user is part of this craving's relationship
  if (existing.user_id !== userId && existing.partner_id !== userId) {
    throw new Error('You do not have permission to toggle this craving');
  }

  // Toggle the fulfilled status
  const { data, error } = await supabase
    .from('cravings')
    .update({ fulfilled: !existing.fulfilled })
    .eq('id', cravingId)
    .select()
    .single();

  if (error) {
    logger.error('Error toggling craving', { cravingId, userId, error });
    throw new Error('Failed to toggle craving');
  }

  return data;
}

/**
 * Delete a craving.
 * Only allows the user who created it to delete.
 */
export async function deleteCraving(
  supabase: SupabaseClient,
  cravingId: string,
  userId: string
): Promise<void> {
  // First, check if the user owns this craving
  const { data: existing, error: fetchError } = await supabase
    .from('cravings')
    .select('user_id')
    .eq('id', cravingId)
    .single();

  if (fetchError || !existing) {
    logger.error('Craving not found or fetch error', { cravingId, error: fetchError });
    throw new Error('Craving not found');
  }

  if (existing.user_id !== userId) {
    throw new Error('Only the creator can delete this craving');
  }

  const { error } = await supabase
    .from('cravings')
    .delete()
    .eq('id', cravingId);

  if (error) {
    logger.error('Error deleting craving', { cravingId, userId, error });
    throw new Error('Failed to delete craving');
  }
}
