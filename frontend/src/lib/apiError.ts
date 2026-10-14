// The backend's `{ error }` message from a failed axios call, or the fallback.
export const apiError = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;
