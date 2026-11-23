/** Confirmación de pedido: número de orden, resumen e instrucciones según el método de pago. */
import { initLayout } from '../components/layout.js';
import { CONFIG } from '../config.js';
import { $, escapeHTML, formatPrice, getParam } from '../utils.js';
import { findOrder } from '../auth.js';
import { ICONS } from '../icons.js';

const products = await initLayout();
const order = findOrder(getParam('pedido') || '');
const root = $('#confirm-root');

/** "Cómo usar lo que compraste": un mensaje por producto del pedido. */
function howToSection(o) {
  const seen = new Set();
  const items = o.items.map((i) => products.find((p) => p.id === i.id))
    .filter((p) => p && p.howToSteps?.length && !seen.has(p.id) && seen.add(p.id));
  if (!items.length) return '';
  return `<section class="summary" style="margin-top:20px" aria-labelledby="howto-order">
    <h2 id="howto-order" style="font-size:1.4rem">Cómo usar lo que compraste</h2>
    ${items.map((p) => `<div class="howto howto--compact">
      <h3 class="howto__title">${escapeHTML(p.name)}</h3>
      <ol class="howto__steps">${p.howToSteps.map((s) => `<li>${escapeHTML(s)}</li>`).join('')}</ol>
      ${p.tip ? `<p class="howto__tip"><strong>Consejo de Sole:</strong> ${escapeHTML(p.tip)}</p>` : ''}
    </div>`).join('')}
  </section>`;
}

const NEXT = {
  tarjeta: 'Te llevaremos a la pasarela de pago para ingresar los datos de tu tarjeta. Cuando el pago se apruebe recibirás un correo.',
  pse: 'Te llevaremos a PSE para que elijas tu banco y apruebes el débito.',
  nequi: 'Recibirás una notificación en tu app Nequi para aprobar el pago.',
  contraentrega: 'Prepara el valor exacto en efectivo: lo pagas al recibir tu pedido.',
};

if (!order) {
  root.innerHTML = '<h1>No encontramos ese pedido</h1><p>Si acabas de comprar, revisa tu correo o <a href="contacto.html">escríbenos</a>.</p>';
} else {
  const payName = CONFIG.paymentMethods.find((m) => m.id === order.payment)?.name || order.payment;
  root.innerHTML = `
    <div class="confirm__icon">${ICONS.check}</div>
    <h1>¡Gracias por tu compra, ${escapeHTML(order.contact.name.split(' ')[0])}!</h1>
    <p>Tu número de pedido es</p>
    <div class="order-number">${escapeHTML(order.id)}</div>
    <p>Enviamos la confirmación a <strong>${escapeHTML(order.contact.email)}</strong>. Guarda este número para cualquier consulta.</p>
    ${CONFIG.demoMode ? '<p class="callout" style="text-align:left">Modo demostración: no se envió ningún correo ni se realizó ningún cobro.</p>' : ''}
    <div class="summary">
      <h2 style="font-size:1.4rem">Resumen</h2>
      ${order.items.map((i) => `<div class="summary-item"><img src="${i.image}" alt="" width="56" height="70"><span>${escapeHTML(i.name)}${i.tone ? ` · ${escapeHTML(i.tone)}` : ''}<br><span class="qty-pill">x${i.qty}</span></span><strong>${formatPrice(i.total)}</strong></div>`).join('')}
      <div class="summary-row"><span>Subtotal</span><span>${formatPrice(order.totals.subtotal)}</span></div>
      ${order.totals.discount ? `<div class="summary-row summary-row--discount"><span>Descuento</span><span>−${formatPrice(order.totals.discount)}</span></div>` : ''}
      <div class="summary-row"><span>Envío (${escapeHTML(order.shipping.method)})</span><span>${order.totals.shipping ? formatPrice(order.totals.shipping) : 'Gratis'}</span></div>
      <div class="summary-row summary-row--total"><span>Total</span><span>${formatPrice(order.totals.total)}</span></div>
      <p class="small" style="margin:0"><strong>Pago:</strong> ${escapeHTML(payName)} · <strong>Estado:</strong> ${escapeHTML(order.status)}</p>
      <p class="small" style="margin:0"><strong>Entrega en:</strong> ${escapeHTML(order.shipping.address)} ${escapeHTML(order.shipping.address2)}, ${escapeHTML(order.shipping.city)}, ${escapeHTML(order.shipping.department)}</p>
      <p class="small" style="margin:0"><strong>Siguiente paso:</strong> ${NEXT[order.payment] || ''}</p>
    </div>
    ${howToSection(order)}
    <div class="hero__ctas" style="justify-content:center;margin-top:28px">
      <a class="btn" href="catalogo.html">Seguir comprando</a>
      <a class="btn btn--outline" href="cuenta.html">Ver mis pedidos</a>
    </div>
    <p class="small muted" style="margin-top:24px">Si pagaste con tarjeta, PSE o Nequi y hubo un fraude, una operación no solicitada o el producto no llegó, puedes pedir la <a href="reembolsos.html#reversion">reversión del pago</a> dentro de los 5 días hábiles siguientes.</p>`;
}
