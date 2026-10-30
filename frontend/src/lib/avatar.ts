// Profile photos: shrunk to a square in the browser, then uploaded straight to the avatars bucket with progress.
// Every upload gets a new file name, so its address is new and no browser or CDN can show an older copy.
import axios from 'axios';

const SIZE = 512; // Shown at 64px at most; 512 stays sharp on any screen
const MAX_SIDE = 8000; // Larger pictures can blow the canvas memory on phones
const MAX_GIF = 2 * 1024 * 1024; // Matches the bucket limit; a GIF loads on every page that shows the photo
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export class AvatarError extends Error {}

// Center-crops to a square and re-encodes, which also drops the photo's location and camera data.
// A GIF uploads as it is so it keeps moving (a canvas holds one frame); the avatar's circle crops it.
export async function prepareAvatar(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new AvatarError('Pick a photo (JPG, PNG, WebP or GIF).');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new AvatarError("That photo couldn't be opened. Try a JPG or PNG.");
  }
  if (file.type === 'image/gif') {
    bitmap.close();
    if (file.size > MAX_GIF) throw new AvatarError('That GIF is too large. Pick one under 2 MB.');
    return file;
  }
  const side = Math.min(bitmap.width, bitmap.height);
  if (!side || Math.max(bitmap.width, bitmap.height) > MAX_SIDE) {
    bitmap.close();
    throw new AvatarError('That photo is too large. Try a smaller one.');
  }
  const size = Math.min(SIZE, side);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new AvatarError("That photo couldn't be opened. Try a JPG or PNG.");
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();
  const encode = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  // Safari can't write WebP and silently returns a PNG instead; JPEG is the small fallback
  const webp = await encode('image/webp', 0.85);
  const blob = webp?.type === 'image/webp' ? webp : await encode('image/jpeg', 0.88);
  if (!blob) throw new AvatarError("That photo couldn't be opened. Try a JPG or PNG.");
  return blob;
}

// Uploads into the user's own folder and returns the photo's public address
export async function uploadAvatar(blob: Blob, userId: string, token: string, onProgress: (fraction: number) => void) {
  const ext = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/gif' ? 'gif' : 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;
  await axios.post(`${supabaseUrl}/storage/v1/object/avatars/${path}`, blob, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anonKey,
      'Content-Type': blob.type,
      // The name never changes its contents, so it can be cached for a year
      'Cache-Control': 'max-age=31536000',
      'x-upsert': 'false',
    },
    onUploadProgress: (e) => {
      if (e.total) onProgress(e.loaded / e.total);
    },
  });
  return `${supabaseUrl}/storage/v1/object/public/avatars/${path}`;
}

// Resolves once the browser has the new photo ready, so swapping it in never flashes
export function preload(src: string) {
  const img = new Image();
  img.src = src;
  return img.decode().catch(() => {});
}
