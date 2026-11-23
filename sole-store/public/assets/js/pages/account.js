/**
 * Cuenta: registro, inicio de sesión, historial de pedidos, favoritos y privacidad
 * (descargar mis datos, retirar permiso de marketing, eliminar cuenta: derechos de habeas data).
 */
import { initLayout } from '../components/layout.js';
import { productCard, bindCardActions } from '../components/productCard.js';
import { CONFIG } from '../config.js';
import { $, $$, escapeHTML, formatPrice, toast, storage } from '../utils.js';
import { getFavorites, onChange } from '../store.js';
import { field, setupForm } from '../forms.js';
import { consentFieldset, recordConsent, recordConsentChange } from '../consent.js';
import { register, login, logout, currentUser, ordersFor, updateUser, deleteAccount } from '../auth.js';

const products = await initLayout();
const root = $('#account-root');

function tabs(items, active) {
  return `<div class="tabs" role="tablist">${items.map(([id, label]) => `<button role="tab" id="tab-${id}" aria-controls="panel-${id}" aria-selected="${id === active}" tabindex="${id === active ? 0 : -1}" data-tab="${id}">${label}</button>`).join('')}</div>
  ${items.map(([id]) => `<div role="tabpanel" id="panel-${id}" aria-labelledby="tab-${id}" ${id === active ? '' : 'hidden'}></div>`).join('')}`;
}
function bindTabs() {
  const list = $('[role=tablist]', root);
  const select = (btn) => {
    $$('[role=tab]', list).forEach((b) => { const on = b === btn; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; $(`#${b.getAttribute('aria-controls')}`).hidden = !on; });
    btn.focus();
  };
  list.addEventListener('click', (e) => { const b = e.target.closest('[role=tab]'); if (b) select(b); });
  list.addEventListener('keydown', (e) => {
    const all = $$('[role=tab]', list); const i = all.indexOf(document.activeElement);
    if (e.key === 'ArrowRight') select(all[(i + 1) % all.length]);
    if (e.key === 'ArrowLeft') select(all[(i - 1 + all.length) % all.length]);
  });
}

function favoritesHTML() {
  const favs = getFavorites().map((id) => products.find((p) => p.id === id)).filter(Boolean);
  return favs.length
    ? `<div class="product-grid">${favs.map((p) => productCard(p)).join('')}</div>`
    : '<div class="empty-state"><p>Aún no tienes favoritos. Toca el corazón de un producto para guardarlo aquí.</p><a class="btn btn--outline btn--sm" href="catalogo.html">Explorar</a></div>';
}

/* ---------------- Sin sesión ---------------- */
function renderGuest() {
  const start = location.hash === '#registro' ? 'registro' : 'login';
  root.innerHTML = `<div class="auth-card">
    <h1 class="center">Mi cuenta</h1>
    ${tabs([['login', 'Iniciar sesión'], ['registro', 'Crear cuenta']], start)}
  </div>
  <section class="section" id="favoritos" aria-labelledby="fav-title" style="padding-top:0">
    <h2 id="fav-title">Tus favoritos</h2>
    <p class="small muted">Se guardan en este navegador. Crea una cuenta para verlos también junto a tus pedidos.</p>
    <div id="fav-list">${favoritesHTML()}</div>
  </section>`;

  $('#panel-login').innerHTML = `<form id="login-form" class="stack">
    <p class="form-alert" role="alert" hidden></p>
    ${field({ name: 'email', label: 'Correo electrónico', type: 'email', autocomplete: 'email' })}
    ${field({ name: 'password', label: 'Contraseña', type: 'password', autocomplete: 'current-password' })}
    <button class="btn btn--block" type="submit">Entrar</button>
    <p class="small muted center">El inicio de sesión no recoge datos nuevos, por eso no tiene casillas de autorización.</p>
  </form>`;

  // Registro: solo nombre, correo y contraseña (minimización de datos).
  $('#panel-registro').innerHTML = `<form id="register-form" class="stack">
    <p class="form-alert" role="alert" hidden></p>
    ${field({ name: 'name', label: 'Nombre', rule: 'name', autocomplete: 'given-name', hint: 'Solo para saludarte. No necesitamos tu apellido.' })}
    ${field({ name: 'email', label: 'Correo electrónico', type: 'email', autocomplete: 'email' })}
    ${field({ name: 'password', label: 'Contraseña', type: 'password', rule: 'password', autocomplete: 'new-password', hint: 'Mínimo 8 caracteres, con letras y números.' })}
    ${field({ name: 'password2', label: 'Repite la contraseña', type: 'password', autocomplete: 'new-password', attrs: 'data-match="password"' })}
    ${consentFieldset('registro')}
    <button class="btn btn--block" type="submit">Crear cuenta</button>
  </form>`;
  bindTabs();
  bindCardActions($('#fav-list'), products, () => { $('#fav-list').innerHTML = favoritesHTML(); });

  setupForm($('#login-form'), async (data, form) => {
    const r = await login(data.email, data.password);
    if (!r.ok) { const a = $('.form-alert', form); a.hidden = false; a.textContent = r.error; return; }
    location.reload();
  });
  setupForm($('#register-form'), async (data, form) => {
    const marketing = form.querySelector('[name=consent_marketing]').checked;
    const r = await register({ name: data.name, email: data.email, password: data.password, marketing });
    if (!r.ok) { const a = $('.form-alert', form); a.hidden = false; a.textContent = r.error; return; }
    await recordConsent(form, { email: data.email.toLowerCase() });
    location.reload();
  });
}

/* ---------------- Con sesión ---------------- */
function renderUser(user) {
  const start = location.hash === '#favoritos' ? 'favoritos' : 'pedidos';
  root.innerHTML = `<div style="padding:32px 0 72px">
    <div class="section-head"><div><span class="eyebrow">Mi cuenta</span><h1 style="margin:0">Hola, ${escapeHTML(user.name)}</h1></div>
    <button class="btn btn--outline btn--sm" id="logout">Cerrar sesión</button></div>
    ${tabs([['pedidos', 'Mis pedidos'], ['favoritos', 'Favoritos'], ['privacidad', 'Mis datos y privacidad']], start)}
  </div>`;

  const orders = ordersFor(user.email);
  $('#panel-pedidos').innerHTML = orders.length ? orders.map((o) => `
    <article class="order-card">
      <header><strong>${escapeHTML(o.id)}</strong><span class="status-pill">${escapeHTML(o.status)}</span></header>
      <span class="small muted">${new Date(o.date).toLocaleDateString('es-CO', { dateStyle: 'long' })} · ${o.items.reduce((n, i) => n + i.qty, 0)} productos · <strong>${formatPrice(o.totals.total)}</strong></span>
      <span class="small">${o.items.map((i) => escapeHTML(i.name)).join(', ')}</span>
      <a class="small" href="confirmacion.html?pedido=${encodeURIComponent(o.id)}">Ver detalle</a>
    </article>`).join('') : '<div class="empty-state"><p>Aún no tienes pedidos.</p><a class="btn btn--sm" href="catalogo.html">Comprar ahora</a></div>';

  $('#panel-favoritos').innerHTML = `<div id="fav-list">${favoritesHTML()}</div>`;
  bindCardActions($('#fav-list'), products, () => { $('#fav-list').innerHTML = favoritesHTML(); });

  $('#panel-privacidad').innerHTML = `<div class="narrow stack" style="margin:0">
    <p>Datos que guardamos de tu cuenta: <strong>nombre</strong> (${escapeHTML(user.name)}), <strong>correo</strong> (${escapeHTML(user.email)}) y tu contraseña cifrada. Cuenta creada el ${new Date(user.createdAt).toLocaleDateString('es-CO', { dateStyle: 'long' })}.</p>
    <div class="toggle-row"><div><strong>Recibir ofertas y novedades</strong><p>Por correo o WhatsApp. Puedes cambiarlo cuando quieras.</p></div>
      <label class="switch"><input type="checkbox" id="mk-toggle" ${user.marketing ? 'checked' : ''} aria-label="Recibir ofertas y novedades"><span></span></label></div>
    <div class="toggle-row"><div><strong>Descargar mis datos</strong><p>Un archivo con tu cuenta, pedidos y el registro de tus autorizaciones.</p></div>
      <button class="btn btn--outline btn--sm" id="download">Descargar</button></div>
    <div class="toggle-row"><div><strong>Eliminar mi cuenta</strong><p>Borra tu cuenta y tus pedidos de este navegador. Los datos de facturas se conservan el tiempo que exige la ley tributaria.</p></div>
      <button class="btn btn--sm" style="background:var(--danger);border-color:var(--danger)" id="delete">Eliminar</button></div>
    <p class="small muted">Para conocer, actualizar, rectificar o suprimir tus datos también puedes escribir a <a href="mailto:${CONFIG.company.privacyEmail}">${CONFIG.company.privacyEmail}</a>. Respondemos consultas en máximo 10 días hábiles y reclamos en 15 días hábiles. <a href="privacidad.html">Política de privacidad</a>.</p>
  </div>`;
  bindTabs();

  $('#logout').addEventListener('click', () => { logout(); location.reload(); });
  $('#mk-toggle').addEventListener('change', async (e) => {
    updateUser(user.email, { marketing: e.target.checked });
    await recordConsentChange('marketing', e.target.checked, { email: user.email });
    toast(e.target.checked ? 'Te suscribiste a las novedades' : 'Ya no recibirás comunicaciones comerciales');
  });
  $('#download').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ cuenta: user, pedidos: orders, autorizaciones: storage.get('sole_consent_receipts', []) }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mis-datos-sole-store.json'; a.click();
    URL.revokeObjectURL(a.href);
  });
  $('#delete').addEventListener('click', async () => {
    if (!confirm('¿Seguro que quieres eliminar tu cuenta? Esta acción no se puede deshacer.')) return;
    await recordConsentChange('terms_privacy', false, { email: user.email, reason: 'La persona eliminó su cuenta (solicitud de supresión)' });
    deleteAccount(user.email);
    location.href = 'index.html';
  });
}

const user = currentUser();
if (user) renderUser(user); else renderGuest();
onChange((type) => { if (type === 'favorites' && $('#fav-list')) { $('#fav-list').innerHTML = favoritesHTML(); } });
