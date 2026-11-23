/**
 * Ajustes editables desde el panel (nombre, WhatsApp, datos legales, envíos, pagos, cupones).
 * Se leen de Firebase y reemplazan los valores por defecto de config.js.
 */
import { CONFIG } from './config.js';
import { isConfigured, fetchSettings } from './firebase.js';

/** Campos que la administradora puede cambiar desde el panel. */
export const EDITABLE_KEYS = ['storeName', 'tagline', 'whatsapp', 'company', 'paymentOptions', 'freeShippingFrom', 'shippingMethods', 'coupons'];

let loaded = null;

/** Aplica unos ajustes sobre CONFIG (sin tocar lo que no viene). */
export function applySettings(s) {
  if (!s) return;
  EDITABLE_KEYS.forEach((k) => {
    if (s[k] === undefined || s[k] === null) return;
    CONFIG[k] = (typeof s[k] === 'object' && !Array.isArray(s[k])) ? { ...CONFIG[k], ...s[k] } : s[k];
  });
}

export function loadSettings() {
  if (!isConfigured()) return Promise.resolve();
  loaded ??= fetchSettings().then(applySettings).catch((e) => console.warn('Ajustes no disponibles:', e.message));
  return loaded;
}
