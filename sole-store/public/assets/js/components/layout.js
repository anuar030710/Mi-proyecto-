/**
 * Partes comunes a todas las páginas: barra demo, anuncio, header fijo (logo, menú, buscador,
 * favoritos, cuenta, carrito), menú móvil, íconos de confianza, footer, WhatsApp y cookies.
 * Cada página HTML solo tiene <div id="app-header"></div>, <main> y <div id="app-footer"></div>.
 */
import { CONFIG, CATEGORIES } from '../config.js';
import { $, $$, formatPrice, escapeHTML, normalize, debounce, trapFocus, initReveal } from '../utils.js';
import { ICONS } from '../icons.js';
import { loadProducts, productUrl } from '../products.js';
import { cartCount, getFavorites, onChange } from '../store.js';
import { currentUser } from '../auth.js';
import { initCartDrawer, openCartDrawer } from './cartDrawer.js';
import { initCookieConsent, flushPendingConsents } from '../consent.js';
import { loadSettings } from '../settings.js';

const NAV = [
  ['index.html', 'Inicio'], ['catalogo.html', 'Catálogo'], ['catalogo.html?oferta=1', 'Ofertas'],
  ['catalogo.html?orden=novedades', 'Novedades'], ['contacto.html', 'Contacto'],
];

function headerHTML() {
  const here = location.pathname.split('/').pop() || 'index.html';
  const user = currentUser();
  const navLinks = NAV.map(([href, label]) => `<li><a href="${href}" ${href === here ? 'aria-current="page"' : ''}>${label}</a></li>`).join('');
  return `
  ${CONFIG.demoMode ? `<div class="demo-bar">Tienda en preparación: precios y disponibilidad pueden cambiar. <a href="faq.html#demo">Más info</a></div>` : ''}
  <p class="announce">${ICONS.truck.replace('<svg', '<svg style="display:inline;width:16px;height:16px;vertical-align:-3px;margin-right:6px"')}Envío gratis desde ${formatPrice(CONFIG.freeShippingFrom)} · Pedidos y pagos por WhatsApp</p>
  <header class="site-header">
    <div class="container header-inner">
      <button class="icon-btn menu-toggle" aria-label="Abrir menú" aria-expanded="false" aria-controls="mobile-nav">${ICONS.menu}</button>
      <a class="logo" href="index.html" aria-label="${escapeHTML(CONFIG.storeName)}, ir al inicio">soles<span>.</span><small>store</small></a>
      <nav class="main-nav" aria-label="Principal"><ul>${navLinks}</ul></nav>
      <div class="header-actions">
        <button class="icon-btn" data-search-toggle aria-label="Buscar" aria-expanded="false" aria-controls="search-panel">${ICONS.search}</button>
        <a class="icon-btn" href="cuenta.html#favoritos" aria-label="Favoritos">${ICONS.heart}<span class="count-badge" data-fav-count hidden></span></a>
        <a class="icon-btn" href="cuenta.html" aria-label="${user ? `Mi cuenta (${escapeHTML(user.name)})` : 'Iniciar sesión o crear cuenta'}">${ICONS.user}</a>
        <button class="icon-btn" data-open-cart aria-label="Abrir carrito">${ICONS.bag}<span class="count-badge" data-cart-count aria-live="polite" hidden></span></button>
      </div>
    </div>
    <div class="search-panel" id="search-panel" hidden>
      <div class="container">
        <form class="search-form" role="search" action="catalogo.html">
          <label for="search-input" class="sr-only">Buscar productos</label>
          <input id="search-input" name="q" type="search" placeholder="Busca labiales, bases, marcas…" autocomplete="off"
            role="combobox" aria-expanded="false" aria-controls="search-suggestions" aria-autocomplete="list">
          <button class="icon-btn" type="submit" aria-label="Buscar">${ICONS.search}</button>
          <ul class="suggestions" id="search-suggestions" role="listbox" aria-label="Sugerencias" hidden></ul>
        </form>
      </div>
    </div>
  </header>
  <div class="mobile-nav" id="mobile-nav">
    <div class="overlay" data-close-nav></div>
    <nav class="mobile-nav__panel" aria-label="Menú móvil">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <a class="logo" href="index.html">soles<span>.</span></a>
        <button class="icon-btn" data-close-nav aria-label="Cerrar menú">${ICONS.close}</button>
      </div>
      <ul>${navLinks}${Object.entries(CATEGORIES).map(([k, v]) => `<li><a href="catalogo.html?categoria=${k}" style="font-size:1.1rem">${v}</a></li>`).join('')}</ul>
      <a class="btn btn--outline" href="cuenta.html">${user ? 'Mi cuenta' : 'Iniciar sesión'}</a>
    </nav>
  </div>`;
}

function footerHTML() {
  const c = CONFIG.company;
  const wa = `https://wa.me/${CONFIG.whatsapp.number}?text=${encodeURIComponent(CONFIG.whatsapp.message)}`;
  return `
  <section class="trust" aria-label="Por qué comprar en ${escapeHTML(CONFIG.storeName)}">
    <ul class="container">
      <li>${ICONS.lock}<span><strong>Compra por WhatsApp</strong>Paga con ${CONFIG.paymentOptions.join(' o ')}</span></li>
      <li>${ICONS.truck}<span><strong>Envíos a todo Colombia</strong>Gratis desde ${formatPrice(CONFIG.freeShippingFrom)}</span></li>
      <li>${ICONS.return}<span><strong>Devoluciones fáciles</strong>Productos sellados, 5 días hábiles</span></li>
      <li>${ICONS.shield}<span><strong>100% original</strong>Con registro sanitario INVIMA</span></li>
    </ul>
  </section>
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <a class="logo" href="index.html">soles<span>.</span><small style="color:#CDBDBC">store</small></a>
          <p style="max-width:34ch;color:#CDBDBC">${escapeHTML(CONFIG.tagline)}. Maquillaje elegido con cariño para que te sientas tú, todos los días.</p>
          <div class="pay-icons" aria-label="Medios de pago"><span>Pagos por WhatsApp:</span>${CONFIG.paymentOptions.map((m) => `<span>${escapeHTML(m)}</span>`).join('')}</div>
        </div>
        <div><h3>Tienda</h3><ul>
          ${Object.entries(CATEGORIES).slice(0, 6).map(([k, v]) => `<li><a href="catalogo.html?categoria=${k}">${v}</a></li>`).join('')}
        </ul></div>
        <div><h3>Ayuda</h3><ul>
          <li><a href="contacto.html">Contacto y PQR</a></li>
          <li><a href="faq.html">Preguntas frecuentes</a></li>
          <li><a href="envios-devoluciones.html">Envíos y devoluciones</a></li>
          <li><a href="reembolsos.html">Política de reembolso</a></li>
          <li><a href="${wa}" target="_blank" rel="noopener">WhatsApp</a></li>
        </ul></div>
        <div><h3>Legal</h3><ul>
          <li><a href="terminos.html">Términos y condiciones</a></li>
          <li><a href="privacidad.html">Política de privacidad</a></li>
          <li><a href="cookies.html">Política de cookies</a></li>
          <li><button class="link-btn" style="color:#EFE4E3" data-open-cookie-prefs>Preferencias de cookies</button></li>
        </ul></div>
      </div>
      <div class="footer-legal">
        <p style="margin:0"><span data-company="legalName"></span> · NIT <span data-company="nit"></span> · <span data-company="address"></span>, ${escapeHTML(c.city)} · Tel. <span data-company="phone"></span> · ${escapeHTML(c.email)}</p>
        <a class="sic-link" href="https://www.sic.gov.co" target="_blank" rel="noopener">Superintendencia de Industria y Comercio — www.sic.gov.co</a>
        <p style="margin:0">© ${new Date().getFullYear()} ${escapeHTML(CONFIG.storeName)}. Precios en pesos colombianos con IVA incluido.</p>
      </div>
    </div>
  </footer>
  <a class="whatsapp-fab" href="${wa}" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">${ICONS.whatsapp}</a>`;
}

/* ---------- Buscador con sugerencias (combobox accesible) ---------- */
function initSearch(products) {
  const toggle = $('[data-search-toggle]');
  const panel = $('#search-panel');
  const input = $('#search-input');
  const list = $('#search-suggestions');
  let active = -1;

  toggle.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) input.focus();
  });

  const highlight = (text, q) => {
    const i = normalize(text).indexOf(normalize(q));
    if (i < 0 || !q) return escapeHTML(text);
    return `${escapeHTML(text.slice(0, i))}<mark>${escapeHTML(text.slice(i, i + q.length))}</mark>${escapeHTML(text.slice(i + q.length))}`;
  };

  const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; input.removeAttribute('aria-activedescendant'); };

  input.addEventListener('input', debounce(() => {
    const q = input.value.trim();
    if (q.length < 2) { close(); return; }
    const nq = normalize(q);
    const hits = products.filter((p) => normalize(`${p.name} ${p.brand} ${CATEGORIES[p.category]} ${p.tones.map((t) => t.name).join(' ')}`).includes(nq)).slice(0, 6);
    list.innerHTML = hits.length
      ? hits.map((p, i) => `<li role="option" id="sug-${i}"><a href="${productUrl(p)}"><img src="${p.thumb || p.image}" alt="" width="44" height="55" loading="lazy"><span><span>${highlight(p.name, q)}</span><br><span class="s-meta">${escapeHTML(p.brand)} · ${CATEGORIES[p.category]}</span></span></a></li>`).join('')
        + `<li role="option" id="sug-all"><a href="catalogo.html?q=${encodeURIComponent(q)}"><span>Ver todos los resultados para “${escapeHTML(q)}”</span></a></li>`
      : `<li><span class="s-empty">Sin resultados para “${escapeHTML(q)}”. Prueba con “labial” o “base”.</span></li>`;
    list.hidden = false; input.setAttribute('aria-expanded', 'true'); active = -1;
  }, 150));

  input.addEventListener('keydown', (e) => {
    const items = $$('a', list);
    if (list.hidden || !items.length) { if (e.key === 'Escape') { panel.hidden = true; toggle.setAttribute('aria-expanded', 'false'); toggle.focus(); } return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach((a, i) => a.classList.toggle('is-active', i === active));
      input.setAttribute('aria-activedescendant', items[active].parentElement.id);
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault(); items[active].click();
    } else if (e.key === 'Escape') close();
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.search-form')) close(); });
}

/* ---------- Menú móvil ---------- */
function initMobileNav() {
  const nav = $('#mobile-nav'); const btn = $('.menu-toggle'); let release;
  const close = () => { nav.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); document.body.classList.remove('no-scroll'); release?.(); };
  btn.addEventListener('click', () => {
    nav.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); document.body.classList.add('no-scroll');
    release = trapFocus($('.mobile-nav__panel', nav), close);
  });
  nav.addEventListener('click', (e) => { if (e.target.closest('[data-close-nav]')) close(); });
}

/* ---------- Contadores del header ---------- */
function updateCounts(animate = false) {
  const n = cartCount();
  const badge = $('[data-cart-count]');
  badge.textContent = n; badge.hidden = n === 0;
  $('[data-open-cart]').setAttribute('aria-label', `Abrir carrito, ${n} ${n === 1 ? 'producto' : 'productos'}`);
  if (animate) { badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump'); }
  const f = getFavorites().length;
  const fb = $('[data-fav-count]'); fb.textContent = f; fb.hidden = f === 0;
}

/** Rellena los datos legales del comercio en cualquier página ([data-company="nit"], etc.). */
function fillCompanyData() {
  $$('[data-company]').forEach((el) => { el.textContent = CONFIG.company[el.dataset.company] || ''; });
  $$('[data-store-name]').forEach((el) => { el.textContent = CONFIG.storeName; });
  $$('[data-policy-version]').forEach((el) => { el.textContent = CONFIG.policyVersions[el.dataset.policyVersion]; });
  $$('[data-free-shipping]').forEach((el) => { el.textContent = formatPrice(CONFIG.freeShippingFrom); });
}

/** Punto de entrada común. Devuelve el catálogo para que la página lo use. */
export async function initLayout() {
  await loadSettings(); // ajustes del panel antes de pintar header y footer
  $('#app-header').outerHTML = headerHTML();
  $('#app-footer').outerHTML = footerHTML();
  fillCompanyData();
  initMobileNav();
  updateCounts();
  onChange((type) => updateCounts(type === 'cart'));
  $('[data-open-cart]').addEventListener('click', openCartDrawer);
  window.addEventListener('scroll', () => $('.site-header').classList.toggle('is-scrolled', scrollY > 10), { passive: true });
  initCookieConsent();
  flushPendingConsents();
  initReveal();
  let products = [];
  try { products = await loadProducts(); } catch (err) {
    console.error(err);
    $('main')?.insertAdjacentHTML('afterbegin', '<div class="container"><p class="form-alert" style="margin:20px 0">No pudimos cargar el catálogo. Abre la tienda con <code>node server.js</code> (ver README).</p></div>');
  }
  initSearch(products);
  initCartDrawer();
  return products;
}
