/**
 * Carrito lateral (drawer). Se abre al agregar un producto y desde el ícono del header.
 * Accesible: role="dialog", foco atrapado, se cierra con Esc o tocando fuera.
 */
import { CONFIG } from '../config.js';
import { $, formatPrice, escapeHTML, trapFocus } from '../utils.js';
import { loadProducts, productUrl, stockOf } from '../products.js';
import { totals, setQty, removeFromCart, onChange } from '../store.js';
import { ICONS } from '../icons.js';

let drawer, release;

/** Barra "Te faltan $X para envío gratis". Se reutiliza en carrito y drawer. */
export function shippingProgressHTML(t) {
  const pct = Math.min(100, Math.round(((CONFIG.freeShippingFrom - t.missingForFree) / CONFIG.freeShippingFrom) * 100));
  const msg = t.missingForFree > 0
    ? `Te faltan <strong>${formatPrice(t.missingForFree)}</strong> para el <strong>envío gratis</strong>.`
    : '¡Tu pedido tiene <strong>envío estándar gratis</strong>!';
  return `<div class="ship-progress"><p style="margin:0">${msg}</p><div class="ship-progress__bar" role="progressbar" aria-label="Progreso hacia el envío gratis" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div></div>`;
}

/** Resumen de totales: lo usan carrito y checkout. */
export function summaryRows(t, { shippingLabel = 'Envío estándar (estimado)' } = {}) {
  return `
    <div class="summary-row"><span>Subtotal</span><span>${formatPrice(t.subtotal)}</span></div>
    ${t.discount ? `<div class="summary-row summary-row--discount"><span>Descuento (${escapeHTML(t.coupon.code)})</span><span>−${formatPrice(t.discount)}</span></div>` : ''}
    <div class="summary-row"><span>${shippingLabel}</span><span>${t.shipping === 0 ? '<strong style="color:var(--success)">Gratis</strong>' : formatPrice(t.shipping)}</span></div>
    <div class="summary-row summary-row--total"><span>Total</span><span>${formatPrice(t.total)}</span></div>
    <p class="small muted">Precios con IVA incluido.</p>`;
}

/** HTML de una línea de carrito (drawer y página de carrito). */
export function lineItemHTML(l, { showTotal = false } = {}) {
  const p = l.product;
  return `
  <div class="line-item" data-key="${escapeHTML(l.key)}">
    <a href="${productUrl(p)}" tabindex="-1" aria-hidden="true"><img src="${p.thumb || p.image}" alt="" width="78" height="98" loading="lazy"></a>
    <div>
      <a class="line-item__title" href="${productUrl(p)}">${escapeHTML(p.name)}</a>
      ${l.toneObj ? `<span class="line-item__tone"><span class="dot" style="background:${l.toneObj.hex}"></span>${escapeHTML(l.product.variantLabel || 'Tono')}: ${escapeHTML(l.toneObj.name)}</span>` : '<span class="line-item__tone"></span>'}
      <div class="small muted">${formatPrice(l.unit)} c/u</div>
      <div class="line-item__row" style="margin-top:8px">
        <div class="qty" role="group" aria-label="Cantidad de ${escapeHTML(p.name)}">
          <button type="button" data-dec aria-label="Disminuir cantidad" ${l.qty <= 1 ? 'disabled' : ''}>−</button>
          <input type="number" inputmode="numeric" min="1" max="${l.max}" value="${l.qty}" aria-label="Cantidad" data-qty>
          <button type="button" data-inc aria-label="Aumentar cantidad" ${l.qty >= l.max ? 'disabled' : ''}>+</button>
        </div>
        ${showTotal ? '' : `<strong>${formatPrice(l.total)}</strong>`}
        <button type="button" class="remove-btn" data-remove aria-label="Eliminar ${escapeHTML(p.name)} del carrito">Eliminar</button>
      </div>
      ${l.max === 0 ? '<p class="small" style="color:var(--danger);margin:6px 0 0">Se agotó. Quítalo del carrito para continuar.</p>' : l.qty > l.max ? `<p class="small" style="color:var(--danger);margin:6px 0 0">Solo quedan ${l.max}. Ajusta la cantidad.</p>` : l.qty === l.max ? `<p class="small" style="color:#6B4A00;margin:6px 0 0">Máximo disponible: ${l.max}</p>` : ''}
    </div>
    ${showTotal ? `<div class="line-total">${formatPrice(l.total)}</div>` : ''}
  </div>`;
}

/** Re-renderiza sin perder el foco del botón +/− que se estaba usando (navegación con teclado). */
export function keepFocus(container, renderFn) {
  const a = document.activeElement;
  const key = a?.closest?.('.line-item')?.dataset.key;
  const which = ['data-inc', 'data-dec', 'data-qty'].find((attr) => a?.hasAttribute?.(attr));
  renderFn();
  if (key && which) container.querySelector(`.line-item[data-key="${CSS.escape(key)}"] [${which}]:not([disabled])`)?.focus();
}

/** Maneja +, −, escribir cantidad y eliminar dentro de un contenedor. */
export function bindLineControls(container, products) {
  const maxFor = (key) => {
    const [id, tone] = key.split('::');
    const p = products.find((x) => x.id === id);
    return p ? Math.max(1, stockOf(p, tone || null)) : 1;
  };
  container.addEventListener('click', (e) => {
    const row = e.target.closest('.line-item'); if (!row) return;
    const key = row.dataset.key; const input = row.querySelector('[data-qty]');
    if (e.target.closest('[data-inc]')) setQty(key, Number(input.value) + 1, maxFor(key));
    if (e.target.closest('[data-dec]')) setQty(key, Number(input.value) - 1, maxFor(key));
    if (e.target.closest('[data-remove]')) removeFromCart(key);
  });
  container.addEventListener('change', (e) => {
    if (!e.target.matches('[data-qty]')) return;
    const key = e.target.closest('.line-item').dataset.key;
    setQty(key, parseInt(e.target.value, 10) || 1, maxFor(key));
  });
}

async function render() {
  if (!drawer) return;
  const products = await loadProducts();
  const t = totals(products);
  const body = $('.drawer__body', drawer);
  const foot = $('.drawer__foot', drawer);
  if (!t.lines.length) {
    body.innerHTML = `<div class="empty-state">${ICONS.bag}<p>Tu carrito está vacío.</p><a class="btn btn--outline btn--sm" href="catalogo.html">Descubrir productos</a></div>`;
    foot.hidden = true;
    return;
  }
  foot.hidden = false;
  keepFocus(body, () => { body.innerHTML = shippingProgressHTML(t) + t.lines.map((l) => lineItemHTML(l)).join(''); });
  foot.innerHTML = `
    <div class="drawer__row"><span>Subtotal</span><span>${formatPrice(t.subtotal)}</span></div>
    ${t.discount ? `<div class="drawer__row summary-row--discount"><span>Descuento</span><span>−${formatPrice(t.discount)}</span></div>` : ''}
    <p class="small muted" style="margin:0">IVA incluido. Envío y cupones se calculan en el siguiente paso.</p>
    <a class="btn btn--block" href="checkout.html">Finalizar compra</a>
    <a class="btn btn--outline btn--block" href="carrito.html">Ver carrito</a>`;
}

function ensureDrawer() {
  if (drawer) return;
  drawer = document.createElement('div');
  drawer.className = 'drawer';
  drawer.innerHTML = `
    <div class="overlay" data-close-drawer></div>
    <aside class="drawer__panel" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <div class="drawer__head">
        <h2 id="drawer-title">Tu carrito</h2>
        <button class="icon-btn" data-close-drawer aria-label="Cerrar carrito">${ICONS.close}</button>
      </div>
      <div class="drawer__body" aria-live="polite"></div>
      <div class="drawer__foot"></div>
    </aside>`;
  document.body.appendChild(drawer);
  drawer.addEventListener('click', (e) => { if (e.target.closest('[data-close-drawer]')) closeCartDrawer(); });
  loadProducts().then((products) => bindLineControls($('.drawer__body', drawer), products));
  onChange((type) => { if (type === 'cart') render(); });
  render();
}

export async function openCartDrawer() {
  ensureDrawer();
  await render();
  drawer.classList.add('is-open');
  document.body.classList.add('no-scroll');
  release = trapFocus($('.drawer__panel', drawer), closeCartDrawer);
}

export function closeCartDrawer() {
  if (!drawer?.classList.contains('is-open')) return;
  drawer.classList.remove('is-open');
  document.body.classList.remove('no-scroll');
  release?.();
}

export const initCartDrawer = ensureDrawer;
