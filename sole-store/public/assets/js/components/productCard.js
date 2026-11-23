/**
 * Tarjeta de producto reutilizable (inicio, catálogo, relacionados, favoritos).
 * Los clics de "Agregar" y "Favorito" se manejan por delegación en bindCardActions().
 */
import { formatPrice, escapeHTML, starsHTML, toast } from '../utils.js';
import { finalPrice, badges, isOut, productUrl, findProduct } from '../products.js';
import { addToCart, isFavorite, toggleFavorite } from '../store.js';
import { ICONS } from '../icons.js';
import { openCartDrawer } from './cartDrawer.js';

export function productCard(p, { eager = false } = {}) {
  const fp = finalPrice(p);
  const out = isOut(p);
  const fav = isFavorite(p.id);
  const loading = eager ? 'eager" fetchpriority="high' : 'lazy';
  const swatches = p.tones.slice(0, 5).map((t) => `<span class="dot" style="background:${t.hex}" title="${escapeHTML(t.name)}"></span>`).join('');
  return `
  <article class="card ${out ? 'card--out' : ''}">
    <div class="card__media">
      <img class="main" src="${p.thumb || p.image}" alt="${escapeHTML(p.name)}, ${escapeHTML(p.brand)}" width="800" height="1000" loading="${loading}" decoding="async">
      ${p.images[1] ? `<img class="alt" src="${p.images[1]}" alt="" width="800" height="1000" loading="lazy" decoding="async">` : ''}
      <div class="card__badges">${badges(p).map((b) => `<span class="badge ${b.cls}">${b.text}</span>`).join('')}</div>
      <button class="icon-btn card__fav" data-fav="${p.id}" aria-pressed="${fav}" aria-label="${fav ? 'Quitar de' : 'Agregar a'} favoritos: ${escapeHTML(p.name)}">${ICONS.heart}</button>
      <div class="card__quick">
        <button class="btn btn--sm btn--block ${out ? '' : 'btn--gold'}" data-quick-add="${p.id}" ${out ? 'disabled' : ''}>
          ${out ? 'Agotado' : p.tones.length > 1 ? `Agregar (${escapeHTML(p.tones[0].name)})` : 'Agregar al carrito'}
        </button>
      </div>
    </div>
    <div class="card__body">
      <span class="card__brand">${escapeHTML(p.brand)}</span>
      <h3 class="card__title"><a href="${productUrl(p)}">${escapeHTML(p.name)}</a></h3>
      ${p.reviewsCount ? `<span class="rating-line">${starsHTML(p.rating)} <span>(${p.reviewsCount})</span></span>` : ''}
      <span class="price">
        <span class="price__now ${p.discount ? 'price__now--sale' : ''}">${formatPrice(fp)}</span>
        ${p.discount ? `<span class="price__old"><span class="sr-only">Antes</span>${formatPrice(p.price)}</span>` : ''}
      </span>
      ${p.tones.length ? `<span class="card__swatches" aria-label="${p.tones.length} tonos disponibles">${swatches}${p.tones.length > 5 ? `<small>+${p.tones.length - 5}</small>` : ''}<small>${p.tones.length} ${p.tones.length === 1 ? 'tono' : 'tonos'}</small></span>` : ''}
    </div>
  </article>`;
}

/** Delegación: un solo listener por contenedor para agregar al carrito y favoritos. */
export function bindCardActions(container, products, onFavChange) {
  container.addEventListener('click', (e) => {
    const add = e.target.closest('[data-quick-add]');
    if (add) {
      const p = findProduct(products, add.dataset.quickAdd);
      const added = addToCart(p, p.tones[0]?.name || null, 1);
      if (added) openCartDrawer();
      else toast('No hay más unidades disponibles de este producto.', 'error');
      return;
    }
    const favBtn = e.target.closest('[data-fav]');
    if (favBtn) {
      const p = findProduct(products, favBtn.dataset.fav);
      const now = toggleFavorite(p.id);
      favBtn.setAttribute('aria-pressed', now);
      favBtn.setAttribute('aria-label', `${now ? 'Quitar de' : 'Agregar a'} favoritos: ${p.name}`);
      toast(now ? 'Guardado en favoritos' : 'Quitado de favoritos');
      onFavChange?.();
    }
  });
}
