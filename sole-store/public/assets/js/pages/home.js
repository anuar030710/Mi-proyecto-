/** Página de inicio: categorías, más vendidos, ofertas, reseñas y boletín. */
import { initLayout } from '../components/layout.js';
import { productCard, bindCardActions } from '../components/productCard.js';
import { CATEGORIES } from '../config.js';
import { $, escapeHTML, starsHTML } from '../utils.js';
import { field, setupForm } from '../forms.js';
import { consentFieldset, recordConsent } from '../consent.js';

const products = await initLayout();

/* Categorías destacadas: usa la imagen del primer producto de cada categoría. */
const featured = ['labiales', 'bases', 'sombras', 'rubores'];
$('#cat-grid').innerHTML = featured.map((c) => {
  const p = products.find((x) => x.category === c);
  return `<a class="cat-card" href="catalogo.html?categoria=${c}"><img src="${p?.image || ''}" alt="" width="800" height="1000" loading="lazy"><span>${CATEGORIES[c]}</span></a>`;
}).join('');

/* Más vendidos (por unidades vendidas). */
const best = [...products].sort((a, b) => b.sold - a.sold).slice(0, 4);
$('#bestsellers').innerHTML = best.map((p) => productCard(p)).join('');
bindCardActions($('#bestsellers'), products);

/* Ofertas: productos con descuento y stock. */
const offers = products.filter((p) => p.discount > 0 && p.stock > 0).slice(0, 4);
$('#offers').innerHTML = offers.map((p) => productCard(p)).join('');
bindCardActions($('#offers'), products);

/* Reseñas: las mejores de los productos. Se marcan como contenido de demostración. */
const quotes = products.flatMap((p) => p.reviews.map((r) => ({ ...r, product: p.name })))
  .filter((r) => r.rating === 5).slice(0, 3);
$('#reviews').innerHTML = quotes.map((r) => `
  <figure class="quote">
    ${starsHTML(r.rating)}
    <blockquote>“${escapeHTML(r.text)}”</blockquote>
    <figcaption>${escapeHTML(r.author)} · sobre <em>${escapeHTML(r.product)}</em></figcaption>
  </figure>`).join('');

/* Boletín: correo + 2 casillas (aquí la de comunicaciones es obligatoria: es la finalidad). */
const nf = $('#newsletter-form');
nf.insertAdjacentHTML('afterbegin', `
  <div class="inline-field">${field({ name: 'email', label: 'Correo electrónico', type: 'email', autocomplete: 'email' })}</div>
  ${consentFieldset('newsletter', { marketingRequired: true })}
  <p class="form-alert" role="alert" hidden></p>`);
setupForm(nf, async (data, form) => {
  await recordConsent(form, { email: data.email });
  form.innerHTML = '<p class="form-success">¡Listo! Te suscribiste al boletín. Puedes darte de baja en cualquier momento desde el enlace de cada correo.</p>';
});
