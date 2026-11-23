/**
 * Detalle de producto: galería con zoom, tonos, cantidad, agregar al carrito,
 * descripción/ingredientes/modo de uso, reseñas y productos relacionados.
 */
import { initLayout } from '../components/layout.js';
import { productCard, bindCardActions } from '../components/productCard.js';
import { openCartDrawer } from '../components/cartDrawer.js';
import { CONFIG, CATEGORIES } from '../config.js';
import { $, $$, escapeHTML, formatPrice, starsHTML, getParam, toast, storage } from '../utils.js';
import { findProduct, finalPrice, badges, isOut, isLow, stockOf, firstAvailableTone } from '../products.js';
import { addToCart, isFavorite, toggleFavorite } from '../store.js';
import { ICONS } from '../icons.js';
import { field, setupForm } from '../forms.js';
import { consentFieldset, recordConsent } from '../consent.js';

const products = await initLayout();

/** Mensaje para la clienta: cómo se usa (pasos) y consejo de la tienda. */
function howToCard(prod) {
  if (!prod.howToSteps?.length && !prod.tip) return '';
  return `<section class="howto" aria-labelledby="howto-title">
    <h2 id="howto-title" class="howto__title">Cómo usarlo</h2>
    ${prod.howToSteps?.length ? `<ol class="howto__steps">${prod.howToSteps.map((s) => `<li>${escapeHTML(s)}</li>`).join('')}</ol>` : ''}
    ${prod.tip ? `<p class="howto__tip"><strong>Consejo de Sole:</strong> ${escapeHTML(prod.tip)}</p>` : ''}
  </section>`;
}
const p = findProduct(products, getParam('id') || '');
const root = $('#product-root');

if (!p) {
  root.innerHTML = `<div class="empty-state"><h1>Producto no encontrado</h1><p>Puede que ya no esté disponible.</p><a class="btn" href="catalogo.html">Ir al catálogo</a></div>`;
  throw new Error('Producto no encontrado');
}

/* ---------- SEO dinámico ---------- */
document.title = `${p.name} · ${p.brand} | Sole Store`;
$('meta[name="description"]').setAttribute('content', `${p.name} de ${p.brand}. ${p.description.slice(0, 120)}`);
const ld = document.createElement('script');
ld.type = 'application/ld+json';
ld.textContent = JSON.stringify({
  '@context': 'https://schema.org', '@type': 'Product', name: p.name, brand: { '@type': 'Brand', name: p.brand },
  image: p.images.map((i) => new URL(i, location.href).href), description: p.description, sku: p.id,
  offers: { '@type': 'Offer', priceCurrency: CONFIG.currency, price: finalPrice(p), availability: isOut(p) ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock', url: location.href },
});
document.head.appendChild(ld);

/* ---------- Reseñas (las del catálogo + las escritas en este navegador) ---------- */
const REVIEWS_KEY = 'sole_reviews';
const localReviews = () => (storage.get(REVIEWS_KEY, {})[p.id] || []);
const allReviews = () => [...localReviews().map((r) => ({ ...r, pending: true })), ...p.reviews];
const avgRating = () => { const l = allReviews(); return l.length ? Math.round((l.reduce((s, r) => s + r.rating, 0) / l.length) * 10) / 10 : 0; };

/* ---------- Render principal ---------- */
const fp = finalPrice(p);
const out = isOut(p);
let tone = firstAvailableTone(p)?.name || null;
let qty = 1;

root.innerHTML = `
  <nav class="breadcrumb" aria-label="Ruta de navegación" style="padding-top:20px"><ol>
    <li><a href="index.html">Inicio</a></li><li><a href="catalogo.html?categoria=${p.category}">${CATEGORIES[p.category]}</a></li><li aria-current="page">${escapeHTML(p.name)}</li>
  </ol></nav>
  <div class="pdp">
    <div class="gallery">
      <button type="button" class="gallery__main" aria-label="Ampliar imagen (clic para hacer zoom)">
        <img id="main-img" src="${p.images[0]}" alt="${escapeHTML(p.name)} — imagen 1 de ${p.images.length}" width="800" height="1000" fetchpriority="high">
        <span class="gallery__hint" aria-hidden="true">${ICONS.search.replace('<svg', '<svg style="width:14px;display:inline;vertical-align:-2px"')} Zoom</span>
      </button>
      <div class="gallery__thumbs" role="group" aria-label="Imágenes del producto" ${p.images.length < 2 ? 'hidden' : ''}>
        ${p.images.map((src, i) => `<button type="button" data-img="${i}" aria-current="${i === 0}" aria-label="Ver imagen ${i + 1}"><img src="${i === 0 && p.thumb ? p.thumb : src}" alt="" width="72" height="90" loading="lazy"></button>`).join('')}
      </div>
    </div>

    <div class="pdp__info">
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">${badges(p).map((b) => `<span class="badge ${b.cls}">${b.text}</span>`).join('')}</div>
      <span class="card__brand">${escapeHTML(p.brand)}</span>
      <h1>${escapeHTML(p.name)}</h1>
      <a href="#reviews" class="rating-line">${allReviews().length ? `${starsHTML(avgRating())} <span>${String(avgRating()).replace('.', ',')} · ${allReviews().length} reseñas</span>` : 'Sin reseñas todavía · Escribe la primera'}</a>

      <div class="pdp__price price">
        <span class="price__now ${p.discount ? 'price__now--sale' : ''}">${formatPrice(fp)}</span>
        ${p.discount ? `<span class="price__old"><span class="sr-only">Antes</span>${formatPrice(p.price)}</span><span class="badge badge--sale">Ahorras ${formatPrice(p.price - fp)}</span>` : ''}
      </div>
      <p class="small muted">IVA incluido. ${fp >= CONFIG.freeShippingFrom ? '¡Este producto tiene envío gratis!' : `Envío gratis desde ${formatPrice(CONFIG.freeShippingFrom)}.`}</p>

      ${p.tones.length ? `
      <div class="pdp__block">
        <span class="pdp__label" id="tone-label">${escapeHTML(p.variantLabel || 'Tono')}: <strong id="tone-name">${escapeHTML(tone)}</strong></span>
        <fieldset class="tone-picker" aria-labelledby="tone-label">
          ${p.tones.map((t) => { const none = stockOf(p, t.name) === 0; return `<label title="${escapeHTML(t.name)}${none ? ' (agotado)' : ''}" class="${none ? 'is-out' : ''}"><input type="radio" name="tone" value="${escapeHTML(t.name)}" ${t.name === tone ? 'checked' : ''} ${none ? 'disabled' : ''} aria-label="${escapeHTML(t.name)}${none ? ', agotado' : ''}"><span class="swatch" style="background:${t.palette ? `conic-gradient(${t.palette.join(',')})` : t.hex}"></span></label>`; }).join('')}
        </fieldset>
      </div>` : ''}

      <div class="pdp__block" id="stock-box" aria-live="polite"></div>

      <div class="buy-row">
        <div class="qty qty--lg" role="group" aria-label="Cantidad">
          <button type="button" data-q="-1" aria-label="Disminuir cantidad" ${out ? 'disabled' : ''}>−</button>
          <input id="qty" type="number" inputmode="numeric" min="1" value="1" aria-label="Cantidad" ${out ? 'disabled' : ''}>
          <button type="button" data-q="1" aria-label="Aumentar cantidad" ${out ? 'disabled' : ''}>+</button>
        </div>
        <button class="btn" id="add-btn" ${out ? 'disabled' : ''}>${ICONS.bag.replace('<svg', '<svg style="width:20px"')} ${out ? 'Agotado' : 'Agregar al carrito'}</button>
        <button class="icon-btn" id="fav-btn" aria-pressed="${isFavorite(p.id)}" aria-label="Guardar en favoritos" style="border:1.5px solid var(--line);width:52px;height:52px">${ICONS.heart}</button>
      </div>

      ${howToCard(p)}

      <ul class="mini-trust" style="margin-top:22px">
        <li>${ICONS.truck} Envío a todo Colombia · gratis desde ${formatPrice(CONFIG.freeShippingFrom)}</li>
        <li>${ICONS.return} Devoluciones de productos sellados en 5 días hábiles · <a href="reembolsos.html">ver política</a></li>
        <li>${ICONS.lock} Haz tu pedido aquí y paga por WhatsApp con ${CONFIG.paymentOptions.join(' o ')}</li>
      </ul>

      <div class="accordion" style="margin-top:20px">
        <details open><summary>Descripción</summary><div class="acc-body"><p>${escapeHTML(p.description)}</p></div></details>
        <details><summary>Ingredientes</summary><div class="acc-body"><p>${escapeHTML(p.ingredients)}</p><p class="small muted">Si tienes alergias, revisa la lista completa en el empaque. Ante cualquier irritación suspende su uso.</p></div></details>
        <details><summary>Registro sanitario</summary><div class="acc-body"><p>Notificación Sanitaria Obligatoria (INVIMA): ${escapeHTML(p.nso)}</p></div></details>
      </div>
    </div>
  </div>

  <section class="section" id="reviews" aria-labelledby="rev-title" style="padding-top:24px">
    <h2 id="rev-title">Reseñas</h2>
    <div class="reviews">
      <div class="reviews__summary" id="rev-summary"></div>
      <div>
        <div id="rev-list"></div>
        <details class="accordion" style="margin-top:16px"><summary>Escribir una reseña</summary>
          <form id="review-form" class="stack acc-body">
            <fieldset class="field" style="border:0;padding:0;margin:0">
              <legend style="font-weight:500;font-size:.92rem;margin-bottom:6px">Tu calificación</legend>
              <div class="star-input">${[5, 4, 3, 2, 1].map((n) => `<input type="radio" name="rating" id="star-${n}" value="${n}" ${n === 5 ? 'checked' : ''}><label for="star-${n}" aria-label="${n} ${n === 1 ? 'estrella' : 'estrellas'}">★</label>`).join('')}</div>
            </fieldset>
            ${field({ name: 'author', label: 'Nombre que se mostrará', rule: 'name', autocomplete: 'given-name', hint: 'Puedes usar solo tu nombre o un apodo.' })}
            ${field({ name: 'text', label: 'Tu opinión', type: 'textarea', attrs: 'minlength="10" maxlength="600"' })}
            ${consentFieldset('resena')}
            <p class="form-alert" role="alert" hidden></p>
            <button class="btn" type="submit">Publicar reseña</button>
          </form>
        </details>
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="rel-title" style="padding-top:0">
    <h2 id="rel-title">También te puede gustar</h2>
    <div class="product-grid product-grid--4" id="related"></div>
  </section>`;

/* ---------- Galería con zoom ---------- */
const main = $('.gallery__main');
const mainImg = $('#main-img');
let current = 0;
function showImage(i) {
  current = (i + p.images.length) % p.images.length;
  mainImg.src = p.images[current];
  mainImg.alt = `${p.name} — imagen ${current + 1} de ${p.images.length}`;
  main.classList.remove('is-zoomed');
  $$('[data-img]').forEach((b) => b.setAttribute('aria-current', String(Number(b.dataset.img) === current)));
}
$('.gallery__thumbs').addEventListener('click', (e) => { const b = e.target.closest('[data-img]'); if (b) showImage(Number(b.dataset.img)); });
main.addEventListener('click', () => main.classList.toggle('is-zoomed'));
main.addEventListener('mousemove', (e) => {
  const r = main.getBoundingClientRect();
  mainImg.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
});
main.addEventListener('mouseleave', () => main.classList.remove('is-zoomed'));
main.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') showImage(current + 1); if (e.key === 'ArrowLeft') showImage(current - 1); });
// Deslizar con el dedo para cambiar de imagen (cuando no hay zoom)
let startX = null;
main.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
main.addEventListener('touchend', (e) => {
  if (startX === null || main.classList.contains('is-zoomed')) return;
  const dx = e.changedTouches[0].clientX - startX;
  if (Math.abs(dx) > 40) { e.preventDefault(); showImage(current + (dx < 0 ? 1 : -1)); }
  startX = null;
});

/* ---------- Tono, cantidad, carrito y favoritos ---------- */
/** Aviso de unidades según el tono elegido (o el producto, si no tiene tonos). */
function paintStock() {
  const n = stockOf(p, tone);
  const alertIcon = ICONS.alert.replace('<svg', '<svg style="width:18px"');
  $('#stock-box').innerHTML = n === 0
    ? `<p class="stock-alert stock-alert--out">${alertIcon} Agotado${p.tones.length && !out ? ' en este tono' : ''}. Escríbenos por WhatsApp y te avisamos cuando vuelva.</p>`
    : isLow(p, tone) ? `<p class="stock-alert">${alertIcon} ¡${n === 1 ? 'Queda solo 1 unidad' : `Quedan solo ${n} unidades`}!</p>`
      : '<p class="small" style="color:var(--success)">✓ Disponible para envío inmediato</p>';
  $('#qty').max = Math.max(1, n);
  if (qty > n) setQ(n);
  $('#add-btn').disabled = n === 0;
}
$$('[name="tone"]').forEach((r) => r.addEventListener('change', () => { tone = r.value; $('#tone-name').textContent = tone; paintStock(); }));
const qtyInput = $('#qty');
function setQ(n) { qty = Math.max(1, Math.min(n, stockOf(p, tone) || 1)); qtyInput.value = qty; }
paintStock();
$$('[data-q]').forEach((b) => b.addEventListener('click', () => setQ(qty + Number(b.dataset.q))));
qtyInput.addEventListener('change', () => setQ(parseInt(qtyInput.value, 10) || 1));
$('#add-btn').addEventListener('click', () => {
  const added = addToCart(p, tone, qty);
  if (!added) { toast('Ya tienes en el carrito todas las unidades disponibles.', 'error'); return; }
  if (added < qty) toast(`Solo pudimos agregar ${added} (stock disponible).`);
  openCartDrawer();
});
const favBtn = $('#fav-btn');
const paintFav = () => { const f = isFavorite(p.id); favBtn.setAttribute('aria-pressed', f); favBtn.style.color = f ? 'var(--rose-700)' : ''; favBtn.querySelector('svg').style.fill = f ? 'currentColor' : 'none'; favBtn.setAttribute('aria-label', f ? 'Quitar de favoritos' : 'Guardar en favoritos'); };
favBtn.addEventListener('click', () => { const f = toggleFavorite(p.id); paintFav(); toast(f ? 'Guardado en favoritos' : 'Quitado de favoritos'); });
paintFav();

/* ---------- Reseñas ---------- */
function renderReviews() {
  const list = allReviews();
  const dist = [5, 4, 3, 2, 1].map((n) => list.filter((r) => r.rating === n).length);
  $('#rev-summary').innerHTML = list.length ? `
    <div class="reviews__score">${String(avgRating()).replace('.', ',')}</div>
    ${starsHTML(avgRating())}<p class="small muted" style="margin-top:6px">${list.length} ${list.length === 1 ? 'reseña' : 'reseñas'}</p>
    <div class="bars">${dist.map((c, i) => `<div><span>${5 - i}★</span><i><b style="width:${(c / list.length) * 100}%"></b></i><span>${c}</span></div>`).join('')}</div>`
    : '<p style="margin:0">Este producto aún no tiene reseñas.</p><p class="small muted">¿Ya lo probaste? Cuéntanos qué te pareció.</p>';
  $('#rev-list').innerHTML = list.map((r) => `
    <article class="review">
      <header><span><strong>${escapeHTML(r.author)}</strong> ${r.pending ? '<span class="status-pill">Pendiente de moderación · solo tú la ves</span>' : ''}</span><time datetime="${r.date}">${new Date(r.date).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</time></header>
      ${starsHTML(r.rating)}
      <p style="margin:8px 0 0">${escapeHTML(r.text)}</p>
    </article>`).join('');
}
renderReviews();

setupForm($('#review-form'), async (data, form) => {
  await recordConsent(form, { extra: { subject: { displayName: data.author }, productId: p.id } });
  const all = storage.get(REVIEWS_KEY, {});
  all[p.id] = [{ author: data.author, rating: Number(data.rating), text: data.text, date: new Date().toISOString().slice(0, 10) }, ...(all[p.id] || [])];
  storage.set(REVIEWS_KEY, all);
  form.reset();
  renderReviews();
  toast('¡Gracias! Tu reseña quedó pendiente de moderación.');
});

/* ---------- Relacionados: misma categoría primero, luego mejor calificados ---------- */
const related = products.filter((x) => x.id !== p.id)
  .sort((a, b) => (b.category === p.category) - (a.category === p.category) || b.rating - a.rating).slice(0, 4);
$('#related').innerHTML = related.map((x) => productCard(x)).join('');
bindCardActions($('#related'), products);
