// Photos shrunk to a square in the browser before they upload (profile photos and the polaroid in a letter's flowers).
// Re-encoding also drops the photo's location and camera data.
import axios from 'axios';

const MAX_SIDE = 8000; // Larger pictures can blow the canvas memory on phones
const MAX_GIF = 2 * 1024 * 1024; // Matches the buckets' limit; a GIF loads every time it's shown
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export class PhotoError extends Error {}

// Center-crops to a square at most `size` pixels wide and re-encodes as WebP (JPEG where the browser can't).
// A GIF uploads as it is so it keeps moving (a canvas holds one frame); where it's shown crops it.
export async function preparePhoto(file: File, size: number): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new PhotoError('Pick a photo (JPG, PNG, WebP or GIF).');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new PhotoError("That photo couldn't be opened. Try a JPG or PNG.");
  }
  if (file.type === 'image/gif') {
    bitmap.close();
    if (file.size > MAX_GIF) throw new PhotoError('That GIF is too large. Pick one under 2 MB.');
    return file;
  }
  const side = Math.min(bitmap.width, bitmap.height);
  if (!side || Math.max(bitmap.width, bitmap.height) > MAX_SIDE) {
    bitmap.close();
    throw new PhotoError('That photo is too large. Try a smaller one.');
  }
  const out = Math.min(size, side);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = out;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new PhotoError("That photo couldn't be opened. Try a JPG or PNG.");
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, out, out);
  bitmap.close();
  const encode = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  // Safari can't write WebP and silently returns a PNG instead; JPEG is the small fallback
  const webp = await encode('image/webp', 0.85);
  const blob = webp?.type === 'image/webp' ? webp : await encode('image/jpeg', 0.88);
  if (!blob) throw new PhotoError("That photo couldn't be opened. Try a JPG or PNG.");
  return blob;
}

// Uploads into the user's own folder of a bucket with real progress, and returns the file's path in the bucket.
// Every upload gets a new name, so its address is new and no browser or CDN can show an older copy.
export async function uploadPhoto(bucket: string, name: string, blob: Blob, userId: string, token: string, onProgress: (fraction: number) => void) {
  const ext = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/gif' ? 'gif' : 'jpg';
  const path = `${userId}/${name}.${ext}`;
  await axios.post(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, blob, {
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
  return path;
}

// A letter's polaroid before it's sent: the file to upload and a data address to show meanwhile
// (a data address needs no clean-up, unlike a blob address).
export interface LetterPhoto {
  blob: Blob;
  src: string;
}

// 1080 stays sharp when the polaroid is pulled out to full size on any screen
export async function prepareLetterPhoto(file: File): Promise<LetterPhoto> {
  const blob = await preparePhoto(file, 1080);
  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new PhotoError("That photo couldn't be opened. Try a JPG or PNG."));
    reader.readAsDataURL(blob);
  });
  return { blob, src };
}

// The bucket is private; the love-letters function signs a link to read it
export const uploadLetterPhoto = (blob: Blob, userId: string, token: string, onProgress: (fraction: number) => void) =>
  uploadPhoto('letter-images', crypto.randomUUID(), blob, userId, token, onProgress);
