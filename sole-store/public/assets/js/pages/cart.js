/** Página de carrito: líneas editables, cupón, envío estimado y total. */
import { initLayout } from '../components/layout.js';
import { lineItemHTML, bindLineControls, shippingProgressHTML, keepFocus, summaryRows } from '../components/cartDrawer.js';
import { $, escapeHTML } from '../utils.js';
import { totals, onChange, applyCoupon, removeCoupon } from '../store.js';
import { ICONS } from '../icons.js';

const products = await initLayout();
const root = $('#cart-root');

function render() {
  const t = totals(products);
  if (!t.lines.length) {
    root.innerHTML = `<div class="empty-state" style="grid-column:1/-1">${ICONS.bag}<h2>Tu carrito está vacío</h2><p>Descubre nuestros productos más vendidos.</p><a class="btn" href="catalogo.html">Ir al catálogo</a></div>`;
    return;
  }
  const coupon = t.coupon;
  keepFocus(root, () => {
    root.innerHTML = `
    <section aria-labelledby="items-title">
      <h2 id="items-title" class="sr-only">Productos en tu carrito</h2>
      ${shippingProgressHTML(t)}
      <div class="cart-table" id="lines">${t.lines.map((l) => lineItemHTML(l, { showTotal: true })).join('')}</div>
      <a href="catalogo.html" style="display:inline-block;margin-top:20px">← Seguir comprando</a>
    </section>
    <aside class="summary" aria-labelledby="sum-title">
      <h2 id="sum-title">Resumen</h2>
      <form class="coupon" id="coupon-form" novalidate>
        <label for="coupon" class="sr-only">Cupón de descuento</label>
        <input class="input" id="coupon" name="coupon" placeholder="Cupón de descuento" autocomplete="off" aria-describedby="coupon-msg" value="${coupon ? escapeHTML(coupon.code) : ''}" ${coupon ? 'readonly' : ''}>
        ${coupon ? '<button type="button" class="btn btn--outline btn--sm" id="coupon-remove">Quitar</button>' : '<button class="btn btn--outline btn--sm" type="submit">Aplicar</button>'}
      </form>
      <p id="coupon-msg" class="small" role="status" style="margin:0;${coupon ? 'color:var(--success)' : ''}">${coupon ? `✓ ${escapeHTML(coupon.label)}` : t.couponInvalid ? '<span style="color:var(--danger)">El cupón guardado ya no aplica a este carrito.</span>' : 'Prueba: BIENVENIDA10, SOLE20K o ENVIOGRATIS'}</p>
      ${summaryRows(t)}
      <a class="btn btn--block" href="checkout.html">Finalizar compra</a>
      <p class="small muted center">${ICONS.lock.replace('<svg', '<svg style="width:14px;display:inline;vertical-align:-2px"')} Confirmas y pagas tu pedido por WhatsApp</p>
    </aside>`;
  });
  $('#coupon-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const code = $('#coupon').value;
    const msg = $('#coupon-msg');
    if (!code.trim()) { msg.innerHTML = '<span style="color:var(--danger)">Escribe un cupón.</span>'; $('#coupon').focus(); return; }
    const r = applyCoupon(code, t.subtotal);
    if (!r.ok) { msg.innerHTML = `<span style="color:var(--danger)">${escapeHTML(r.error)}</span>`; $('#coupon').setAttribute('aria-invalid', 'true'); $('#coupon').focus(); }
  });
  $('#coupon-remove')?.addEventListener('click', removeCoupon);
}

bindLineControls(root, products);
onChange((type) => { if (type === 'cart') render(); });
render();
