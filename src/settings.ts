import { SHOP } from './config';
import { SHIPPING } from './shipping';
import { ShopSettings } from './types';

export const DEFAULT_SETTINGS: ShopSettings = {
  announcement: '',
  announcement_active: false,
  shipping_cents: SHIPPING.priceCents,
  free_shipping_from_cents: SHIPPING.freeFromCents,
  shipping_min_days: SHIPPING.minDays,
  shipping_max_days: SHIPPING.maxDays,
  email: SHOP.email,
  phone: SHOP.phone,
  whatsapp: SHOP.whatsapp,
  address: SHOP.address,
  instagram: SHOP.instagram,
  facebook: SHOP.facebook,
};

/** Complète les réglages enregistrés avec les valeurs par défaut (champs ajoutés plus tard). */
export function withDefaults(data: Partial<ShopSettings> | null | undefined): ShopSettings {
  return { ...DEFAULT_SETTINGS, ...(data ?? {}) };
}
