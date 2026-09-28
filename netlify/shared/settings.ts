import type { SupabaseClient } from '@supabase/supabase-js';
import { withDefaults } from '../../src/settings';
import type { ShopSettings } from '../../src/types';

/** Réglages enregistrés par le propriétaire (valeurs par défaut si absents). */
export async function loadSettings(supabase: SupabaseClient): Promise<ShopSettings> {
  const { data } = await supabase.from('settings').select('data').eq('id', 1).maybeSingle();
  return withDefaults(data?.data as Partial<ShopSettings> | undefined);
}
