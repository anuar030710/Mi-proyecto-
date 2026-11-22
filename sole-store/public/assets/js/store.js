/**
 * Estado del carrito y favoritos, guardado en localStorage para que sobreviva a recargas.
 * Otros módulos se suscriben con onChange() para refrescar contadores y vistas.
 */
import { CONFIG } from './config.js';
import { storage, formatPrice } from './utils.js';
import { finalPrice, findProduct } from './products.js';

const CART_KEY = 'sole_cart';
const FAV_KEY = 'sole_favorites';
const COUPON_KEY = 'sole_coupon';
const listeners = new Set();

export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = (type) => listeners.forEach((fn) => fn(type));

/* Sincroniza entre pestañas abiertas. */
window.addEventListener('storage', (e) => {
  if ([CART_KEY, FAV_KEY, COUPON_KEY].includes(e.key)) emit(e.key === FAV_KEY ? 'favorites' : 'cart');
});

/* ---------------- Carrito ---------------- */
export const getCart = () => storage.get(CART_KEY, []);
const saveCart = (items) => { storage.set(CART_KEY, items); emit('cart'); };
const keyOf = (id, tone) => `${id}::${tone || ''}`;

export const cartCount = () => getCart().reduce((n, i) => n + i.qty, 0);

/** Agrega respetando el stock. Devuelve la cantidad realmente agregada. */
export function addToCart(product, tone, qty = 1) {
  const items = getCart();
  const key = keyOf(product.id, tone);
  const inCart = items.filter((i) => i.id === product.id).reduce((n, i) => n + i.qty, 0);
  const allowed = Math.max(0, Math.min(qty, product.stock - inCart));
  if (!allowed) return 0;
  const existing = items.find((i) => i.key === key);
  if (existing) existing.qty += allowed;
  else items.push({ key, id: product.id, tone: tone || null, qty: allowed });
  saveCart(items);
  return allowed;
}

export function setQty(key, qty, maxStock) {
  const items = getCart();
  const item = items.find((i) => i.key === key);
  if (!item) return;
  item.qty = Math.max(1, Math.min(qty, maxStock));
  saveCart(items);
}

export const removeFromCart = (key) => saveCart(getCart().filter((i) => i.key !== key));
export const clearCart = () => { saveCart([]); storage.remove(COUPON_KEY); };

/** Une los ítems con los datos actuales del catálogo (precio vigente, stock, imagen). */
export function cartLines(products) {
  return getCart().map((i) => {
    const p = findProduct(products, i.id);
    if (!p) return null;
    const tone = p.tones.find((t) => t.name === i.tone) || null;
    const unit = finalPrice(p);
    return { ...i, product: p, toneObj: tone, unit, total: unit * i.qty };
  }).filter(Boolean);
}

/* ---------------- Cupones ---------------- */
export const getCoupon = () => storage.get(COUPON_KEY, null);
export function applyCoupon(code, subtotal) {
  const c = CONFIG.coupons[String(code).trim().toUpperCase()];
  if (!c) return { ok: false, error: 'Este cupón no existe o ya no está vigente.' };
  if (c.minSubtotal && subtotal < c.minSubtotal) return { ok: false, error: `Este cupón aplica en compras desde ${formatPrice(c.minSubtotal)}.` };
  storage.set(COUPON_KEY, String(code).trim().toUpperCase()); emit('cart');
  return { ok: true, coupon: c };
}
export const removeCoupon = () => { storage.remove(COUPON_KEY); emit('cart'); };

/** Totales del pedido. shippingId: método elegido en checkout (por defecto el primero). */
export function totals(products, shippingId) {
  const lines = cartLines(products);
  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const code = getCoupon();
  const coupon = code ? CONFIG.coupons[code] : null;
  let discount = 0;
  let couponValid = !!coupon;
  if (coupon && coupon.minSubtotal && subtotal < coupon.minSubtotal) couponValid = false;
  if (couponValid && coupon.type === 'percent') discount = Math.round(subtotal * coupon.value / 100);
  if (couponValid && coupon.type === 'fixed') discount = Math.min(coupon.value, subtotal);
  const method = CONFIG.shippingMethods.find((m) => m.id === shippingId) || CONFIG.shippingMethods[0];
  const afterDiscount = subtotal - discount;
  const freeByAmount = afterDiscount >= CONFIG.freeShippingFrom;
  const freeByCoupon = couponValid && coupon.type === 'shipping';
  // El envío gratis por monto aplica al envío estándar; express se cobra siempre salvo cupón.
  const shippingFree = freeByCoupon || (freeByAmount && method.id === CONFIG.shippingMethods[0].id);
  const shipping = lines.length === 0 ? 0 : shippingFree ? 0 : method.price;
  return {
    lines, subtotal, discount, shipping, total: afterDiscount + shipping, method,
    coupon: couponValid ? { code, ...coupon } : null, couponInvalid: !!coupon && !couponValid,
    missingForFree: Math.max(0, CONFIG.freeShippingFrom - afterDiscount),
  };
}

/* ---------------- Favoritos ---------------- */
export const getFavorites = () => storage.get(FAV_KEY, []);
export const isFavorite = (id) => getFavorites().includes(id);
export function toggleFavorite(id) {
  const favs = getFavorites();
  const next = favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id];
  storage.set(FAV_KEY, next); emit('favorites');
  return next.includes(id);
}
