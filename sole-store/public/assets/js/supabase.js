/**
 * Conexión con Supabase (base de datos + inicio de sesión + fotos), sin librerías externas.
 *
 * - La tienda LEE productos y ajustes con la clave pública (anon). Cualquiera puede leer.
 * - Solo las administradoras (tabla "admins") pueden ESCRIBIR. Eso lo garantiza la base de
 *   datos con sus reglas (ver supabase/setup.sql), no este archivo.
 * - Si Supabase no está configurado, la tienda sigue funcionando con data/products.json.
 */
import { CONFIG } from './config.js';
import { storage } from './utils.js';

const SESSION_KEY = 'sole_admin_session';
export const BUCKET = 'product-images';

export const isConfigured = () => Boolean(CONFIG.supabase?.url && CONFIG.supabase?.anonKey);
const base = () => CONFIG.supabase.url.replace(/\/$/, '');

/* ---------------- Sesión de la administradora ---------------- */
export const getSession = () => storage.get(SESSION_KEY, null);
const saveSession = (s) => storage.set(SESSION_KEY, { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: Date.now() + (s.expires_in || 3600) * 1000, email: s.user?.email });
export const clearSession = () => storage.remove(SESSION_KEY);

async function authCall(path, body, { method = 'POST', token } = {}) {
  const res = await fetch(`${base()}/auth/v1/${path}`, {
    method, headers: { apikey: CONFIG.supabase.anonKey, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(translateAuthError(data));
  return data;
}

function translateAuthError(d) {
  const m = `${d.error_description || d.msg || d.message || d.error || ''}`.toLowerCase();
  if (m.includes('invalid login')) return 'Correo o contraseña incorrectos.';
  if (m.includes('not confirmed')) return 'Primero confirma tu correo: revisa tu bandeja de entrada (y la carpeta de spam).';
  if (m.includes('already registered')) return 'Ya existe un acceso con este correo. Inicia sesión o recupera tu contraseña.';
  if (m.includes('password')) return 'La contraseña debe tener al menos 8 caracteres.';
  if (m.includes('rate limit')) return 'Demasiados intentos. Espera unos minutos y vuelve a intentar.';
  return 'No se pudo completar. Revisa tu conexión e inténtalo de nuevo.';
}

const adminUrl = () => new URL('admin.html', location.href).href;

export async function signIn(email, password) {
  const s = await authCall('token?grant_type=password', { email, password });
  saveSession(s); return s;
}
export const signUp = (email, password) => authCall(`signup?redirect_to=${encodeURIComponent(adminUrl())}`, { email, password });
export const sendRecovery = (email) => authCall(`recover?redirect_to=${encodeURIComponent(adminUrl())}`, { email });
export async function setNewPassword(password) {
  const token = await accessToken();
  return authCall('user', { password }, { method: 'PUT', token });
}
export async function signOut() {
  const s = getSession();
  if (s) authCall('logout', null, { token: s.access_token }).catch(() => {});
  clearSession();
}

/** Cuando la persona llega desde el enlace del correo (confirmación o recuperación). */
export function consumeLinkFromEmail() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (!h.get('access_token')) return null;
  saveSession({ access_token: h.get('access_token'), refresh_token: h.get('refresh_token'), expires_in: Number(h.get('expires_in')) || 3600 });
  history.replaceState(null, '', location.pathname);
  return h.get('type'); // 'signup' | 'recovery' | 'magiclink'
}

/** Token vigente (lo renueva solo si está por vencer). */
export async function accessToken() {
  const s = getSession();
  if (!s) return null;
  if (Date.now() < s.expires_at - 60_000) return s.access_token;
  try {
    const n = await authCall('token?grant_type=refresh_token', { refresh_token: s.refresh_token });
    saveSession(n); return n.access_token;
  } catch { clearSession(); return null; }
}

/* ---------------- Base de datos (PostgREST) ---------------- */
export async function db(path, { method = 'GET', body, prefer, auth = false } = {}) {
  const token = auth ? await accessToken() : null;
  const res = await fetch(`${base()}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: CONFIG.supabase.anonKey, ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Sin sesión basta la clave pública (sirve la 'anon' antigua y la nueva 'publishable').
      'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    // Errores de negocio de place_order (inventario) se devuelven tal cual para mostrarlos a la clienta.
    if (/^(SIN_STOCK|PEDIDO_INVALIDO)/.test(e.message || '')) throw new Error(e.message);
    throw new Error(res.status === 401 || res.status === 403 || e.code === '42501'
      ? 'No tienes permiso para hacer esto. ¿Tu correo está registrado como administradora?'
      : 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.');
  }
  return res.status === 204 ? null : res.json().catch(() => null);
}

/* ---------------- Fotos ---------------- */
export async function uploadImage(path, blob) {
  const token = await accessToken();
  const res = await fetch(`${base()}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: { apikey: CONFIG.supabase.anonKey, Authorization: `Bearer ${token}`, 'Content-Type': blob.type, 'x-upsert': 'true' },
    body: blob,
  });
  if (!res.ok) throw new Error('No se pudo subir la foto.');
  return `${base()}/storage/v1/object/public/${BUCKET}/${path}`;
}

/* ---------------- Lectura pública para la tienda ---------------- */
export async function fetchPublicProducts() {
  const rows = await db('products?select=data,sort&active=eq.true&order=sort.asc');
  return rows.map((r) => r.data);
}
export async function fetchSettings() {
  const rows = await db('settings?select=value&key=eq.store');
  return rows[0]?.value || null;
}
