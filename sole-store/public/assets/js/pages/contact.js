/** Contacto y PQR: nombre, correo, motivo, número de pedido (opcional) y mensaje. */
import { initLayout } from '../components/layout.js';
import { CONFIG } from '../config.js';
import { $, escapeHTML } from '../utils.js';
import { field, setupForm } from '../forms.js';
import { consentFieldset, recordConsent } from '../consent.js';
import { isConfigured, addRecord } from '../firebase.js';

await initLayout();
const form = $('#contact-form');
form.innerHTML = `
  <p class="form-alert" role="alert" hidden></p>
  <div class="form-grid form-grid--2">
    ${field({ name: 'name', label: 'Nombre', rule: 'name', autocomplete: 'name' })}
    ${field({ name: 'email', label: 'Correo electrónico', type: 'email', autocomplete: 'email', hint: 'Te respondemos a este correo.' })}
    ${field({ name: 'reason', label: 'Motivo', options: ['Pregunta sobre un producto', 'Estado de mi pedido', 'Cambio, devolución o garantía', 'Petición, queja o reclamo (PQR)', 'Datos personales (habeas data)', 'Otro'] })}
    ${field({ name: 'order', label: 'Número de pedido', required: false, hint: 'Solo si tu mensaje es sobre una compra.' })}
    ${field({ name: 'message', label: 'Mensaje', type: 'textarea', cls: 'span-2', attrs: 'minlength="10" maxlength="2000"' })}
  </div>
  ${consentFieldset('contacto')}
  <button class="btn" type="submit">Enviar mensaje</button>`;

setupForm(form, async (data, f) => {
  const consent = await recordConsent(f, { email: data.email });
  const payload = { name: data.name, email: data.email, reason: data.reason, order: data.order || null, message: data.message, consentRecordId: consent.recordId, date: new Date().toISOString() };
  let sent = false;
  try {
    if (isConfigured()) { await addRecord('contactMessages', 'message', payload); sent = true; }
    else { const res = await fetch(CONFIG.contactEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); sent = res.ok; }
  } catch { sent = false; }
  if (sent) {
    f.innerHTML = `<p class="form-success">Gracias, ${escapeHTML(data.name.split(' ')[0])}. Recibimos tu mensaje y te responderemos a ${escapeHTML(data.email)} en máximo 15 días hábiles (normalmente en 1 día).</p>`;
  } else {
    // Sin servidor: abrimos el correo de la persona con el mensaje listo para enviar.
    const body = encodeURIComponent(`${data.message}\n\nNombre: ${data.name}\nPedido: ${data.order || '-'}`);
    location.href = `mailto:${CONFIG.company.email}?subject=${encodeURIComponent(`[${data.reason}] Mensaje web`)}&body=${body}`;
    f.innerHTML = '<p class="form-success">Abrimos tu aplicación de correo con el mensaje listo. Si no se abrió, escríbenos directamente a <a href="mailto:' + CONFIG.company.email + '">' + CONFIG.company.email + '</a>.</p>';
  }
});
