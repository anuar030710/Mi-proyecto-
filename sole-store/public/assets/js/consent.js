/**
 * Consentimiento y registro de aceptaciones.
 *
 * 1. Casillas: cada formulario que recoge datos personales muestra DOS casillas separadas
 *    y sin marcar: (a) Términos + autorización de tratamiento de datos y (b) comunicaciones comerciales.
 * 2. Registro: al enviar el formulario se guarda una prueba de QUÉ aceptó la persona, CUÁNDO,
 *    CÓMO (casilla, formulario, página) y QUÉ VERSIÓN de cada documento estaba vigente.
 *    La prueba se guarda en Firebase (colección consents, con la hora del servidor) o, sin Firebase,
 *    en server.js (POST /api/consent → private/consent-log.jsonl, con IP). Si el servidor no está disponible se guarda en cola
 *    y se reintenta en la próxima visita. (Ley 1581 de 2012 art. 9 y Decreto 1377 de 2013 art. 7-8:
 *    el responsable debe conservar prueba de la autorización.)
 * 3. Cookies: banner con "Aceptar todas", "Solo necesarias" y "Configurar", con el mismo peso visual.
 *    Los scripts opcionales (analítica, publicidad) solo se cargan con permiso.
 */
import { CONFIG } from './config.js';
import { storage, escapeHTML, randomId, trapFocus, $ } from './utils.js';
import { ICONS } from './icons.js';
import { isConfigured, addRecord } from './firebase.js';

/** Guarda un registro: en Firebase (colección consents, solo se puede agregar) o en server.js. */
async function postRecord(record) {
  if (isConfigured()) { await addRecord('consents', 'record', record); return; }
  const res = await fetch(CONFIG.consentEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record), keepalive: true });
  if (!res.ok) throw new Error(String(res.status));
}

const PENDING_KEY = 'sole_consent_pending';
const RECEIPTS_KEY = 'sole_consent_receipts';
const COOKIE_KEY = 'sole_cookie_prefs';

/** Finalidad del tratamiento según el formulario (se muestra en la casilla 1). */
const PURPOSES = {
  checkout: 'gestionar mi pedido, confirmarlo y acordar el pago por WhatsApp, enviarlo y emitir la factura',
  registro: 'crear y administrar mi cuenta, y guardar mi historial de pedidos y favoritos',
  contacto: 'responder mi mensaje o solicitud',
  resena: 'publicar mi reseña con el nombre que indique',
  newsletter: 'enviarme el boletín de Soles Store',
};

/** Texto exacto de cada casilla. Este mismo texto (sin HTML) queda en el registro. */
export function consentTexts(formKey) {
  return {
    terms_privacy: `He leído y acepto los <a href="terminos.html" target="_blank">Términos y condiciones</a> y la <a href="privacidad.html" target="_blank">Política de privacidad</a>, y autorizo a ${escapeHTML(CONFIG.storeName)} a tratar mis datos personales para ${PURPOSES[formKey]}.`,
    marketing: `Quiero recibir ofertas, lanzamientos y novedades de ${escapeHTML(CONFIG.storeName)} por correo electrónico o WhatsApp. Puedo retirar este permiso cuando quiera.`,
  };
}
const stripHTML = (html) => html.replace(/<[^>]+>/g, '');

/**
 * HTML de las dos casillas. marketingRequired solo es true en el formulario del boletín,
 * donde recibir comunicaciones ES la finalidad del formulario.
 */
export function consentFieldset(formKey, { marketingRequired = false } = {}) {
  const t = consentTexts(formKey);
  const id = `${formKey}-${randomId(4)}`;
  return `
  <fieldset class="consent" data-consent="${formKey}" ${marketingRequired ? 'data-marketing-required' : ''}>
    <legend>Autorizaciones</legend>
    <label class="check" for="${id}-tp">
      <input type="checkbox" id="${id}-tp" name="consent_terms_privacy" aria-describedby="${id}-tp-err">
      <span>${t.terms_privacy} <span class="req" aria-hidden="true">*</span><span class="sr-only">(obligatoria)</span></span>
    </label>
    <p class="error-msg" id="${id}-tp-err" role="alert"></p>
    <label class="check" for="${id}-mk">
      <input type="checkbox" id="${id}-mk" name="consent_marketing" aria-describedby="${id}-mk-err">
      <span>${t.marketing} ${marketingRequired ? '<span class="req" aria-hidden="true">*</span><span class="sr-only">(obligatoria para suscribirte)</span>' : '<span class="muted">(opcional)</span>'}</span>
    </label>
    <p class="error-msg" id="${id}-mk-err" role="alert"></p>
    <p class="consent-note">Responsable: ${escapeHTML(CONFIG.company.legalName || CONFIG.storeName)}. Puedes conocer, actualizar, rectificar y suprimir tus datos escribiendo a ${escapeHTML(CONFIG.company.privacyEmail)}.</p>
  </fieldset>`;
}

/** Valida las casillas y muestra errores. Devuelve true si todo está bien. */
export function validateConsent(form) {
  const fs = form.querySelector('.consent');
  if (!fs) return true;
  const tp = fs.querySelector('[name="consent_terms_privacy"]');
  const mk = fs.querySelector('[name="consent_marketing"]');
  let ok = true;
  const setErr = (input, msg) => {
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    document.getElementById(input.getAttribute('aria-describedby')).textContent = msg;
    if (msg) ok = false;
  };
  setErr(tp, tp.checked ? '' : 'Debes aceptar los Términos y la Política de privacidad para continuar.');
  setErr(mk, fs.hasAttribute('data-marketing-required') && !mk.checked ? 'Para suscribirte necesitamos tu permiso para enviarte el boletín.' : '');
  return ok;
}

/** Construye y guarda la prueba de consentimiento de un formulario. */
export async function recordConsent(form, { email = null, extra = {} } = {}) {
  const fs = form.querySelector('.consent');
  const formKey = fs.dataset.consent;
  const texts = consentTexts(formKey);
  const v = CONFIG.policyVersions;
  const record = {
    recordId: `CNS-${Date.now().toString(36).toUpperCase()}-${randomId(4)}`,
    type: 'form',
    form: formKey,
    clientTimestamp: new Date().toISOString(),
    subject: { email },
    consents: [
      { key: 'terms_privacy', accepted: fs.querySelector('[name="consent_terms_privacy"]').checked, required: true,
        text: stripHTML(texts.terms_privacy), documents: { terms: v.terms, privacy: v.privacy } },
      { key: 'marketing', accepted: fs.querySelector('[name="consent_marketing"]').checked, required: fs.hasAttribute('data-marketing-required'),
        text: stripHTML(texts.marketing), documents: { privacy: v.privacy } },
    ],
    method: `La persona marcó las casillas y pulsó el botón de envío del formulario "${formKey}"`,
    page: location.pathname,
    userAgent: navigator.userAgent,
    language: navigator.language,
    ...extra,
  };
  await sendRecord(record);
  return record;
}

/** Registra un cambio hecho por la persona (p. ej., retirar el permiso de marketing). */
export async function recordConsentChange(key, accepted, { email = null, reason = '' } = {}) {
  const record = {
    recordId: `CNS-${Date.now().toString(36).toUpperCase()}-${randomId(4)}`,
    type: 'change', form: 'cuenta', clientTimestamp: new Date().toISOString(), subject: { email },
    consents: [{ key, accepted, documents: { privacy: CONFIG.policyVersions.privacy } }],
    method: reason || 'La persona cambió su preferencia desde "Mi cuenta"',
    page: location.pathname, userAgent: navigator.userAgent, language: navigator.language,
  };
  await sendRecord(record);
  return record;
}

/** Envía al servidor; si falla, deja en cola. Localmente solo guarda un recibo SIN datos personales. */
async function sendRecord(record) {
  const receipt = { recordId: record.recordId, form: record.form, date: record.clientTimestamp,
    consents: record.consents.map((c) => ({ key: c.key, accepted: c.accepted })), synced: false };
  try {
    await postRecord(record);
    receipt.synced = true;
  } catch {
    const pending = storage.get(PENDING_KEY, []);
    pending.push(record);
    storage.set(PENDING_KEY, pending.slice(-50));
  }
  const receipts = storage.get(RECEIPTS_KEY, []);
  receipts.push(receipt);
  storage.set(RECEIPTS_KEY, receipts.slice(-100));
}

/** Reintenta enviar registros pendientes (se llama al cargar cada página). */
export async function flushPendingConsents() {
  const pending = storage.get(PENDING_KEY, []);
  if (!pending.length) return;
  const still = [];
  for (const rec of pending) {
    try {
      await postRecord({ ...rec, retried: true });
    } catch { still.push(rec); }
  }
  storage.set(PENDING_KEY, still);
}

/* ============================ COOKIES ============================ */

export const getCookiePrefs = () => {
  const p = storage.get(COOKIE_KEY, null);
  return p && p.version === CONFIG.policyVersions.cookies ? p : null;
};

function saveCookiePrefs(analytics, marketing, how) {
  const prefs = { version: CONFIG.policyVersions.cookies, analytics, marketing, date: new Date().toISOString(), id: storage.get(COOKIE_KEY, {})?.id || randomId(10) };
  storage.set(COOKIE_KEY, prefs);
  // Prueba anónima de la elección de cookies (sin email: identificador aleatorio del navegador).
  sendRecord({
    recordId: `CK-${Date.now().toString(36).toUpperCase()}-${randomId(4)}`, type: 'cookies', form: 'cookies',
    clientTimestamp: prefs.date, subject: { browserId: prefs.id },
    consents: [
      { key: 'cookies_necessary', accepted: true, required: true },
      { key: 'cookies_analytics', accepted: analytics },
      { key: 'cookies_marketing', accepted: marketing },
    ],
    documents: { cookies: CONFIG.policyVersions.cookies },
    method: how, page: location.pathname, userAgent: navigator.userAgent, language: navigator.language,
  });
  applyCookiePrefs(prefs);
}

/** Carga solo los scripts que la persona autorizó. */
function applyCookiePrefs(prefs) {
  ['analytics', 'marketing'].forEach((cat) => {
    if (!prefs[cat]) return;
    (CONFIG.optionalScripts[cat] || []).forEach((src) => {
      if (document.querySelector(`script[src="${src}"]`)) return;
      const s = document.createElement('script'); s.src = src; s.async = true; document.head.appendChild(s);
    });
  });
}

export function initCookieConsent() {
  const prefs = getCookiePrefs();
  if (prefs) applyCookiePrefs(prefs); else showCookieBanner();
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-open-cookie-prefs]')) { e.preventDefault(); openCookieModal(); }
  });
}

function showCookieBanner() {
  if ($('.cookie-banner')) return;
  const el = document.createElement('section');
  el.className = 'cookie-banner';
  el.setAttribute('aria-labelledby', 'cookie-title');
  el.innerHTML = `
    <h2 id="cookie-title">Tu privacidad</h2>
    <p>Usamos almacenamiento local estrictamente necesario para que funcionen el carrito, tus favoritos y tu sesión.
    Con tu permiso también podríamos usar cookies de analítica y publicidad. Puedes cambiar tu elección cuando quieras.
    <a href="cookies.html">Política de cookies</a>.</p>
    <div class="cookie-actions">
      <button class="btn btn--sm" data-ck="all">Aceptar todas</button>
      <button class="btn btn--sm btn--outline" data-ck="none">Solo necesarias</button>
      <button class="btn btn--sm btn--outline" data-ck="config">Configurar</button>
    </div>`;
  document.body.appendChild(el);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ck]'); if (!b) return;
    if (b.dataset.ck === 'all') { saveCookiePrefs(true, true, 'Botón "Aceptar todas" del banner de cookies'); el.remove(); }
    if (b.dataset.ck === 'none') { saveCookiePrefs(false, false, 'Botón "Solo necesarias" del banner de cookies'); el.remove(); }
    if (b.dataset.ck === 'config') openCookieModal();
  });
}

export function openCookieModal() {
  const current = getCookiePrefs() || { analytics: false, marketing: false };
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="overlay" data-close></div>
    <div class="modal__box" role="dialog" aria-modal="true" aria-labelledby="ck-modal-title">
      <button class="icon-btn modal__close" data-close aria-label="Cerrar">${ICONS.close}</button>
      <h2 id="ck-modal-title">Preferencias de cookies</h2>
      <p class="small muted">Elige qué permites. Las necesarias no se pueden desactivar porque sin ellas la tienda no funciona.</p>
      <div class="toggle-row"><div><strong>Necesarias</strong><p>Carrito, favoritos, sesión y esta misma elección. Se guardan solo en tu navegador.</p></div>
        <label class="switch"><input type="checkbox" checked disabled aria-label="Necesarias (siempre activas)"><span></span></label></div>
      <div class="toggle-row"><div><strong>Analítica</strong><p>Nos ayuda a saber qué páginas se visitan para mejorar la tienda. Actualmente: no usamos ninguna.</p></div>
        <label class="switch"><input type="checkbox" name="analytics" ${current.analytics ? 'checked' : ''} aria-label="Cookies de analítica"><span></span></label></div>
      <div class="toggle-row"><div><strong>Publicidad</strong><p>Permite mostrarte anuncios relevantes en otras webs. Actualmente: no usamos ninguna.</p></div>
        <label class="switch"><input type="checkbox" name="marketing" ${current.marketing ? 'checked' : ''} aria-label="Cookies de publicidad"><span></span></label></div>
      <div class="cookie-actions" style="margin-top:20px">
        <button class="btn btn--sm" data-save>Guardar mi elección</button>
        <button class="btn btn--sm btn--outline" data-reject>Rechazar opcionales</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  document.body.classList.add('no-scroll');
  const close = () => { release(); modal.remove(); document.body.classList.remove('no-scroll'); };
  const release = trapFocus(modal, close);
  modal.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) close();
    if (e.target.closest('[data-save]')) {
      saveCookiePrefs(modal.querySelector('[name=analytics]').checked, modal.querySelector('[name=marketing]').checked, 'Botón "Guardar mi elección" del panel de preferencias');
      $('.cookie-banner')?.remove(); close();
    }
    if (e.target.closest('[data-reject]')) {
      saveCookiePrefs(false, false, 'Botón "Rechazar opcionales" del panel de preferencias');
      $('.cookie-banner')?.remove(); close();
    }
  });
}
