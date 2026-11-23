/**
 * Conexión con Firebase (Firestore + Authentication) usando su API web, sin librerías externas.
 *
 * - La tienda LEE productos, inventario y ajustes sin iniciar sesión.
 * - Solo las administradoras (colección "admins") pueden EDITAR. Lo garantizan las reglas de
 *   seguridad de Firestore (archivo firestore.rules), no este archivo.
 * - Una clienta solo puede descontar unidades del inventario creando un pedido en la misma
 *   operación, y nunca por debajo de 0 (también lo controlan las reglas).
 * - Las fotos se guardan reducidas DENTRO de Firestore (sin Firebase Storage): todo gratis.
 * - Si Firebase no está configurado, la tienda usa data/products.json.
 */
import { CONFIG } from './config.js';
import { storage } from './utils.js';

const SESSION_KEY = 'soles_admin_session';
export const isConfigured = () => Boolean(CONFIG.firebase?.apiKey && CONFIG.firebase?.projectId);

/* ---------------- Direcciones (producción o emulador local para pruebas) ---------------- */
const emu = () => CONFIG.firebase.emulatorHost; // p. ej. 'localhost' (solo pruebas)
const fsBase = () => (emu() ? `http://${emu()}:8080` : 'https://firestore.googleapis.com')
  + `/v1/projects/${CONFIG.firebase.projectId}/databases/(default)/documents`;
const docName = (path) => `projects/${CONFIG.firebase.projectId}/databases/(default)/documents/${path}`;
const authUrl = (method) => (emu() ? `http://${emu()}:9099/` : 'https://')
  + `identitytoolkit.googleapis.com/v1/accounts:${method}?key=${CONFIG.firebase.apiKey}`;
const tokenUrl = () => (emu() ? `http://${emu()}:9099/` : 'https://') + `securetoken.googleapis.com/v1/token?key=${CONFIG.firebase.apiKey}`;

/* ---------------- Conversión a/desde el formato de Firestore ---------------- */
export function toFs(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFs) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => [k, toFs(x)])) } };
}
export function fromFs(f) {
  if (!f) return null;
  if ('nullValue' in f) return null;
  if ('booleanValue' in f) return f.booleanValue;
  if ('integerValue' in f) return Number(f.integerValue);
  if ('doubleValue' in f) return f.doubleValue;
  if ('stringValue' in f) return f.stringValue;
  if ('timestampValue' in f) return f.timestampValue;
  if ('arrayValue' in f) return (f.arrayValue.values || []).map(fromFs);
  if ('mapValue' in f) return fieldsToObj(f.mapValue.fields || {});
  return null;
}
const fieldsToObj = (fields) => Object.fromEntries(Object.entries(fields || {}).map(([k, v]) => [k, fromFs(v)]));
const objToFields = (o) => toFs(o).mapValue.fields;
/** Ruta de campo segura para claves con espacios o símbolos: items.`s001|110 Marfil` */
export const fieldPath = (...parts) => parts.map((p) => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(p) ? p : `\`${p.replace(/\\/g, '\\\\').replace(/`/g, '\\`')}\``)).join('.');

/* ---------------- Sesión de la administradora ---------------- */
export const getSession = () => storage.get(SESSION_KEY, null);
const saveSession = (idToken, refreshToken, expiresIn, email) => storage.set(SESSION_KEY, { idToken, refreshToken, expiresAt: Date.now() + Number(expiresIn || 3600) * 1000, email });
export const clearSession = () => storage.remove(SESSION_KEY);

function authError(code = '') {
  if (/INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD|EMAIL_NOT_FOUND/.test(code)) return 'Correo o contraseña incorrectos.';
  if (/EMAIL_EXISTS/.test(code)) return 'Ya existe un acceso con este correo. Inicia sesión o recupera tu contraseña.';
  if (/WEAK_PASSWORD/.test(code)) return 'La contraseña debe tener al menos 8 caracteres.';
  if (/TOO_MANY_ATTEMPTS/.test(code)) return 'Demasiados intentos. Espera unos minutos y vuelve a intentar.';
  if (/OPERATION_NOT_ALLOWED/.test(code)) return 'El inicio de sesión con correo no está activado en Firebase (Authentication → Método de acceso).';
  return 'No se pudo completar. Revisa tu conexión e inténtalo de nuevo.';
}
async function authPost(method, body) {
  const res = await fetch(authUrl(method), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(authError(data.error?.message));
  return data;
}

export async function signIn(email, password) {
  const r = await authPost('signInWithPassword', { email, password, returnSecureToken: true });
  const info = await authPost('lookup', { idToken: r.idToken });
  if (!info.users?.[0]?.emailVerified) {
    const e = new Error('Primero confirma tu correo: abre el enlace que te enviamos (revisa también spam).');
    e.unverifiedToken = r.idToken; throw e;
  }
  saveSession(r.idToken, r.refreshToken, r.expiresIn, r.email);
  return r;
}
export async function signUp(email, password) {
  const r = await authPost('signUp', { email, password, returnSecureToken: true });
  await authPost('sendOobCode', { requestType: 'VERIFY_EMAIL', idToken: r.idToken });
  return r;
}
export const resendVerification = (idToken) => authPost('sendOobCode', { requestType: 'VERIFY_EMAIL', idToken });
export const sendRecovery = (email) => authPost('sendOobCode', { requestType: 'PASSWORD_RESET', email });
export const signOut = async () => clearSession();

/** Token vigente (lo renueva solo si está por vencer). */
export async function idToken() {
  const s = getSession();
  if (!s) return null;
  if (Date.now() < s.expiresAt - 60_000) return s.idToken;
  try {
    const res = await fetch(tokenUrl(), { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(s.refreshToken)}` });
    const d = await res.json();
    if (!res.ok) throw new Error();
    saveSession(d.id_token, d.refresh_token, d.expires_in, s.email);
    return d.id_token;
  } catch { clearSession(); return null; }
}

/* ---------------- Firestore ---------------- */
async function fs(path, { method = 'GET', body, auth = false } = {}) {
  const token = auth ? await idToken() : null;
  const res = await fetch(`${fsBase()}${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 404 && method === 'GET') return null;
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    const err = new Error(res.status === 403 || e.error?.status === 'PERMISSION_DENIED'
      ? 'No tienes permiso para hacer esto. ¿Tu correo está registrado como administradora?'
      : 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.');
    err.status = res.status; err.denied = res.status === 403; throw err;
  }
  return res.status === 204 ? null : res.json().catch(() => null);
}
const getDoc = async (path, auth = false) => { const d = await fs(`/${path}`, { auth }); return d ? fieldsToObj(d.fields) : null; };
async function listDocs(collection, auth = false) {
  const out = []; let page = '';
  do {
    const d = await fs(`/${collection}?pageSize=300${page ? `&pageToken=${page}` : ''}`, { auth });
    (d?.documents || []).forEach((doc) => out.push({ id: doc.name.split('/').pop(), ...fieldsToObj(doc.fields), _createTime: doc.createTime }));
    page = d?.nextPageToken || '';
  } while (page);
  return out;
}
const commit = (writes, auth = false) => fs(':commit', { method: 'POST', body: { writes }, auth });
const setWrite = (path, obj) => ({ update: { name: docName(path), fields: objToFields(obj) } });
const deleteWrite = (path) => ({ delete: docName(path) });

/* ---------------- Lectura pública (tienda) ---------------- */
export async function fetchCatalog() {
  const [products, inv] = await Promise.all([listDocs('products'), getDoc('inventory/stock')]);
  return { products: products.filter((p) => p.active !== false).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)), inventory: inv?.items || null };
}
export const fetchSettings = async () => (await getDoc('settings/store'))?.value || null;
export const fetchGallery = async (id) => (await getDoc(`productImages/${id}`))?.images || null;
export const fetchInventory = async () => (await getDoc('inventory/stock'))?.items || {};

/** Clave de inventario: un producto sin tonos usa "id|". */
export const invKey = (id, tone) => `${id}|${tone || ''}`;

/* ---------------- Clientas: pedido + descuento de unidades en UNA operación ---------------- */
export async function placeOrderFb(order) {
  const qty = {};
  order.items.forEach((i) => { const k = invKey(i.id, i.tone); qty[k] = (qty[k] || 0) + i.qty; });
  const writes = [
    { update: { name: docName(`orders/${order.id}`), fields: objToFields({ status: 'nuevo', data: order }) },
      currentDocument: { exists: false }, updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }] },
    { update: { name: docName('inventory/stock'), fields: objToFields({ lastOrder: order.id, lastItems: Object.keys(qty) }) }, updateMask: { fieldPaths: ['lastOrder', 'lastItems'] },
      currentDocument: { exists: true },
      updateTransforms: Object.entries(qty).map(([k, q]) => ({ fieldPath: fieldPath('items', k), increment: { integerValue: String(-q) } })) },
  ];
  return commit(writes);
}

/** Registro de autorizaciones / mensajes: solo se pueden crear (con hora del servidor). */
export const addRecord = (collection, field, value) => commit([
  { update: { name: docName(`${collection}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`), fields: objToFields({ [field]: value }) },
    currentDocument: { exists: false }, updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }] },
]);

/* ---------------- Administración ---------------- */
export async function amIAdmin() {
  const s = getSession(); if (!s) return false;
  try { return Boolean(await fs(`/admins/${encodeURIComponent(s.email.toLowerCase())}`, { auth: true })); } catch { return false; }
}
export const adminProducts = async () => (await listDocs('products', true)).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
export const adminInventory = async () => (await getDoc('inventory/stock', true))?.items || {};
export const adminGallery = (id) => getDoc(`productImages/${id}`, true).then((d) => d?.images || null);

/** Guarda producto (+ fotos grandes) y fija sus unidades en el inventario. */
export async function saveProductFb(product, { gallery = null, stock = null, removedKeys = [] } = {}) {
  const writes = [setWrite(`products/${product.id}`, product)];
  if (gallery) writes.push(setWrite(`productImages/${product.id}`, { images: gallery }));
  if (stock) {
    const keys = [...Object.keys(stock), ...removedKeys];
    writes.push({ update: { name: docName('inventory/stock'), fields: objToFields({ items: stock }) }, updateMask: { fieldPaths: keys.map((k) => fieldPath('items', k)) } });
  }
  return commit(writes, true);
}
export async function deleteProductFb(product) {
  const keys = product.tones?.length ? product.tones.map((t) => invKey(product.id, t.name)) : [invKey(product.id)];
  return commit([deleteWrite(`products/${product.id}`), deleteWrite(`productImages/${product.id}`),
    { update: { name: docName('inventory/stock'), fields: {} }, updateMask: { fieldPaths: keys.map((k) => fieldPath('items', k)) } }], true);
}
export const setProductFields = (id, obj) => commit([{ update: { name: docName(`products/${id}`), fields: objToFields(obj) }, updateMask: { fieldPaths: Object.keys(obj) } }], true);

/** Copia los productos de data/products.json a Firestore, con su inventario. */
export async function seedFb(list) {
  const items = {};
  list.forEach((p) => {
    if (p.tones?.length) p.tones.forEach((t) => { items[invKey(p.id, t.name)] = Number(t.stock ?? p.stock) || 0; });
    else items[invKey(p.id)] = Number(p.stock) || 0;
  });
  const writes = list.map((p, i) => setWrite(`products/${p.id}`, { ...p, sort: i, active: true }));
  writes.push({ update: { name: docName('inventory/stock'), fields: objToFields({ items, lastOrder: '', lastItems: [] }) } });
  return commit(writes, true);
}

export const saveSettingsFb = (value) => commit([setWrite('settings/store', { value })], true);

export const listAdmins = () => listDocs('admins', true);
export const addAdmin = (email) => commit([{ ...setWrite(`admins/${email.toLowerCase()}`, { email: email.toLowerCase(), addedAt: new Date().toISOString() }), currentDocument: { exists: false } }], true);
export const removeAdmin = (email) => commit([deleteWrite(`admins/${email.toLowerCase()}`)], true);

export const listOrders = async () => (await listDocs('orders', true)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
export const setOrderStatus = (id, status) => commit([{ update: { name: docName(`orders/${id}`), fields: objToFields({ status }) }, updateMask: { fieldPaths: ['status'] } }], true);
/** Cancelar: marca el pedido y devuelve las unidades, todo junto. */
export async function cancelOrderFb(order) {
  const qty = {};
  (order.data?.items || []).forEach((i) => { const k = invKey(i.id, i.tone); qty[k] = (qty[k] || 0) + i.qty; });
  return commit([
    { update: { name: docName(`orders/${order.id}`), fields: objToFields({ status: 'cancelado' }) }, updateMask: { fieldPaths: ['status'] } },
    { transform: { document: docName('inventory/stock'), fieldTransforms: Object.entries(qty).map(([k, q]) => ({ fieldPath: fieldPath('items', k), increment: { integerValue: String(q) } })) } },
  ], true);
}

export const listCollection = (name) => listDocs(name, true);
export const deleteDoc = (path) => commit([deleteWrite(path)], true);
