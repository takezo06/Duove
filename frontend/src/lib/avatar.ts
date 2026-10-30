// Profile photos: shrunk to a square in the browser (lib/photo.ts), then uploaded straight to the avatars bucket with progress.
import { PhotoError, preparePhoto, uploadPhoto } from './photo';

const SIZE = 512; // Shown at 64px at most; 512 stays sharp on any screen
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

export { PhotoError as AvatarError };

export const prepareAvatar = (file: File) => preparePhoto(file, SIZE);

// Uploads into the user's own folder and returns the photo's public address.
// The name is the time, which the profile function checks for.
export async function uploadAvatar(blob: Blob, userId: string, token: string, onProgress: (fraction: number) => void) {
  const path = await uploadPhoto('avatars', String(Date.now()), blob, userId, token, onProgress);
  return `${supabaseUrl}/storage/v1/object/public/avatars/${path}`;
}

// Resolves once the browser has the new photo ready, so swapping it in never flashes
export function preload(src: string) {
  const img = new Image();
  img.src = src;
  return img.decode().catch(() => {});
}
