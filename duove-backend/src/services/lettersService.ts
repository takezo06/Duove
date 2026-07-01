import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../config/logger';

export interface Letter {
  id: string;
  relationship_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  image_url: string | null; // stores the storage path
  spotify_id: string | null;
  created_at: string;
}

/**
 * Create a new letter.
 */
export async function createLetter(
  supabase: SupabaseClient,
  relationshipId: string,
  senderId: string,
  recipientId: string,
  content: string,
  spotifyId?: string | null,
  imagePath?: string | null
): Promise<Letter> {
  const { data, error } = await supabase
    .from('letters')
    .insert({
      relationship_id: relationshipId,
      sender_id: senderId,
      recipient_id: recipientId,
      content: content.trim(),
      spotify_id: spotifyId || null,
      image_url: imagePath || null,
    })
    .select()
    .single();

  if (error) {
    logger.error('Error creating letter', { relationshipId, senderId, error });
    throw new Error('Failed to create letter');
  }

  return data;
}

/**
 * Get all letters for a relationship (newest first).
 */
export async function getLetters(
  supabase: SupabaseClient,
  relationshipId: string
): Promise<Letter[]> {
  const { data, error } = await supabase
    .from('letters')
    .select('*')
    .eq('relationship_id', relationshipId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching letters', { relationshipId, error });
    throw new Error('Failed to fetch letters');
  }

  return data || [];
}

/**
 * Get a single letter by ID.
 */
export async function getLetterById(
  supabase: SupabaseClient,
  letterId: string
): Promise<Letter> {
  const { data, error } = await supabase
    .from('letters')
    .select('*')
    .eq('id', letterId)
    .single();

  if (error) {
    logger.error('Error fetching letter', { letterId, error });
    throw new Error('Letter not found');
  }

  return data;
}
