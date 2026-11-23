/**
 * Panel de administración de Soles Store.
 *
 * Pensado para alguien que NO programa: todo se edita con formularios.
 * La seguridad real la ponen las reglas de Firestore (firestore.rules): aunque alguien abra esta página,
 * solo las personas de la tabla "admins" pueden guardar cambios.
 */
import { CONFIG, CATEGORIES, TONE_FAMILIES } from '../config.js';
import { $, $$, escapeHTML, formatPrice, normalize, toast, randomId } from '../utils.js';
import {
  isConfigured, getSession, signIn, signUp, sendRecovery, resendVerification, signOut, amIAdmin,
  adminProducts, adminInventory, adminGallery, saveProductFb, deleteProductFb, setProductFields, seedFb,
  saveSettingsFb, fetchSettings, listAdmins, addAdmin, removeAdmin, listOrders, setOrderStatus, cancelOrderFb,
  listCollection, deleteDoc, invKey,
} from '../firebase.js';
import { applySettings } from '../settings.js';
import { totalStock } from '../products.js';

const outTones = (p) => { const o = (p.tones || []).filter((t) => typeof t.stock === 'number' && t.stock <= 0).map((t) => t.name); return o.length && o.length < p.tones.length ? ` · Agotado: ${esc(o.join(', '))}` : ''; };

const root = $('#admin-root');
const userBox = $('#admin-user');
const esc = escapeHTML;
const HEX = /^#[0-9a-f]{6}$/i;

/* ======================================================================
   ARRANQUE
   ====================================================================== */
async function start() {
  if (!isConfigured()) { renderNotConfigured(); return; }
  if (!getSession()) { renderLogin(); return; }
  const admin = await amIAdmin();
  if (getSession() === null) { renderLogin(); return; }
  if (!admin) { renderNotAdmin(); return; }
  renderPanel();
}

function renderUserBar() {
  const s = getSession();
  userBox.innerHTML = s ? `<span class="muted">${esc(s.email || '')}</span>
    <a class="btn btn--outline btn--sm" href="index.html" target="_blank" rel="noopener">Ver tienda</a>
    <button class="btn btn--sm" id="logout">Salir</button>` : '';
  $('#logout')?.addEventListener('click', async () => { await signOut(); location.reload(); });
}

/* ======================================================================
   ACCESO
   ====================================================================== */
function renderNotConfigured() {
  root.innerHTML = `<div class="admin-card admin-login">
    <h1 style="font-size:1.8rem">Falta conectar el panel</h1>
    <p>El panel necesita el proyecto gratuito de Firebase. Una sola vez, la persona que instala la tienda debe seguir la guía <strong>docs/GUIA-ADMINISTRADORA.md</strong> (sección “Instalación”) y poner la configuración web en <code>assets/js/config.js</code>.</p>
    <p class="small muted">Mientras tanto, la tienda funciona con los productos del archivo <code>data/products.json</code>.</p>
  </div>`;
}

function renderLogin(notice = '') {
  renderUserBar();
  root.innerHTML = `<div class="admin-card admin-login">
    <h1 style="font-size:1.9rem;margin-bottom:4px">Panel de la tienda</h1>
    <p class="muted small">Solo para administradoras.</p>
    ${notice ? `<p class="form-success">${esc(notice)}</p>` : ''}
    <form id="login" class="stack" novalidate>
      <div class="field"><label for="l-email">Correo</label><input id="l-email" type="email" autocomplete="username" required></div>
      <div class="field"><label for="l-pass">Contraseña</label><input id="l-pass" type="password" autocomplete="current-password" required></div>
      <p class="form-alert" role="alert" hidden></p>
      <button class="btn btn--block" type="submit">Entrar</button>
    </form>
    <p class="small" style="margin-top:16px;display:flex;gap:16px;flex-wrap:wrap">
      <button class="link-btn" id="to-signup">Es mi primera vez: crear mi acceso</button>
      <button class="link-btn" id="to-recover">Olvidé mi contraseña</button>
    </p>
  </div>`;
  const form = $('#login');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alert = $('.form-alert', form);
    const email = $('#l-email').value.trim(); const pass = $('#l-pass').value;
    if (!email || !pass) { alert.hidden = false; alert.textContent = 'Escribe tu correo y tu contraseña.'; return; }
    try { await signIn(email, pass); start(); } catch (err) {
      alert.hidden = false; alert.textContent = err.message;
      if (err.unverifiedToken) {
        const again = document.createElement('button'); again.type = 'button'; again.className = 'link-btn small'; again.textContent = 'Reenviar el correo de confirmación';
        again.addEventListener('click', async () => { try { await resendVerification(err.unverifiedToken); again.replaceWith('Correo reenviado.'); } catch (e2) { again.replaceWith(e2.message); } });
        alert.append(' ', again);
      }
    }
  });
  $('#to-signup').addEventListener('click', renderSignup);
  $('#to-recover').addEventListener('click', renderRecover);
}

function renderSignup() {
  root.innerHTML = `<div class="admin-card admin-login">
    <h1 style="font-size:1.8rem">Crear mi acceso</h1>
    <p class="small muted">Usa el correo que la administradora actual registró en el panel. Te llegará un correo para confirmarlo.</p>
    <form id="signup" class="stack" novalidate>
      <div class="field"><label for="s-email">Correo</label><input id="s-email" type="email" autocomplete="username"></div>
      <div class="field"><label for="s-pass">Contraseña nueva</label><input id="s-pass" type="password" autocomplete="new-password"><span class="hint">Mínimo 8 caracteres.</span></div>
      <p class="form-alert" role="alert" hidden></p>
      <button class="btn btn--block" type="submit">Crear acceso</button>
    </form>
    <button class="link-btn small" style="margin-top:14px" id="back">← Volver</button>
  </div>`;
  $('#back').addEventListener('click', () => renderLogin());
  $('#signup').addEventListener('submit', async (e) => {
    e.preventDefault();
    const alert = $('.form-alert', e.target);
    const email = $('#s-email').value.trim(); const pass = $('#s-pass').value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { alert.hidden = false; alert.textContent = 'Revisa el correo.'; return; }
    if (pass.length < 8) { alert.hidden = false; alert.textContent = 'La contraseña debe tener al menos 8 caracteres.'; return; }
    try {
      await signUp(email, pass);
      root.innerHTML = `<div class="admin-card admin-login"><h1 style="font-size:1.8rem">Revisa tu correo</h1><p>Te enviamos un enlace a <strong>${esc(email)}</strong>. Ábrelo para confirmar tu acceso y luego entra con tu contraseña.</p><p class="small muted">Si no llega en unos minutos, revisa la carpeta de spam.</p></div>`;
    } catch (err) { alert.hidden = false; alert.textContent = err.message; }
  });
}

function renderRecover() {
  root.innerHTML = `<div class="admin-card admin-login">
    <h1 style="font-size:1.8rem">Recuperar contraseña</h1>
    <form id="recover" class="stack" novalidate>
      <div class="field"><label for="r-email">Correo</label><input id="r-email" type="email" autocomplete="username"></div>
      <p class="form-alert" role="alert" hidden></p>
      <button class="btn btn--block" type="submit">Enviarme un enlace</button>
    </form>
    <button class="link-btn small" style="margin-top:14px" id="back">← Volver</button>
  </div>`;
  $('#back').addEventListener('click', () => renderLogin());
  $('#recover').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#r-email').value.trim();
    try { await sendRecovery(email); } catch { /* no revelamos si el correo existe */ }
    root.innerHTML = '<div class="admin-card admin-login"><h1 style="font-size:1.8rem">Revisa tu correo</h1><p>Si ese correo tiene acceso, te llegará un enlace para crear una contraseña nueva. Después vuelve a esta página y entra con ella.</p></div>';
  });
}

function renderNotAdmin() {
  renderUserBar();
  root.innerHTML = `<div class="admin-card admin-login">
    <h1 style="font-size:1.8rem">Este correo no es administrador</h1>
    <p>Entraste como <strong>${esc(getSession()?.email || '')}</strong>, pero ese correo no tiene permiso para editar la tienda.</p>
    <p>Pide a la administradora actual que te agregue en <em>Panel → Administradoras</em>.</p>
  </div>`;
}

/* ======================================================================
   PANEL
   ====================================================================== */
const TABS = [['productos', 'Productos'], ['pedidos', 'Pedidos'], ['tienda', 'Datos de la tienda'], ['admins', 'Administradoras'], ['mensajes', 'Mensajes'], ['autorizaciones', 'Autorizaciones'], ['ayuda', 'Ayuda']];
let products = [];
let inventory = {};
let settings = {};

async function renderPanel() {
  renderUserBar();
  root.innerHTML = `<div class="admin-tabs" role="tablist">${TABS.map(([id, label], i) => `<button role="tab" data-tab="${id}" aria-selected="${i === 0}">${label}</button>`).join('')}</div><div id="tab-body"></div>`;
  $('.admin-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]'); if (!b) return;
    $$('.admin-tabs [role=tab]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    openTab(b.dataset.tab);
  });
  openTab('productos');
}

function openTab(id) {
  body().onclick = null;
  ({ productos: tabProducts, pedidos: tabOrders, tienda: tabStore, admins: tabAdmins, mensajes: tabMessages, autorizaciones: tabConsents, ayuda: tabHelp })[id]();
}
const body = () => $('#tab-body');

/* ---------------- Productos ---------------- */
async function loadAdminProducts() {
  const [rows, inv] = await Promise.all([adminProducts(), adminInventory()]);
  inventory = inv;
  products = rows.map((p) => {
    const tones = (p.tones || []).map((t) => ({ ...t, stock: inv[invKey(p.id, t.name)] ?? 0 }));
    const stock = tones.length ? tones.reduce((n, t) => n + t.stock, 0) : (inv[invKey(p.id)] ?? 0);
    return { ...p, tones, stock, _sort: p.sort ?? 0, _active: p.active !== false };
  });
}

async function tabProducts() {
  body().innerHTML = '<p class="muted">Cargando productos…</p>';
  try { await loadAdminProducts(); } catch (e) { body().innerHTML = `<p class="form-alert">${esc(e.message)}</p>`; return; }
  if (!products.length) {
    body().innerHTML = `<div class="admin-card"><h2>Empecemos</h2>
      <p>Todavía no hay productos en el panel. Puedes copiar los productos actuales de la tienda para editarlos desde aquí.</p>
      <button class="btn" id="seed">Copiar los productos actuales</button>
      <button class="btn btn--outline" id="new-first" style="margin-left:8px">Empezar desde cero</button></div>`;
    $('#seed').addEventListener('click', seedProducts);
    $('#new-first').addEventListener('click', () => editProduct(null));
    return;
  }
  body().innerHTML = `<div class="admin-toolbar">
      <input class="input" id="p-search" type="search" placeholder="Buscar producto…" aria-label="Buscar producto">
      <button class="btn" id="p-new">+ Nuevo producto</button>
    </div>
    <p class="small muted">${products.length} productos. Toca “Editar” para cambiar precio, stock, fotos o textos. Usa las flechas para cambiar el orden en la tienda.</p>
    <div class="prod-list" id="p-list"></div>`;
  const paint = () => {
    const q = normalize($('#p-search').value);
    $('#p-list').innerHTML = products.filter((p) => !q || normalize(`${p.name} ${p.brand}`).includes(q)).map((p) => `
      <div class="prod-row ${p._active ? '' : 'prod-row--off'}">
        <img src="${esc(p.thumb || p.image || '')}" alt="" loading="lazy">
        <div><strong>${esc(p.name)}</strong>${p._active ? '' : '<span class="pill">Oculto</span>'}${totalStock(p) <= 0 ? '<span class="pill pill--warn">Agotado</span>' : ''}
          <div class="prod-row__meta">${esc(p.brand)} · ${esc(CATEGORIES[p.category] || p.category)} · ${formatPrice(p.price)}${p.discount ? ` (-${p.discount}%)` : ''} · <strong>${totalStock(p)} unidades</strong>${outTones(p)}</div></div>
        <div class="prod-row__actions">
          <button class="btn btn--outline btn--sm" data-up="${esc(p.id)}" aria-label="Subir ${esc(p.name)}">↑</button>
          <button class="btn btn--outline btn--sm" data-down="${esc(p.id)}" aria-label="Bajar ${esc(p.name)}">↓</button>
          <button class="btn btn--sm" data-edit="${esc(p.id)}">Editar</button>
        </div>
      </div>`).join('') || '<p class="muted">Sin resultados.</p>';
  };
  paint();
  $('#p-search').addEventListener('input', paint);
  $('#p-new').addEventListener('click', () => editProduct(null));
  $('#p-list').addEventListener('click', async (e) => {
    const ed = e.target.closest('[data-edit]');
    if (ed) { editProduct(products.find((p) => p.id === ed.dataset.edit)); return; }
    const mv = e.target.closest('[data-up],[data-down]');
    if (!mv) return;
    const id = mv.dataset.up || mv.dataset.down;
    const i = products.findIndex((p) => p.id === id);
    const j = mv.dataset.up ? i - 1 : i + 1;
    if (j < 0 || j >= products.length) return;
    [products[i], products[j]] = [products[j], products[i]];
    paint();
    try {
      await Promise.all([i, j].map((k) => setProductFields(products[k].id, { sort: k })));
    } catch (err) { toast(err.message, 'error'); }
  });
}

async function seedProducts() {
  const btn = $('#seed'); btn.disabled = true; btn.textContent = 'Copiando…';
  try {
    const res = await fetch('data/products.json', { cache: 'no-cache' });
    const { products: list } = await res.json();
    await seedFb(list);
    toast(`${list.length} productos copiados`);
    tabProducts();
  } catch (e) { toast(e.message, 'error'); btn.disabled = false; btn.textContent = 'Copiar los productos actuales'; }
}

/* Las fotos se guardan reducidas DENTRO de Firestore (gratis, sin Storage).
   Cada producto admite hasta 4 fotos; juntas deben pesar menos de ~900 KB. */
const MAX_PHOTOS = 4;
const MAX_GALLERY_CHARS = 900000;

/** Dibuja una imagen (archivo, ruta o dataURL) recortada a 4:5 y la devuelve como dataURL WebP. */
async function toDataURL(source, W, H, q) {
  let bmp;
  if (source instanceof Blob) bmp = await createImageBitmap(source);
  else {
    bmp = await new Promise((ok, bad) => { const im = new Image(); im.onload = () => ok(im); im.onerror = bad; im.src = source; });
  }
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const bw = bmp.width || bmp.naturalWidth; const bh = bmp.height || bmp.naturalHeight;
  const sc = Math.max(W / bw, H / bh);
  const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(bmp, (W - bw * sc) / 2, (H - bh * sc) / 2, bw * sc, bh * sc);
  let out = c.toDataURL('image/webp', q);
  if (!out.startsWith('data:image/webp')) out = c.toDataURL('image/jpeg', q);
  return out;
}
const processPhoto = (file) => toDataURL(file, 800, 1000, 0.8);
const isData = (src) => String(src).startsWith('data:');

function slugify(s) { return normalize(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || `producto-${randomId(4).toLowerCase()}`; }

async function editProduct(p) {
  const isNew = !p;
  if (p?.gallery) { try { p = { ...p, images: (await adminGallery(p.id)) || p.images }; } catch { /* usa las que hay */ } }
  const d = p ? structuredClone(p) : {
    id: `p${Date.now().toString(36)}`, slug: '', name: '', brand: '', category: 'labiales', price: 0, discount: 0, tones: [],
    skinTypes: ['seca', 'grasa', 'mixta', 'normal', 'sensible'], stock: 0, sold: 0, createdAt: new Date().toISOString().slice(0, 10),
    rating: 0, reviewsCount: 0, images: [], description: '', ingredients: 'Consulta la lista completa de ingredientes en el empaque del producto.',
    howToSteps: [], tip: '', nso: '', reviews: [], _active: true,
  };
  const oldKeys = (p?.tones?.length ? p.tones.map((t) => invKey(p.id, t.name)) : (p ? [invKey(p.id)] : []));
  const famOpts = (sel) => Object.entries(TONE_FAMILIES).map(([k, t]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${t.label}</option>`).join('');

  body().innerHTML = `<form class="admin-card" id="editor" novalidate>
    <button type="button" class="link-btn small" id="back">← Volver a la lista</button>
    <h2 style="margin-top:10px">${isNew ? 'Nuevo producto' : esc(d.name)}</h2>
    <p class="form-alert" role="alert" hidden></p>

    <div class="form-grid form-grid--2">
      <div class="field span-2"><label for="e-name">Nombre</label><input id="e-name" value="${esc(d.name)}" required></div>
      <div class="field"><label for="e-brand">Marca</label><input id="e-brand" value="${esc(d.brand)}"></div>
      <div class="field"><label for="e-cat">Categoría</label><select id="e-cat">${Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}" ${k === d.category ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div class="field"><label for="e-price">Precio con IVA (sin puntos)</label><input id="e-price" type="number" inputmode="numeric" min="0" step="100" value="${d.price}"></div>
      <div class="field"><label for="e-disc">Descuento % <span class="opt">(0 = sin oferta)</span></label><input id="e-disc" type="number" inputmode="numeric" min="0" max="90" value="${d.discount || 0}"></div>
      <div class="field" id="e-stock-wrap"><label for="e-stock">Unidades disponibles</label><div class="qty stepper"><button type="button" data-step="-1" aria-label="Restar una unidad">−</button><input id="e-stock" type="number" inputmode="numeric" min="0" value="${d.stock}" ><button type="button" data-step="1" aria-label="Sumar una unidad">+</button></div><span class="hint" id="e-stock-hint"></span></div>
      <div class="field"><label class="check" style="margin-top:30px"><input type="checkbox" id="e-active" ${d._active ? 'checked' : ''}> Mostrar en la tienda</label></div>
    </div>

    <div class="editor-section"><h3>Fotos</h3>
      <p class="small muted">La primera foto (borde dorado) es la principal. Puedes subirlas desde el celular: se recortan y reducen solas. Máximo ${MAX_PHOTOS} fotos.</p>
      <div class="photo-grid" id="photos"></div>
    </div>

    <div class="editor-section"><h3>Tonos o versiones</h3>
      <div class="field" style="max-width:280px"><label for="e-vlabel">Cómo se llaman</label><select id="e-vlabel">
        ${['Tono', 'Versión', 'Color'].map((v) => `<option ${v === (d.variantLabel || 'Tono') ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div id="tones" style="margin-top:12px"></div>
      <button type="button" class="btn btn--outline btn--sm" id="add-tone">+ Agregar tono</button>
    </div>

    <div class="editor-section"><h3>Textos</h3>
      <div class="form-grid">
        <div class="field"><label for="e-desc">Descripción</label><textarea id="e-desc">${esc(d.description)}</textarea></div>
        <div class="field"><label for="e-steps">Cómo usarlo <span class="opt">(un paso por línea)</span></label><textarea id="e-steps">${esc((d.howToSteps || []).join('\n'))}</textarea></div>
        <div class="field"><label for="e-tip">Consejo de Soles <span class="opt">(opcional)</span></label><input id="e-tip" value="${esc(d.tip || '')}"></div>
        <div class="field"><label for="e-ingr">Ingredientes</label><textarea id="e-ingr" style="min-height:80px">${esc(d.ingredients || '')}</textarea></div>
        <div class="field"><label for="e-nso">Registro sanitario INVIMA (NSO)</label><input id="e-nso" value="${esc(d.nso || '')}"><span class="hint">Cópialo del empaque. En brochas y accesorios escribe “No aplica”.</span></div>
      </div>
    </div>

    <div class="admin-sticky-save">
      <button class="btn" type="submit">Guardar cambios</button>
      <button class="btn btn--outline" type="button" id="cancel">Cancelar</button>
      ${isNew ? '' : '<button class="btn btn--danger" type="button" id="del" style="margin-left:auto">Eliminar producto</button>'}
    </div>
  </form>`;

  /* Fotos */
  const paintPhotos = () => {
    $('#photos').innerHTML = d.images.map((src, i) => `<div class="photo">
        <img src="${esc(src)}" alt="Foto ${i + 1}">
        <div class="photo__tools">
          ${i ? `<button type="button" data-first="${i}">Principal</button>` : '<span class="small muted">Principal</span>'}
          <button type="button" data-rm="${i}" aria-label="Quitar foto ${i + 1}">Quitar</button>
        </div></div>`).join('')
      + (d.images.length < MAX_PHOTOS ? `<label class="photo-add"><input type="file" accept="image/*" multiple id="photo-input"><span>+ Agregar fotos</span></label>` : '');
  };
  paintPhotos();
  $('#photos').addEventListener('click', (e) => {
    const first = e.target.closest('[data-first]'); const rm = e.target.closest('[data-rm]');
    if (first) { const i = Number(first.dataset.first); d.images.unshift(...d.images.splice(i, 1)); paintPhotos(); }
    if (rm) { const i = Number(rm.dataset.rm); d.images.splice(i, 1); paintPhotos(); }
  });
  $('#photos').addEventListener('change', async (e) => {
    if (e.target.id !== 'photo-input') return;
    const files = [...e.target.files].slice(0, MAX_PHOTOS - d.images.length);
    for (const f of files) {
      try { d.images.push(await processPhoto(f)); paintPhotos(); } catch { toast('No se pudo leer esa foto. Prueba con otra.', 'error'); }
    }
    toast('Foto lista. Toca “Guardar cambios”.');
  });

  /* Tonos */
  const tonesBox = $('#tones');
  const paintTones = () => {
    tonesBox.innerHTML = d.tones.map((t, i) => `<div class="tone-row" data-i="${i}">
        <div class="field"><label for="t-n-${i}">Nombre</label><input id="t-n-${i}" data-k="name" value="${esc(t.name)}"></div>
        <div class="field"><label for="t-c-${i}">Color</label><input id="t-c-${i}" type="color" data-k="hex" value="${HEX.test(t.hex) ? t.hex : '#cccccc'}"></div>
        <div class="field"><label for="t-s-${i}">Unidades</label><div class="qty stepper"><button type="button" data-step="-1" aria-label="Restar una unidad">−</button><input id="t-s-${i}" type="number" inputmode="numeric" min="0" value="${Number(t.stock) || 0}" data-k="stock"><button type="button" data-step="1" aria-label="Sumar una unidad">+</button></div></div>
        <div class="field tone-family"><label for="t-f-${i}">Familia (para el filtro)</label><select id="t-f-${i}" data-k="family">${famOpts(t.family)}</select></div>
        <button type="button" class="icon-btn" data-rm-tone="${i}" aria-label="Quitar tono ${esc(t.name)}">✕</button>
      </div>`).join('') || '<p class="small muted">Sin tonos (por ejemplo, brochas). Si tiene varios tonos o versiones, agrégalos aquí.</p>';
    paintStockWrap();
  };
  /* Con tonos, las unidades se cuentan por tono; sin tonos, en el campo del producto. */
  function paintStockWrap() {
    const byTone = d.tones.length > 0;
    $('#e-stock').disabled = byTone;
    $('#e-stock-wrap').querySelectorAll('button').forEach((b) => { b.disabled = byTone; });
    if (byTone) $('#e-stock').value = d.tones.reduce((s, t) => s + (Number(t.stock) || 0), 0);
    $('#e-stock-hint').textContent = byTone
      ? 'Este producto tiene tonos: escribe las unidades de cada tono abajo. Aquí ves el total.'
      : `0 = Agotado. ${CONFIG.lowStockThreshold} o menos = “Últimas unidades”. Se descuentan solas con cada pedido.`;
  }
  let stockTouched = false;
  $('#editor').addEventListener('click', (e) => {
    const b = e.target.closest('[data-step]'); if (!b) return;
    const input = b.parentElement.querySelector('input');
    input.value = Math.max(0, (Number(input.value) || 0) + Number(b.dataset.step));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  $('#editor').addEventListener('input', (e) => { if (e.target.id === 'e-stock' || e.target.dataset.k === 'stock') stockTouched = true; });
  paintTones();
  tonesBox.addEventListener('input', (e) => {
    const row = e.target.closest('.tone-row'); if (!row || !e.target.dataset.k) return;
    const k = e.target.dataset.k;
    d.tones[Number(row.dataset.i)][k] = k === 'stock' ? Math.max(0, Number(e.target.value) || 0) : e.target.value;
    if (k === 'stock') paintStockWrap();
  });
  tonesBox.addEventListener('click', (e) => { const b = e.target.closest('[data-rm-tone]'); if (b) { d.tones.splice(Number(b.dataset.rmTone), 1); paintTones(); } });
  $('#add-tone').addEventListener('click', () => { d.tones.push({ name: '', hex: '#d9a98f', family: 'nude', stock: 0 }); paintTones(); tonesBox.querySelector('.tone-row:last-child input')?.focus(); });

  /* Guardar / cancelar / eliminar */
  const back = () => tabProducts();
  $('#back').addEventListener('click', back);
  $('#cancel').addEventListener('click', back);
  $('#del')?.addEventListener('click', async () => {
    if (!confirm(`¿Eliminar “${d.name}”? Si solo quieres ocultarlo un tiempo, mejor desmarca “Mostrar en la tienda”.`)) return;
    try { await deleteProductFb(p); toast('Producto eliminado'); back(); } catch (e) { toast(e.message, 'error'); }
  });
  $('#editor').addEventListener('submit', async (e) => {
    e.preventDefault();
    const alert = $('.form-alert', e.target);
    const name = $('#e-name').value.trim();
    const price = Number($('#e-price').value);
    const problems = [];
    if (!name) problems.push('Escribe el nombre del producto.');
    if (!(price > 0)) problems.push('Escribe un precio mayor que 0.');
    if (!d.images.length) problems.push('Agrega al menos una foto.');
    if (d.tones.some((t) => !t.name.trim())) problems.push('Cada tono necesita un nombre (o quítalo).');
    if (problems.length) { alert.hidden = false; alert.innerHTML = problems.map(esc).join('<br>'); alert.scrollIntoView({ block: 'center' }); return; }
    alert.hidden = true;

    const data = {
      ...d, name, brand: $('#e-brand').value.trim(), category: $('#e-cat').value, price,
      discount: Math.min(90, Math.max(0, Number($('#e-disc').value) || 0)), 
      variantLabel: $('#e-vlabel').value, description: $('#e-desc').value.trim(),
      howToSteps: $('#e-steps').value.split('\n').map((s) => s.trim()).filter(Boolean), tip: $('#e-tip').value.trim(),
      ingredients: $('#e-ingr').value.trim(), nso: $('#e-nso').value.trim(),
      tones: d.tones.map((t) => ({ name: t.name.trim(), hex: HEX.test(t.hex) ? t.hex : '#cccccc', family: TONE_FAMILIES[t.family] ? t.family : 'nude', stock: Math.max(0, Number(t.stock) || 0) })),
    };
    data.slug = d.slug || slugify(name);
    if (products.some((x) => x.slug === data.slug && x.id !== data.id)) data.slug = `${data.slug}-${randomId(3).toLowerCase()}`;
    data.howToUse = data.howToSteps.join(' ');
    /* Unidades: van al inventario (no al producto). Si no las tocaste, solo se envían las
       referencias nuevas o eliminadas, para no pisar descuentos de pedidos recientes. */
    const newStock = data.tones.length
      ? Object.fromEntries(data.tones.map((t) => [invKey(data.id, t.name), t.stock]))
      : { [invKey(data.id)]: Math.max(0, Number($('#e-stock').value) || 0) };
    const stockToSend = (isNew || stockTouched) ? newStock : Object.fromEntries(Object.entries(newStock).filter(([k]) => !oldKeys.includes(k)));
    const removedKeys = oldKeys.filter((k) => !(k in newStock));
    data.tones = data.tones.map(({ stock, ...t }) => t);
    delete data.stock;

    /* Fotos: si todas son archivos de la tienda, se guardan como rutas; si hay fotos nuevas,
       van completas a "productImages" y el producto guarda solo una miniatura. */
    let gallery = null;
    if (d.images.some(isData)) {
      gallery = d.images;
      const size = gallery.reduce((n, x) => n + String(x).length, 0);
      if (size > MAX_GALLERY_CHARS) { alert.hidden = false; alert.textContent = 'Las fotos pesan demasiado juntas. Quita una y vuelve a guardar.'; return; }
      data.thumb = await toDataURL(d.images[0], 400, 500, 0.75);
      data.image = data.thumb; data.images = [data.thumb]; data.gallery = true;
    } else {
      data.images = d.images; data.image = d.images[0]; data.gallery = false;
      if (!(p && p.images?.[0] === d.images[0] && p.thumb)) data.thumb = await toDataURL(d.images[0], 400, 500, 0.75);
    }
    data.active = $('#e-active').checked;
    data.sort = isNew ? products.length : (d._sort ?? 0);
    delete data._active; delete data._sort; delete data.thumbs;
    try {
      await saveProductFb(data, { gallery, stock: stockToSend, removedKeys });
      toast('Cambios guardados. Ya se ven en la tienda.');
      back();
    } catch (err) { alert.hidden = false; alert.textContent = err.message; }
  });
}

/* ---------------- Pedidos ---------------- */
const STATUS = { nuevo: 'Nuevo', pagado: 'Pagado', enviado: 'Enviado', cancelado: 'Cancelado' };
let orderFilter = 'activos';

async function tabOrders() {
  body().innerHTML = '<p class="muted">Cargando pedidos…</p>';
  let rows = [];
  try { rows = await listOrders(); } catch (e) { body().innerHTML = `<p class="form-alert">${esc(e.message)}</p>`; return; }
  const filters = [['activos', 'Por atender'], ['todos', 'Todos'], ['pagado', 'Pagados'], ['enviado', 'Enviados'], ['cancelado', 'Cancelados']];
  const show = rows.filter((r) => (orderFilter === 'todos' ? true : orderFilter === 'activos' ? r.status === 'nuevo' : r.status === orderFilter));
  body().innerHTML = `<div class="admin-card"><h2>Pedidos</h2>
    <p class="small muted">Cada pedido ya descontó sus unidades del inventario. Si no se concreta, usa <strong>Cancelar</strong> y las unidades vuelven.</p>
    <div class="active-filters" style="margin:12px 0">${filters.map(([k, l]) => `<button type="button" data-of="${k}" style="${k === orderFilter ? 'background:var(--ink);color:#fff;border-color:var(--ink)' : ''}">${l} (${rows.filter((r) => (k === 'todos' ? true : k === 'activos' ? r.status === 'nuevo' : r.status === k)).length})</button>`).join('')}</div>
    ${show.map((r) => { const o = r.data || {}; const c = o.contact || {}; const sh = o.shipping || {}; const tt = o.totals || {};
      const wa = c.phone ? `https://wa.me/57${String(c.phone).replace(/\D/g, '').slice(-10)}` : '';
      return `<article class="msg-item">
        <header><strong>${esc(r.id)} · ${esc(c.name || '')}</strong><span><span class="status-pill">${STATUS[r.status]}</span> ${new Date(r.createdAt).toLocaleString('es-CO')}</span></header>
        <ul class="small" style="margin:8px 0;padding-left:18px">${(o.items || []).map((i) => `<li>${i.qty} × ${esc(i.name)}${i.tone ? ` (${esc(i.tone)})` : ''} — ${formatPrice(i.total)}</li>`).join('')}</ul>
        <p class="small" style="margin:0"><strong>Total: ${formatPrice(tt.total ?? o.serverSubtotal ?? 0)}</strong>${tt.discount ? ` · descuento ${formatPrice(tt.discount)}${tt.coupon ? ` (${esc(tt.coupon)})` : ''}` : ''} · envío ${tt.shipping === 0 ? 'gratis' : tt.shipping == null ? (/–/.test(tt.shippingText || '') ? `${esc(tt.shippingText)} (por confirmar)` : 'por confirmar') : formatPrice(tt.shipping)}</p>
        <p class="small" style="margin:4px 0 0">${esc(sh.address || '')} ${esc(sh.address2 || '')}, ${esc(sh.city || '')}, ${esc(sh.department || '')} · ${esc(sh.method || '')}${o.invoice && typeof o.invoice === 'object' ? ` · Factura: ${esc(o.invoice.docType)} ${esc(o.invoice.docNumber)}` : ''}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
          ${wa ? `<a class="btn btn--outline btn--sm" href="${wa}" target="_blank" rel="noopener">WhatsApp ${esc(c.phone)}</a>` : ''}
          ${r.status === 'nuevo' ? `<button class="btn btn--sm" data-set="pagado" data-id="${esc(r.id)}">Marcar pagado</button>` : ''}
          ${r.status === 'pagado' ? `<button class="btn btn--sm" data-set="enviado" data-id="${esc(r.id)}">Marcar enviado</button>` : ''}
          ${r.status === 'nuevo' || r.status === 'pagado' ? `<button class="btn btn--outline btn--sm" data-cancel="${esc(r.id)}">Cancelar y devolver unidades</button>` : ''}
        </div></article>`; }).join('') || '<p class="muted">No hay pedidos en esta lista.</p>'}
  </div>`;
  body().onclick = async (e) => {
    const f = e.target.closest('[data-of]');
    if (f) { orderFilter = f.dataset.of; tabOrders(); return; }
    const set = e.target.closest('[data-set]');
    if (set) {
      try { await setOrderStatus(set.dataset.id, set.dataset.set); toast(`Pedido marcado como ${STATUS[set.dataset.set].toLowerCase()}`); tabOrders(); } catch (err) { toast(err.message, 'error'); }
      return;
    }
    const can = e.target.closest('[data-cancel]');
    if (can) {
      if (!confirm(`¿Cancelar el pedido ${can.dataset.cancel}? Las unidades vuelven al inventario.`)) return;
      try { await cancelOrderFb(rows.find((x) => x.id === can.dataset.cancel)); toast('Pedido cancelado. Unidades devueltas.'); tabOrders(); } catch (err) { toast(err.message, 'error'); }
    }
  };
}

/* ---------------- Datos de la tienda ---------------- */
async function tabStore() {
  body().innerHTML = '<p class="muted">Cargando…</p>';
  try { settings = (await fetchSettings()) || {}; } catch (e) { body().innerHTML = `<p class="form-alert">${esc(e.message)}</p>`; return; }
  applySettings(settings);
  const c = CONFIG.company;
  const wa = (CONFIG.whatsapp.number || '').replace(/^57/, '');
  const ship = CONFIG.shipping;
  const coupons = Object.entries(CONFIG.coupons).map(([code, v]) => ({ code, ...v }));
  const f = (id, label, value, extra = '') => `<div class="field"><label for="${id}">${label}</label><input id="${id}" value="${esc(value ?? '')}" ${extra}></div>`;

  body().innerHTML = `<form class="admin-card" id="store-form" novalidate>
    <h2>Datos de la tienda</h2>
    <p class="small muted">Todo lo que cambies aquí se actualiza en la tienda al guardar.</p>
    <p class="form-alert" role="alert" hidden></p>

    <div class="editor-section"><h3>Tienda</h3><div class="form-grid form-grid--2">
      ${f('st-name', 'Nombre de la tienda', CONFIG.storeName)}
      ${f('st-tag', 'Frase (eslogan)', CONFIG.tagline)}
      ${f('st-wa', 'WhatsApp (10 dígitos)', wa, 'inputmode="numeric" maxlength="10"')}
      ${f('st-wamsg', 'Mensaje inicial de WhatsApp', CONFIG.whatsapp.message)}
      ${f('st-pay', 'Medios de pago (separados por coma)', (CONFIG.paymentOptions || []).join(', '))}
      ${f('st-hours', 'Horario de atención', c.hours)}
    </div></div>

    <div class="editor-section"><h3>Datos legales <span class="pill">Se muestran en el pie de página y las políticas</span></h3>
      <p class="small muted">La ley (Estatuto del Consumidor, art. 50) exige mostrarlos en tiendas en línea. Para persona natural, el NIT es la cédula más un dígito de verificación (está en el RUT).</p>
      <div class="form-grid form-grid--2">
      ${f('st-legal', 'Nombre o razón social', c.legalName)}
      ${f('st-nit', 'NIT', c.nit, 'placeholder="Ej.: 1.100.000.000-3"')}
      ${f('st-addr', 'Dirección', c.address)}
      ${f('st-city', 'Ciudad', c.city)}
      ${f('st-phone', 'Teléfono', c.phone)}
      ${f('st-email', 'Correo de la tienda', c.email, 'type="email"')}
      ${f('st-pemail', 'Correo para datos personales', c.privacyEmail, 'type="email"')}
    </div></div>

    <div class="editor-section"><h3>Envíos</h3><div class="form-grid form-grid--2">
      ${f('st-free', 'Envío gratis desde (pesos)', CONFIG.freeShippingFrom, 'type="number" min="0" step="1000"')}
      ${f('st-nmin', 'Envío nacional: desde', ship.nationalMin, 'type="number" min="0" step="500"')}
      ${f('st-nmax', 'Envío nacional: hasta', ship.nationalMax, 'type="number" min="0" step="500"')}
      ${f('st-lcity', 'Domicilio local: ciudad', ship.localCity)}
      ${f('st-lprice', 'Domicilio local: precio', ship.localPrice ?? '', 'type="number" min="0" step="500" placeholder="Vacío = por confirmar"')}
      <p class="small muted span-2" style="margin:0">Domicilio: deja el precio <strong>vacío</strong> para confirmarlo por WhatsApp, escribe <strong>0</strong> para que sea gratis, o escribe el valor. Envío nacional: si “desde” y “hasta” son iguales, se cobra ese valor fijo.</p>
    </div></div>

    <div class="editor-section"><h3>Cupones</h3>
      <div id="coupons"></div>
      <button type="button" class="btn btn--outline btn--sm" id="add-coupon">+ Agregar cupón</button>
    </div>

    <div class="admin-sticky-save"><button class="btn" type="submit">Guardar datos</button></div>
  </form>`;

  const paintCoupons = () => {
    $('#coupons').innerHTML = coupons.map((k, i) => `<div class="coupon-row" data-i="${i}">
      <div class="field"><label for="c-code-${i}">Código</label><input id="c-code-${i}" data-k="code" value="${esc(k.code)}" style="text-transform:uppercase"></div>
      <div class="field"><label for="c-type-${i}">Tipo</label><select id="c-type-${i}" data-k="type">
        <option value="percent" ${k.type === 'percent' ? 'selected' : ''}>% de descuento</option>
        <option value="fixed" ${k.type === 'fixed' ? 'selected' : ''}>Valor fijo ($)</option>
        <option value="shipping" ${k.type === 'shipping' ? 'selected' : ''}>Envío gratis</option></select></div>
      <div class="field"><label for="c-val-${i}">Valor</label><input id="c-val-${i}" data-k="value" type="number" min="0" value="${k.value ?? ''}"></div>
      <div class="field"><label for="c-min-${i}">Compra mínima</label><input id="c-min-${i}" data-k="minSubtotal" type="number" min="0" value="${k.minSubtotal ?? ''}"></div>
      <button type="button" class="icon-btn" data-rm-coupon="${i}" aria-label="Quitar cupón">✕</button></div>`).join('') || '<p class="small muted">Sin cupones.</p>';
  };
  paintCoupons();
  $('#coupons').addEventListener('input', (e) => { const r = e.target.closest('.coupon-row'); if (r && e.target.dataset.k) coupons[Number(r.dataset.i)][e.target.dataset.k] = e.target.value; });
  $('#coupons').addEventListener('click', (e) => { const b = e.target.closest('[data-rm-coupon]'); if (b) { coupons.splice(Number(b.dataset.rmCoupon), 1); paintCoupons(); } });
  $('#add-coupon').addEventListener('click', () => { coupons.push({ code: '', type: 'percent', value: 10 }); paintCoupons(); });

  $('#store-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const alert = $('.form-alert', e.target);
    const v = (id) => $(`#${id}`).value.trim();
    const waNum = v('st-wa').replace(/\D/g, '');
    if (!/^3\d{9}$/.test(waNum)) { alert.hidden = false; alert.textContent = 'El WhatsApp debe ser un celular de 10 dígitos que empiece por 3.'; $('#st-wa').focus(); return; }
    const couponObj = {};
    for (const k of coupons) {
      const code = String(k.code || '').trim().toUpperCase();
      if (!code) continue;
      couponObj[code] = { type: k.type, label: k.type === 'percent' ? `${k.value}% de descuento` : k.type === 'fixed' ? `${formatPrice(Number(k.value) || 0)} de descuento` : 'Envío gratis',
        ...(k.type !== 'shipping' ? { value: Number(k.value) || 0 } : {}), ...(Number(k.minSubtotal) > 0 ? { minSubtotal: Number(k.minSubtotal) } : {}) };
    }
    const value = {
      storeName: v('st-name') || 'Soles Store', tagline: v('st-tag'),
      whatsapp: { number: `57${waNum}`, message: v('st-wamsg') },
      paymentOptions: v('st-pay').split(',').map((s) => s.trim()).filter(Boolean),
      company: { legalName: v('st-legal'), nit: v('st-nit'), address: v('st-addr'), city: v('st-city'), phone: v('st-phone'), email: v('st-email'), privacyEmail: v('st-pemail'), hours: v('st-hours') },
      freeShippingFrom: Number(v('st-free')) || 0,
      shipping: {
        nationalMin: Number(v('st-nmin')) || 0, nationalMax: Math.max(Number(v('st-nmax')) || 0, Number(v('st-nmin')) || 0),
        localCity: v('st-lcity') || 'Caucasia', localDepartment: CONFIG.shipping.localDepartment,
        localPrice: v('st-lprice') === '' ? null : Math.max(0, Number(v('st-lprice')) || 0),
      },
      coupons: couponObj,
    };
    try {
      await saveSettingsFb(value);
      settings = value; applySettings(value);
      alert.hidden = true; toast('Datos guardados. Ya se ven en la tienda.');
    } catch (err) { alert.hidden = false; alert.textContent = err.message; }
  });
}

/* ---------------- Administradoras ---------------- */
async function tabAdmins() {
  body().innerHTML = '<p class="muted">Cargando…</p>';
  let list = [];
  try { list = (await listAdmins()).map((a) => ({ email: a.email || a.id, added_at: a.addedAt || a._createTime })); } catch (e) { body().innerHTML = `<p class="form-alert">${esc(e.message)}</p>`; return; }
  const me = (getSession()?.email || '').toLowerCase();
  body().innerHTML = `<div class="admin-card">
    <h2>Administradoras</h2>
    <p>Estas personas pueden editar la tienda. Para <strong>pasarle la tienda a otra persona</strong>:</p>
    <ol class="small"><li>Agrega su correo aquí.</li><li>Ella entra a esta misma página, elige “Es mi primera vez: crear mi acceso” y confirma su correo.</li><li>Cuando ya pueda entrar, quita tu correo de la lista.</li></ol>
    <div class="table-wrap"><table><thead><tr><th>Correo</th><th>Desde</th><th></th></tr></thead><tbody>
      ${list.map((a) => `<tr><td>${esc(a.email)}${a.email === me ? ' <span class="pill">Tú</span>' : ''}</td><td>${new Date(a.added_at).toLocaleDateString('es-CO')}</td>
        <td>${list.length > 1 ? `<button class="btn btn--outline btn--sm" data-rm-admin="${esc(a.email)}">Quitar</button>` : '<span class="small muted">Debe quedar al menos una</span>'}</td></tr>`).join('')}
    </tbody></table></div>
    <form id="add-admin" class="inline-field" style="margin-top:16px" novalidate>
      <label for="new-admin" class="sr-only">Correo de la nueva administradora</label>
      <input class="input" id="new-admin" type="email" placeholder="correo@ejemplo.com">
      <button class="btn" type="submit">Agregar</button>
    </form>
  </div>`;
  $('#add-admin').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#new-admin').value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { toast('Revisa el correo.', 'error'); return; }
    try { await addAdmin(email); toast('Administradora agregada'); tabAdmins(); } catch (err) { toast(err.message, 'error'); }
  });
  body().onclick = async (e) => {
    const b = e.target.closest('[data-rm-admin]'); if (!b) return;
    const email = b.dataset.rmAdmin;
    const self = email === me;
    if (!confirm(self ? 'Vas a quitarte a ti misma. Perderás el acceso al panel. ¿Continuar?' : `¿Quitar a ${email}?`)) return;
    try {
      if (list.length <= 1) throw new Error('última');
      await removeAdmin(email);
      if (self) { await signOut(); location.reload(); } else tabAdmins();
    } catch (err) { toast(err.message.includes('permiso') ? err.message : 'No se pudo quitar. Debe quedar al menos una administradora.', 'error'); }
  };
}

/* ---------------- Mensajes ---------------- */
async function tabMessages() {
  body().innerHTML = '<p class="muted">Cargando…</p>';
  let rows = [];
  try { rows = (await listCollection('contactMessages')).map((x) => ({ ...x, created_at: x.createdAt })).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))); } catch (e) { body().innerHTML = `<p class="form-alert">${esc(e.message)}</p>`; return; }
  body().innerHTML = `<div class="admin-card"><h2>Mensajes de contacto</h2>
    <p class="small muted">Recuerda responder las peticiones, quejas y reclamos en máximo 15 días hábiles, y las solicitudes de datos personales en 10 (consultas) o 15 (reclamos).</p>
    ${rows.map((r) => { const m = r.message || {}; return `<article class="msg-item">
      <header><strong>${esc(m.name)} · ${esc(m.reason)}</strong><time>${new Date(r.created_at).toLocaleString('es-CO')}</time></header>
      <p style="margin:8px 0">${esc(m.message)}</p>
      <p class="small" style="margin:0"><a href="mailto:${esc(m.email)}">${esc(m.email)}</a>${m.order ? ` · Pedido ${esc(m.order)}` : ''}</p>
      <button class="link-btn small" data-del-msg="${r.id}" style="margin-top:8px">Borrar mensaje</button></article>`; }).join('') || '<p class="muted">No hay mensajes.</p>'}
  </div>`;
  body().onclick = async (e) => {
    const b = e.target.closest('[data-del-msg]'); if (!b) return;
    if (!confirm('¿Borrar este mensaje?')) return;
    try { await deleteDoc(`contactMessages/${b.dataset.delMsg}`); tabMessages(); } catch (err) { toast(err.message, 'error'); }
  };
}

/* ---------------- Autorizaciones ---------------- */
async function tabConsents() {
  body().innerHTML = '<p class="muted">Cargando…</p>';
  let rows = [];
  try { rows = (await listCollection('consents')).map((x) => ({ ...x, created_at: x.createdAt })).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))); } catch (e) { body().innerHTML = `<p class="form-alert">${esc(e.message)}</p>`; return; }
  const who = (r) => r.subject?.email || r.subject?.phone || r.subject?.displayName || r.subject?.browserId || '';
  const acc = (r) => (r.consents || []).map((c) => `${c.key}: ${c.accepted ? 'sí' : 'no'}`).join(' · ');
  body().innerHTML = `<div class="admin-card"><h2>Registro de autorizaciones</h2>
    <p class="small muted">Prueba de cuándo y cómo cada persona aceptó términos, privacidad, comunicaciones y cookies (Ley 1581). No se puede editar ni borrar.</p>
    <button class="btn btn--outline btn--sm" id="csv">Descargar todo (Excel/CSV)</button>
    <div class="table-wrap" style="margin-top:14px"><table><thead><tr><th>Fecha (servidor)</th><th>Formulario</th><th>Persona</th><th>Aceptó</th></tr></thead><tbody>
    ${rows.map((x) => `<tr><td>${new Date(x.created_at).toLocaleString('es-CO')}</td><td>${esc(x.record.form)}</td><td>${esc(who(x.record))}</td><td>${esc(acc(x.record))}</td></tr>`).join('') || '<tr><td colspan="4">Aún no hay registros.</td></tr>'}
    </tbody></table></div></div>`;
  $('#csv').addEventListener('click', () => {
    const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
    const csv = ['fecha_servidor,id_registro,formulario,persona,autorizaciones,metodo,pagina,navegador,registro_completo']
      .concat(rows.map((x) => [x.created_at, x.record.recordId, x.record.form, who(x.record), acc(x.record), x.record.method, x.record.page, x.record.userAgent, JSON.stringify(x.record)].map(q).join(','))).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
    a.download = `autorizaciones-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
  });
}

/* ---------------- Ayuda ---------------- */
function tabHelp() {
  body().innerHTML = `<div class="admin-card legal" style="padding-top:24px">
    <h2 style="margin-top:0">Ayuda rápida</h2>
    <h3>Cambiar un precio o las unidades</h3><p>Productos → Editar → cambia el número (o usa − y +) → Guardar cambios. Si el producto tiene tonos, cada tono tiene sus propias unidades.</p>
    <h3>¿Cómo funciona el inventario?</h3><p>Cuando una clienta envía su pedido, las unidades se descuentan solas. Si un tono llega a 0, aparece “Agotado” en ese tono; si todos llegan a 0, el producto completo sale “Agotado”. Si un pedido no se concreta, ve a Pedidos → Cancelar: las unidades vuelven al inventario.</p>
    <h3>Agregar un producto</h3><p>Productos → + Nuevo producto. Llena nombre, precio y unidades, sube al menos una foto y guarda.</p>
    <h3>Ocultar un producto sin borrarlo</h3><p>Editar → desmarca “Mostrar en la tienda”.</p>
    <h3>Poner un producto en oferta</h3><p>Editar → escribe el porcentaje en “Descuento %”. En la tienda aparece la etiqueta “Oferta” y el precio anterior tachado. Si publicas una promoción, indica hasta cuándo es válida.</p>
    <h3>Fotos</h3><p>Usa fotos tuyas o con permiso de la marca. Lo ideal: el producto solo, de cerca, fondo claro y luz natural.</p>
    <h3>Pasar la tienda a otra persona</h3><p>Administradoras → agrega su correo → ella crea su acceso → luego quita el tuyo.</p>
    <h3>Olvidé mi contraseña</h3><p>En la pantalla de entrada, “Olvidé mi contraseña”.</p>
  </div>`;
}

start();
