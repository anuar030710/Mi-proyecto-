/**
 * Checkout. Pide SOLO los datos necesarios para entregar y cobrar el pedido:
 *  - Contacto: nombre (destinatario) y celular (para confirmar el pedido por WhatsApp y para la transportadora).
 *    No pedimos correo: la confirmación y el pago se hacen por WhatsApp.
 *  - Envío: departamento, ciudad, dirección y detalles opcionales.
 *  - Documento de identidad: solo si la persona pide factura electrónica a su nombre.
 *  - Pago: NO se hace en la página. Al confirmar se abre WhatsApp con el pedido y el pago se acuerda allí.
 */
import { initLayout } from '../components/layout.js';
import { summaryRows } from '../components/cartDrawer.js';
import { CONFIG } from '../config.js';
import { $, $$, formatPrice, escapeHTML, randomId } from '../utils.js';
import { totals, onChange, clearCart } from '../store.js';
import { field, setupForm } from '../forms.js';
import { consentFieldset, recordConsent } from '../consent.js';
import { currentUser, saveOrder } from '../auth.js';
import { isConfigured, db } from '../supabase.js';

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
      ${user ? `<p class="small muted">Compras como <strong>${escapeHTML(user.email)}</strong>.</p>` : '<p class="small muted">¿Ya tienes cuenta? <a href="cuenta.html">Inicia sesión</a> para guardar el pedido en tu historial. También puedes comprar como invitada.</p>'}
      <div class="form-grid form-grid--2">
        ${field({ name: 'name', label: 'Nombre y apellido', rule: 'name', autocomplete: 'name', value: user?.name || '' })}
        ${field({ name: 'phone', label: 'Celular', type: 'tel', rule: 'phone', autocomplete: 'tel-national', attrs: 'inputmode="numeric"', hint: 'Tu WhatsApp: por ahí confirmamos el pedido y el pago.' })}
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
      <legend><span class="step-num">4</span>Factura</legend>
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
    <p class="pay-note" style="margin-top:16px"><strong>No pagas nada en esta página.</strong> Al continuar se abrirá WhatsApp con tu pedido listo para enviar. Te confirmamos disponibilidad y te enviamos los datos para pagar con <strong>${CONFIG.paymentOptions.join(' o ')}</strong>. Tienes derecho a la garantía legal y a devoluciones según la <a href="reembolsos.html">política de reembolso</a>.</p>
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
    <div class="summary-item"><img src="${l.product.thumb || l.product.image}" alt="" width="56" height="70" loading="lazy">
      <span>${escapeHTML(l.product.name)}${l.toneObj ? `<br><span class="muted">${escapeHTML(l.toneObj.name)}</span>` : ''}<br><span class="qty-pill">x${l.qty}</span></span>
      <strong>${formatPrice(l.total)}</strong></div>`).join('');
  $('#summary-totals').innerHTML = summaryRows(t, { shippingLabel: t.method.name });
  $('#pay-btn').textContent = `Continuar a WhatsApp · ${formatPrice(t.total)}`;
}

async function placeOrder(data, form) {
  const t = totals(products, shippingId);
  const alertBox = form.querySelector('.form-alert');
  const fail = (html) => { alertBox.hidden = false; alertBox.innerHTML = html; alertBox.scrollIntoView({ block: 'center' }); };
  // Antes de enviar: ¿alguna línea supera las unidades disponibles?
  const short = t.lines.find((l) => l.qty > l.max);
  if (short) {
    fail(`${escapeHTML(short.product.name)}${short.tone ? ` (${escapeHTML(short.tone)})` : ''} ${short.max ? `solo tiene ${short.max} disponibles` : 'se agotó'}. <a href="carrito.html">Ajusta tu carrito</a> para continuar.`);
    return;
  }
  const consent = await recordConsent(form, { extra: { subject: { phone: data.phone, email: user?.email || null } } });
  const d = new Date();
  const order = {
    id: `SOLES-${d.toISOString().slice(2, 10).replace(/-/g, '')}-${randomId(4)}`,
    date: d.toISOString(),
    status: 'Por confirmar en WhatsApp',
    items: t.lines.map((l) => ({ id: l.product.id, name: l.product.name, tone: l.tone, qty: l.qty, unit: l.unit, total: l.total, image: l.product.thumb || l.product.image })),
    totals: { subtotal: t.subtotal, discount: t.discount, shipping: t.shipping, total: t.total, coupon: t.coupon?.code || null },
    contact: { email: user?.email || null, name: data.name, phone: data.phone },
    shipping: { method: t.method.name, department: data.department, city: data.city, address: data.address, address2: data.address2 || '' },
    payment: 'whatsapp',
    invoice: data.wantsInvoice ? { docType: data.docType, docNumber: data.docNumber } : 'Consumidor final',
    consentRecordId: consent.recordId,
  };
  // Con el panel conectado, la base de datos revisa y DESCUENTA las unidades en este momento.
  if (isConfigured()) {
    try {
      const res = await db('rpc/place_order', { method: 'POST', body: { p_order: order } });
      order.items = order.items.map((i, n) => ({ ...i, unit: res.items[n]?.unit ?? i.unit, total: res.items[n]?.total ?? i.total }));
    } catch (err) {
      if (err.message.startsWith('SIN_STOCK:')) {
        fail(`Lo sentimos: <strong>${escapeHTML(err.message.slice(10))}</strong> ya no tiene unidades suficientes (alguien acaba de comprarlo). <a href="carrito.html">Revisa tu carrito</a>.`);
      } else {
        fail('No pudimos registrar tu pedido. Revisa tu conexión e inténtalo de nuevo, o escríbenos por WhatsApp.');
      }
      return;
    }
  }
  saveOrder(order);
  clearCart();
  // La confirmación muestra el botón para enviar el pedido por WhatsApp (el navegador bloquea abrirlo solo aquí).
  location.href = `confirmacion.html?pedido=${encodeURIComponent(order.id)}`;
}

onChange((type) => { if (type === 'cart' && $('#summary-items')) updateSummary(); });
