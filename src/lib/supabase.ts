import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Sans configuration Supabase, le site tourne en mode démonstration. */
export const DEMO_MODE = !url || !key;

export const supabase: SupabaseClient | null = DEMO_MODE ? null : createClient(url!, key!);

export function db(): SupabaseClient {
  if (!supabase) throw new Error('Supabase n’est pas configuré (fichier .env manquant).');
  return supabase;
}
