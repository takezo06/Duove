// Photos tucked into a letter's flowers. The bucket is private: browsers may only upload into their own
// folder, and a photo is read through a link signed here, for letters the caller is already allowed to see.
export const LETTER_PHOTOS = "letter-images";

// Long enough to read a letter, short enough that a copied link soon stops working
const LINK_SECONDS = 60 * 60;

// "<sender id>/<uuid>.<ext>", the only shape the browser uploads
export const isOwnPhotoPath = (path: string, userId: string) =>
  path.startsWith(`${userId}/`) && /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(webp|jpg|gif)$/i.test(path);

// Swaps each row's photo_path for a signed photo_url (null without a photo, or if signing failed),
// with one request for the whole list.
// deno-lint-ignore no-explicit-any
export async function signPhotos(admin: any, rows: Record<string, unknown>[]) {
  const paths = rows.map((r) => r.photo_path).filter((p): p is string => typeof p === "string" && p !== "");
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data, error } = await admin.storage.from(LETTER_PHOTOS).createSignedUrls([...new Set(paths)], LINK_SECONDS);
    if (error) console.error("letter photos: signing failed", error);
    for (const s of data ?? []) if (s.signedUrl && s.path) urls.set(s.path, s.signedUrl);
  }
  return rows.map(({ photo_path, ...row }) => ({ ...row, photo_url: typeof photo_path === "string" ? urls.get(photo_path) ?? null : null }));
}

// A signed link for one photo, or null when it isn't in the bucket
// deno-lint-ignore no-explicit-any
export async function signPhoto(admin: any, path: string): Promise<string | null> {
  const { data, error } = await admin.storage.from(LETTER_PHOTOS).createSignedUrl(path, LINK_SECONDS);
  return error ? null : data?.signedUrl ?? null;
}

// Deletes the photos of every letter in these relationships, and anything left in the user's own folder
// (a photo that uploaded but whose letter never saved). Run it before the rows go: Storage sits outside
// the database's cascades. Returns false when something couldn't be deleted.
// deno-lint-ignore no-explicit-any
export async function removeLetterPhotos(admin: any, relationshipIds: string[], userId?: string): Promise<boolean> {
  const paths = new Set<string>();
  if (relationshipIds.length) {
    const { data, error } = await admin
      .from("love_letters")
      .select("photo_path")
      .in("relationship_id", relationshipIds)
      .not("photo_path", "is", null);
    if (error) return false;
    for (const r of data ?? []) paths.add(r.photo_path);
  }
  if (userId) {
    const { data, error } = await admin.storage.from(LETTER_PHOTOS).list(userId, { limit: 1000 });
    if (error) return false;
    for (const f of data ?? []) paths.add(`${userId}/${f.name}`);
  }
  const all = [...paths];
  for (let i = 0; i < all.length; i += 1000) {
    const { error } = await admin.storage.from(LETTER_PHOTOS).remove(all.slice(i, i + 1000));
    if (error) return false;
  }
  return true;
}
