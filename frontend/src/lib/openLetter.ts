import axios from 'axios';
import { supabase } from './supabase';

// Break a letter's seal for the person it was written to. If the request fails the letter
// just shows sealed again next visit, so reading never waits on it or reports it.
export async function openLetter(id: string) {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  await axios
    .post(`${import.meta.env.VITE_BACKEND_URL}/love-letters/${id}/open`, {}, { headers: { Authorization: `Bearer ${token}` } })
    .catch(() => {});
}
