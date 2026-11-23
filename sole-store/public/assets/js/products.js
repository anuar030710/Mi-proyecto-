/**
 * Acceso al catálogo (data/products.json) y reglas de precio/etiquetas.
 */
import { CONFIG } from './config.js';
import { isConfigured, fetchCatalog, invKey } from './firebase.js';

let cache = null;
/** De dónde salió el catálogo: 'firebase' (panel) o 'archivo' (data/products.json). */
export let catalogSource = 'archivo';

/** Carga los productos una sola vez por página. */
export async function loadProducts() {
  if (cache) return cache;
  // 1) Productos e inventario del panel (Firebase). 2) Si no hay, el archivo data/products.json.
  if (isConfigured()) {
    try {
      const { products: remote, inventory } = await fetchCatalog();
      if (remote.length && inventory) { cache = remote.map((p) => withInventory(p, inventory)); catalogSource = 'firebase'; return cache; }
    } catch (e) { console.warn('Usando data/products.json:', e.message); }
  }
  const res = await fetch('data/products.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('No se pudo cargar el catálogo');
  const data = await res.json();
  cache = data.products;
  return cache;
}

/** Aplica las unidades del inventario (por tono o por producto) al producto. */
function withInventory(p, inv) {
  const tones = (p.tones || []).map((t) => ({ ...t, stock: inv ? (inv[invKey(p.id, t.name)] ?? 0) : (t.stock ?? 0) }));
  const stock = tones.length ? tones.reduce((n, t) => n + Math.max(0, t.stock), 0) : (inv ? (inv[invKey(p.id)] ?? 0) : (p.stock ?? 0));
  return { ...p, tones, stock, reviews: p.reviews || [], skinTypes: p.skinTypes || [], images: p.images?.length ? p.images : [p.image] };
}

export const findProduct = (products, idOrSlug) => products.find((p) => p.id === idOrSlug || p.slug === idOrSlug);

/** Precio final con descuento aplicado (redondeado a 100 en COP). */
export function finalPrice(p) {
  if (!p.discount) return p.price;
  const raw = p.price * (1 - p.discount / 100);
  return CONFIG.decimals === 0 ? Math.round(raw / 100) * 100 : Math.round(raw * 100) / 100;
}

const DAYS_NEW = 45;
export function isNew(p) {
  return (Date.now() - new Date(p.createdAt).getTime()) / 86400000 <= DAYS_NEW;
}
/* ---------- Inventario ----------
   Si el producto tiene tonos con "stock", las unidades se cuentan por tono (cada tono es una
   referencia). Si no, se usa el "stock" del producto. */
export const hasToneStock = (p) => p.tones.length > 0 && p.tones.some((t) => typeof t.stock === 'number');
export const totalStock = (p) => (hasToneStock(p) ? p.tones.reduce((s, t) => s + Math.max(0, t.stock || 0), 0) : Math.max(0, p.stock || 0));
/** Unidades disponibles de un producto en un tono concreto. */
export function stockOf(p, toneName) {
  if (!hasToneStock(p)) return Math.max(0, p.stock || 0);
  const t = p.tones.find((x) => x.name === toneName);
  return t ? Math.max(0, t.stock || 0) : 0;
}
/** Primer tono con unidades (o el primero, si todos están agotados). */
export const firstAvailableTone = (p) => (p.tones.find((t) => stockOf(p, t.name) > 0) || p.tones[0] || null);
export const isOut = (p) => totalStock(p) <= 0;
export const isLow = (p, toneName) => { const n = toneName === undefined ? totalStock(p) : stockOf(p, toneName); return n > 0 && n <= CONFIG.lowStockThreshold; };

/** Etiquetas visibles: Agotado, Oferta -X%, Nuevo, Últimas unidades. */
export function badges(p) {
  const list = [];
  if (isOut(p)) list.push({ cls: 'badge--out', text: 'Agotado' });
  if (p.discount) list.push({ cls: 'badge--sale', text: `Oferta -${p.discount}%` });
  if (isNew(p)) list.push({ cls: 'badge--new', text: 'Nuevo' });
  if (isLow(p)) list.push({ cls: 'badge--low', text: 'Últimas unidades' });
  return list;
}

export const productUrl = (p) => `producto.html?id=${encodeURIComponent(p.slug)}`;
