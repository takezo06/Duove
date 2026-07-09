import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../config/logger';
import crypto from 'crypto';

const BUCKET_NAME = 'letter-images';

/**
 * Upload an image to Supabase Storage.
 * Returns the file path (to be stored in the database).
 */
export async function uploadLetterImage(
  supabase: SupabaseClient,
  userId: string,
  file: any
): Promise<string> {
  // Validate file size (200 KB max, as per plan)
  const MAX_SIZE = 200 * 1024; // 200 KB
  if (file.size > MAX_SIZE) {
    throw new Error(`Image too large. Max size is ${MAX_SIZE / 1024} KB.`);
  }

  // Generate a unique filename
  const fileExt = file.originalname.split('.').pop() || 'jpg';
  const fileName = `${userId}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      cacheControl: '3600',
    });

  if (error) {
    logger.error('Storage upload failed', { userId, error });
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  logger.debug('Image uploaded successfully', { userId, path: data.path });
  return data.path;
}

/**
 * Generate a presigned URL for viewing an image (expires in 60 seconds).
 */
export async function getPresignedUrl(
  supabase: SupabaseClient,
  path: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, 60); // 60 seconds expiry

  if (error) {
    logger.error('Presigned URL generation failed', { path, error });
    throw new Error(`Failed to generate presigned URL: ${error.message}`);
  }

  return data.signedUrl;
}
