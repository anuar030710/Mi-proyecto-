/**
 * Checkout. Pide SOLO los datos necesarios para entregar y cobrar el pedido:
 *  - Contacto: correo (confirmación), nombre (destinatario), celular (la transportadora lo exige).
 *  - Envío: departamento, ciudad, dirección y detalles opcionales.
 *  - Documento de identidad: solo si la persona pide factura electrónica a su nombre.
 *  - Datos de tarjeta/banco: NUNCA aquí. Los pide la pasarela de pago (Wompi, Mercado Pago, etc.).
 */
import { initLayout } from '../components/layout.js';
import { summaryRows } from '../components/cartDrawer.js';
import { CONFIG } from '../config.js';
import { $, $$, formatPrice, escapeHTML, randomId } from '../utils.js';
import { totals, onChange, clearCart } from '../store.js';
import { field, setupForm } from '../forms.js';
import { consentFieldset, recordConsent } from '../consent.js';
import { currentUser, saveOrder } from '../auth.js';

const DEPARTAMENTOS = ['Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bogotá D.C.', 'Bolívar', 'Boyacá', 'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda', 'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada'];

const products = await initLayout();
const root = $('#checkout-root');
const user = currentUser();
let shippingId = CONFIG.shippingMethods[0].id;

if (!totals(products).lines.length) {
  root.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h2>No hay productos para pagar</h2><a class="btn" href="catalogo.html">Ir al catálogo</a></div>`;
} else {
  render();
}

function render() {
  root.innerHTML = `
  <form id="checkout-form" aria-label="Datos del pedido">
    <p class="form-alert" role="alert" hidden></p>

    <fieldset class="checkout-section">
      <legend><span class="step-num">1</span>Contacto</legend>
      ${user ? `<p class="small muted">Compras como <strong>${escapeHTML(user.email)}</strong>.</p>` : '<p class="small muted">¿Ya tienes cuenta? <a href="cuenta.html">Inicia sesión</a>. También puedes comprar como invitada.</p>'}
      <div class="form-grid form-grid--2">
        ${field({ name: 'email', label: 'Correo electrónico', type: 'email', autocomplete: 'email', cls: 'span-2', hint: 'Aquí te enviamos la confirmación y el seguimiento.', value: user?.email || '' })}
        ${field({ name: 'name', label: 'Nombre y apellido', rule: 'name', autocomplete: 'name', value: user?.name || '' })}
        ${field({ name: 'phone', label: 'Celular', type: 'tel', rule: 'phone', autocomplete: 'tel-national', attrs: 'inputmode="numeric"', hint: 'Solo para que la transportadora coordine la entrega.' })}
      </div>
    </fieldset>

    <fieldset class="checkout-section">
      <legend><span class="step-num">2</span>Dirección de envío</legend>
      <div class="form-grid form-grid--2">
        ${field({ name: 'department', label: 'Departamento', options: DEPARTAMENTOS, autocomplete: 'address-level1' })}
        ${field({ name: 'city', label: 'Ciudad o municipio', autocomplete: 'address-level2', attrs: 'minlength="3"' })}
        ${field({ name: 'address', label: 'Dirección', rule: 'address', autocomplete: 'street-address', cls: 'span-2', hint: 'Ej.: Calle 72 # 10-34' })}
        ${field({ name: 'address2', label: 'Apartamento, torre, barrio', required: false, autocomplete: 'address-line2', cls: 'span-2' })}
      </div>
    </fieldset>

    <fieldset class="checkout-section">
      <legend><span class="step-num">3</span>Método de envío</legend>
      <div id="shipping-options"></div>
    </fieldset>

    <fieldset class="checkout-section">
      <legend><span class="step-num">4</span>Método de pago</legend>
      ${CONFIG.paymentMethods.map((m, i) => `
        <label class="option-card"><input type="radio" name="payment" value="${m.id}" ${i === 0 ? 'checked' : ''}>
          <span><strong>${escapeHTML(m.name)}</strong><span class="opt-desc">${escapeHTML(m.desc)}</span></span></label>`).join('')}
      <p class="pay-note">🔒 No pedimos ni guardamos datos de tarjetas ni claves bancarias. El pago se completa en la pasarela certificada${CONFIG.demoMode ? ' (en esta demostración no se realiza ningún cobro)' : ''}.</p>
      <div class="pay-note" style="border-style:solid">
        <label class="check" style="padding:0"><input type="checkbox" name="wantsInvoice" id="wants-invoice"> Necesito factura electrónica a mi nombre o el de mi empresa</label>
        <div id="invoice-fields" class="form-grid form-grid--2" hidden style="margin-top:12px">
          ${field({ name: 'docType', label: 'Tipo de documento', options: ['Cédula de ciudadanía', 'Cédula de extranjería', 'NIT', 'Pasaporte'] })}
          ${field({ name: 'docNumber', label: 'Número de documento', rule: 'doc', attrs: 'inputmode="numeric"' })}
        </div>
        <p class="small muted" style="margin:8px 0 0">Si no la pides, la factura se emite como “consumidor final” y no necesitamos tu documento.</p>
      </div>
    </fieldset>

    ${consentFieldset('checkout')}
    <p class="small muted" style="margin-top:12px">Al confirmar aceptas pagar el total indicado. Tienes derecho a la reversión del pago y a la garantía legal según la <a href="reembolsos.html">política de reembolso</a>.</p>
    <button class="btn btn--block" type="submit" id="pay-btn" style="margin-top:8px;min-height:56px"></button>
  </form>

  <aside class="summary" aria-labelledby="sum-title">
    <h2 id="sum-title">Tu pedido</h2>
    <div class="summary-items" id="summary-items"></div>
    <div id="summary-totals" style="display:grid;gap:12px"></div>
    <a href="carrito.html" class="small">Editar carrito</a>
  </aside>`;

  // Factura electrónica: mostrar/ocultar y desactivar campos para que no se validen ni envíen.
  const inv = $('#invoice-fields');
  const toggleInvoice = () => {
    const on = $('#wants-invoice').checked; inv.hidden = !on;
    $$('select, input', inv).forEach((el) => { el.disabled = !on; });
  };
  $('#wants-invoice').addEventListener('change', toggleInvoice);
  toggleInvoice();

  $('#checkout-form').addEventListener('change', (e) => { if (e.target.name === 'shipping') { shippingId = e.target.value; updateSummary(); } });
  updateSummary();
  setupForm($('#checkout-form'), placeOrder);
}

function updateSummary() {
  const t = totals(products, shippingId);
  // Las opciones se crean una vez; luego solo se actualiza el precio (así no se pierde el foco).
  const box = $('#shipping-options');
  if (!box.children.length) {
    box.innerHTML = CONFIG.shippingMethods.map((m) => `<label class="option-card"><input type="radio" name="shipping" value="${m.id}" ${m.id === shippingId ? 'checked' : ''}>
      <span><strong>${escapeHTML(m.name)}</strong><span class="opt-desc">${escapeHTML(m.desc)}</span></span>
      <span class="opt-price" data-price-for="${m.id}"></span></label>`).join('');
  }
  CONFIG.shippingMethods.forEach((m) => {
    const ship = totals(products, m.id).shipping;
    box.querySelector(`[data-price-for="${m.id}"]`).textContent = ship === 0 ? 'Gratis' : formatPrice(ship);
  });
  $('#summary-items').innerHTML = t.lines.map((l) => `
    <div class="summary-item"><img src="${l.product.image}" alt="" width="56" height="70" loading="lazy">
      <span>${escapeHTML(l.product.name)}${l.toneObj ? `<br><span class="muted">${escapeHTML(l.toneObj.name)}</span>` : ''}<br><span class="qty-pill">x${l.qty}</span></span>
      <strong>${formatPrice(l.total)}</strong></div>`).join('');
  $('#summary-totals').innerHTML = summaryRows(t, { shippingLabel: t.method.name });
  $('#pay-btn').textContent = `Confirmar pedido · ${formatPrice(t.total)}`;
}

async function placeOrder(data, form) {
  const t = totals(products, shippingId);
  const consent = await recordConsent(form, { email: data.email });
  const d = new Date();
  const order = {
    id: `SOLE-${d.toISOString().slice(2, 10).replace(/-/g, '')}-${randomId(4)}`,
    date: d.toISOString(),
    status: data.payment === 'contraentrega' ? 'Confirmado · pago contra entrega' : 'Pendiente de pago',
    items: t.lines.map((l) => ({ id: l.product.id, name: l.product.name, tone: l.tone, qty: l.qty, unit: l.unit, total: l.total, image: l.product.image })),
    totals: { subtotal: t.subtotal, discount: t.discount, shipping: t.shipping, total: t.total, coupon: t.coupon?.code || null },
    contact: { email: data.email.toLowerCase(), name: data.name, phone: data.phone },
    shipping: { method: t.method.name, department: data.department, city: data.city, address: data.address, address2: data.address2 || '' },
    payment: data.payment,
    invoice: data.wantsInvoice ? { docType: data.docType, docNumber: data.docNumber } : 'Consumidor final',
    consentRecordId: consent.recordId,
  };
  saveOrder(order);
  clearCart();
  // Producción: aquí se crea la orden en tu backend y se redirige a la pasarela (ver README).
  location.href = `confirmacion.html?pedido=${encodeURIComponent(order.id)}`;
}

onChange((type) => { if (type === 'cart' && $('#summary-items')) updateSummary(); });
