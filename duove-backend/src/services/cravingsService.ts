import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../config/logger';

export interface Craving {
  id: string;
  relationship_id: string;
  user_id: string;
  partner_id: string;
  content: string;
  category: string;
  fulfilled: boolean;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export async function getCravings(
  supabase: SupabaseClient,
  relationshipId: string
): Promise<Craving[]> {
  const { data, error } = await supabase
    .from('cravings')
    .select('*')
    .eq('relationship_id', relationshipId)
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching cravings', { relationshipId, error });
    throw new Error('Failed to fetch cravings');
  }
  return data || [];
}

export async function createCraving(
  supabase: SupabaseClient,
  relationshipId: string,
  userId: string,
  partnerId: string,
  content: string,
  category: string = 'Other'
): Promise<Craving> {
  const { data, error } = await supabase
    .from('cravings')
    .insert({
      relationship_id: relationshipId,
      user_id: userId,
      partner_id: partnerId,
      content: content.trim(),
      category,
    })
    .select()
    .single();

  if (error) {
    logger.error('Error creating craving', { relationshipId, userId, error });
    throw new Error('Failed to create craving');
  }
  return data;
}

export async function toggleCraving(
  supabase: SupabaseClient,
  cravingId: string,
  userId: string
): Promise<Craving> {
  // Fetch current craving
  const { data: existing, error: fetchError } = await supabase
    .from('cravings')
    .select('*')
    .eq('id', cravingId)
    .single();

  if (fetchError || !existing) {
    logger.error('Craving not found', { cravingId, error: fetchError });
    throw new Error('Craving not found');
  }

  if (existing.user_id !== userId && existing.partner_id !== userId) {
    throw new Error('You do not have permission to toggle this craving');
  }

  const { data, error } = await supabase
    .from('cravings')
    .update({ 
      fulfilled: !existing.fulfilled,
      updated_at: new Date().toISOString()
    })
    .eq('id', cravingId)
    .select()
    .single();

  if (error) {
    logger.error('Error toggling craving', { cravingId, userId, error });
    throw new Error('Failed to toggle craving');
  }
  return data;
}

export async function deleteCraving(
  supabase: SupabaseClient,
  cravingId: string,
  userId: string
): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from('cravings')
    .select('user_id')
    .eq('id', cravingId)
    .single();

  if (fetchError || !existing) {
    logger.error('Craving not found', { cravingId, error: fetchError });
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
