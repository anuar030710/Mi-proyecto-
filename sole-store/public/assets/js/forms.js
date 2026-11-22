/**
 * Formularios: generación de campos accesibles + validación con mensajes claros en español.
 *
 * Reglas por atributo en el <input>:
 *   required · type="email" · data-rule="phone|name|password|doc|address" · data-match="otroCampo" · minlength
 */
import { $, $$, escapeHTML } from './utils.js';
import { validateConsent } from './consent.js';

let uid = 0;

/** HTML de un campo con etiqueta, ayuda y espacio para el error. */
export function field({ name, label, type = 'text', required = true, autocomplete = 'off', hint = '', rule = '', options = null, attrs = '', cls = '', value = '' }) {
  const id = `f-${name}-${++uid}`;
  const describedby = `${id}-err${hint ? ` ${id}-hint` : ''}`;
  const common = `id="${id}" name="${name}" ${required ? 'required aria-required="true"' : ''} autocomplete="${autocomplete}" aria-describedby="${describedby}" ${rule ? `data-rule="${rule}"` : ''} ${attrs}`;
  let control;
  if (options) {
    control = `<select ${common}><option value="">Selecciona…</option>${options.map((o) => `<option value="${escapeHTML(o)}" ${o === value ? 'selected' : ''}>${escapeHTML(o)}</option>`).join('')}</select>`;
  } else if (type === 'textarea') {
    control = `<textarea ${common}>${escapeHTML(value)}</textarea>`;
  } else {
    control = `<input type="${type}" ${common} value="${escapeHTML(value)}">`;
  }
  return `<div class="field ${cls}">
    <label for="${id}">${escapeHTML(label)} ${required ? '' : '<span class="opt">(opcional)</span>'}</label>
    ${control}
    ${hint ? `<span class="hint" id="${id}-hint">${hint}</span>` : ''}
    <span class="error-msg" id="${id}-err" role="alert"></span>
  </div>`;
}

/** Devuelve el mensaje de error de un control, o '' si es válido. */
export function checkField(el, form) {
  const v = (el.value || '').trim();
  const label = $(`label[for="${el.id}"]`)?.textContent.replace('(opcional)', '').trim().toLowerCase() || 'este campo';
  if (el.required && !v) return el.tagName === 'SELECT' ? `Selecciona tu ${label}.` : `Escribe tu ${label}.`;
  if (!v) return '';
  if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Revisa tu correo: debe tener la forma nombre@dominio.com.';
  switch (el.dataset.rule) {
    case 'phone': if (!/^3\d{9}$/.test(v.replace(/[\s-]/g, ''))) return 'Escribe un celular colombiano de 10 dígitos que empiece por 3 (ej.: 300 123 4567).'; break;
    case 'name': if (v.length < 2 || /\d/.test(v)) return 'Escribe un nombre válido (sin números).'; break;
    case 'password': if (v.length < 8 || !/\d/.test(v) || !/[a-zA-Z]/.test(v)) return 'Usa al menos 8 caracteres, con letras y números.'; break;
    case 'doc': if (!/^\d{5,11}(-\d)?$/.test(v.replace(/\./g, ''))) return 'Escribe solo números (entre 5 y 11 dígitos), sin puntos.'; break;
    case 'address': if (v.length < 6) return 'Escribe la dirección completa (ej.: Calle 10 # 20-30).'; break;
    default: break;
  }
  if (el.minLength > 0 && v.length < el.minLength) return `Escribe al menos ${el.minLength} caracteres.`;
  if (el.dataset.match) {
    const other = form.elements[el.dataset.match];
    if (other && other.value !== el.value) return 'Las contraseñas no coinciden.';
  }
  return '';
}

function showError(el, msg) {
  el.setAttribute('aria-invalid', msg ? 'true' : 'false');
  const err = document.getElementById(`${el.id}-err`);
  if (err) err.textContent = msg;
}

/**
 * Conecta validación a un formulario. onValid(data, form) se llama solo si todo es válido.
 * Valida al salir de cada campo y, si ya mostró un error, mientras se escribe.
 */
export function setupForm(form, onValid) {
  form.setAttribute('novalidate', '');
  const controls = () => $$('input:not([type=checkbox]):not([type=radio]), select, textarea', form).filter((el) => el.name && !el.disabled && el.offsetParent !== null);
  form.addEventListener('focusout', (e) => {
    const el = e.target;
    if (el.matches('input:not([type=checkbox]):not([type=radio]), select, textarea') && el.name) showError(el, checkField(el, form));
  });
  form.addEventListener('input', (e) => {
    const el = e.target;
    if (el.getAttribute('aria-invalid') === 'true') showError(el, checkField(el, form));
    if (el.type === 'checkbox' && el.closest('.consent') && el.getAttribute('aria-invalid') === 'true') validateConsent(form);
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let firstInvalid = null;
    controls().forEach((el) => {
      const msg = checkField(el, form); showError(el, msg);
      if (msg && !firstInvalid) firstInvalid = el;
    });
    const consentOk = validateConsent(form);
    if (!consentOk && !firstInvalid) firstInvalid = form.querySelector('.consent [aria-invalid="true"]');
    const alert = form.querySelector('.form-alert');
    if (firstInvalid) {
      if (alert) { alert.hidden = false; alert.textContent = 'Revisa los campos marcados en rojo para continuar.'; }
      firstInvalid.focus();
      return;
    }
    if (alert) alert.hidden = true;
    const data = Object.fromEntries(new FormData(form).entries());
    Object.keys(data).forEach((k) => { if (typeof data[k] === 'string') data[k] = data[k].trim(); });
    const btn = form.querySelector('[type=submit]');
    if (btn) btn.disabled = true;
    try { await onValid(data, form); } finally { if (btn) btn.disabled = false; }
  });
}
