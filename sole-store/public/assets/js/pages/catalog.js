/**
 * Catálogo: filtros (categoría, marca, precio, tono, tipo de piel, ofertas, disponibilidad),
 * orden y búsqueda. El estado se refleja en la URL para poder compartir o volver atrás.
 */
import { initLayout } from '../components/layout.js';
import { productCard, bindCardActions } from '../components/productCard.js';
import { CATEGORIES, SKIN_TYPES, TONE_FAMILIES } from '../config.js';
import { $, $$, escapeHTML, normalize, formatPrice, trapFocus } from '../utils.js';
import { finalPrice } from '../products.js';

const products = await initLayout();
const params = new URLSearchParams(location.search);
const list = (k) => (params.get(k) ? params.get(k).split(',') : []);

const state = {
  q: params.get('q') || '',
  categoria: list('categoria'),
  marca: list('marca'),
  tono: list('tono'),
  piel: list('piel'),
  min: params.get('min') || '',
  max: params.get('max') || '',
  oferta: params.get('oferta') === '1',
  stock: params.get('stock') === '1',
  orden: params.get('orden') || 'relevancia',
};

const brands = [...new Set(products.map((p) => p.brand))].sort();
const countBy = (fn) => (val) => products.filter((p) => fn(p, val)).length;
const byCat = countBy((p, v) => p.category === v);
const byBrand = countBy((p, v) => p.brand === v);

function checkboxGroup(name, legend, entries, counter) {
  return `<fieldset class="filter-group"><legend>${legend}</legend>${entries.map(([value, label]) => `
    <label class="check"><input type="checkbox" name="${name}" value="${escapeHTML(value)}" ${state[name].includes(value) ? 'checked' : ''}>
    ${escapeHTML(label)}${counter ? `<span class="count">${counter(value)}</span>` : ''}</label>`).join('')}</fieldset>`;
}

/* --- Construir panel de filtros --- */
$('#filters-form').innerHTML = `
  <div class="filters__head"><h2 style="font-size:1.5rem;margin:0">Filtros</h2><button type="button" class="icon-btn" data-close-filters aria-label="Cerrar filtros">✕</button></div>
  ${checkboxGroup('categoria', 'Categoría', Object.entries(CATEGORIES), byCat)}
  ${checkboxGroup('marca', 'Marca', brands.map((b) => [b, b]), byBrand)}
  <fieldset class="filter-group"><legend>Precio</legend>
    <div class="price-range">
      <div class="field"><label for="f-min" class="small">Mínimo</label><input class="input" id="f-min" name="min" type="number" inputmode="numeric" min="0" step="1000" placeholder="$0" value="${escapeHTML(state.min)}"></div>
      <div class="field"><label for="f-max" class="small">Máximo</label><input class="input" id="f-max" name="max" type="number" inputmode="numeric" min="0" step="1000" placeholder="Sin límite" value="${escapeHTML(state.max)}"></div>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
      ${[[0, 50000], [50000, 100000], [100000, '']].map(([a, b]) => `<button type="button" class="btn btn--outline btn--sm" data-range="${a}-${b}">${b ? `${formatPrice(a)} – ${formatPrice(b)}` : `Más de ${formatPrice(a)}`}</button>`).join('')}
    </div>
  </fieldset>
  <fieldset class="filter-group"><legend>Tono</legend><div class="tone-chips">
    ${Object.entries(TONE_FAMILIES).map(([k, t]) => `<label class="tone-chip"><input type="checkbox" name="tono" value="${k}" ${state.tono.includes(k) ? 'checked' : ''}><span><span class="dot" style="background:${t.hex}"></span>${t.label}</span></label>`).join('')}
  </div></fieldset>
  ${checkboxGroup('piel', 'Tipo de piel', Object.entries(SKIN_TYPES))}
  <fieldset class="filter-group"><legend>Mostrar</legend>
    <label class="check"><input type="checkbox" name="oferta" ${state.oferta ? 'checked' : ''}> Solo ofertas</label>
    <label class="check"><input type="checkbox" name="stock" ${state.stock ? 'checked' : ''}> Solo disponibles</label>
  </fieldset>
  <button type="button" class="link-btn" data-clear style="margin-top:16px">Limpiar filtros</button>
  <div class="filters__apply"><button type="button" class="btn btn--block" data-close-filters>Ver resultados</button></div>`;
$('#sort').value = state.orden;

/* --- Filtrar y ordenar --- */
function apply() {
  const q = normalize(state.q);
  const min = Number(state.min) || 0;
  const max = Number(state.max) || Infinity;
  let res = products.filter((p) => {
    const price = finalPrice(p);
    if (q && !normalize(`${p.name} ${p.brand} ${CATEGORIES[p.category]} ${p.description} ${p.tones.map((t) => t.name).join(' ')}`).includes(q)) return false;
    if (state.categoria.length && !state.categoria.includes(p.category)) return false;
    if (state.marca.length && !state.marca.includes(p.brand)) return false;
    if (state.tono.length && !p.tones.some((t) => state.tono.includes(t.family))) return false;
    if (state.piel.length && !state.piel.some((s) => p.skinTypes.includes(s))) return false;
    if (price < min || price > max) return false;
    if (state.oferta && !p.discount) return false;
    if (state.stock && p.stock <= 0) return false;
    return true;
  });
  const sorters = {
    relevancia: (a, b) => (b.stock > 0) - (a.stock > 0) || b.sold - a.sold,
    'precio-asc': (a, b) => finalPrice(a) - finalPrice(b),
    'precio-desc': (a, b) => finalPrice(b) - finalPrice(a),
    novedades: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    vendidos: (a, b) => b.sold - a.sold,
    calificacion: (a, b) => b.rating - a.rating,
  };
  res = res.sort(sorters[state.orden] || sorters.relevancia);
  render(res);
  syncURL();
}

function render(res) {
  const grid = $('#grid');
  $('#result-count').textContent = `${res.length} ${res.length === 1 ? 'producto' : 'productos'}`;
  grid.innerHTML = res.length
    ? res.map((p, i) => productCard(p, { eager: i < 2 })).join('')
    : `<div class="empty-state" style="grid-column:1/-1"><p>No encontramos productos con esos filtros.</p><button class="btn btn--outline btn--sm" data-clear>Limpiar filtros</button></div>`;
  // Chips de filtros activos (se pueden quitar uno a uno)
  const chips = [];
  if (state.q) chips.push(['q', state.q, `Búsqueda: “${state.q}”`]);
  state.categoria.forEach((v) => chips.push(['categoria', v, CATEGORIES[v]]));
  state.marca.forEach((v) => chips.push(['marca', v, v]));
  state.tono.forEach((v) => chips.push(['tono', v, `Tono ${TONE_FAMILIES[v]?.label}`]));
  state.piel.forEach((v) => chips.push(['piel', v, `Piel ${SKIN_TYPES[v]}`]));
  if (state.min || state.max) chips.push(['precio', '', `Precio ${state.min ? formatPrice(state.min) : '$0'} – ${state.max ? formatPrice(state.max) : 'más'}`]);
  if (state.oferta) chips.push(['oferta', '', 'Ofertas']);
  if (state.stock) chips.push(['stock', '', 'Disponibles']);
  $('#active-filters').innerHTML = chips.map(([k, v, label]) => `<button type="button" data-chip="${k}" data-val="${escapeHTML(v)}" aria-label="Quitar filtro ${escapeHTML(label)}">${escapeHTML(label)} ✕</button>`).join('');
  // Título de la página según filtro
  const title = state.categoria.length === 1 ? CATEGORIES[state.categoria[0]] : state.oferta ? 'Ofertas' : state.q ? `Resultados para “${state.q}”` : state.orden === 'novedades' ? 'Novedades' : 'Catálogo';
  $('#page-title').textContent = title;
  document.title = `${title} | Soles Store`;
}

function syncURL() {
  const p = new URLSearchParams();
  if (state.q) p.set('q', state.q);
  ['categoria', 'marca', 'tono', 'piel'].forEach((k) => state[k].length && p.set(k, state[k].join(',')));
  if (state.min) p.set('min', state.min);
  if (state.max) p.set('max', state.max);
  if (state.oferta) p.set('oferta', '1');
  if (state.stock) p.set('stock', '1');
  if (state.orden !== 'relevancia') p.set('orden', state.orden);
  history.replaceState(null, '', `${location.pathname}${p.toString() ? `?${p}` : ''}`);
}

/* --- Eventos --- */
const form = $('#filters-form');
form.addEventListener('change', (e) => {
  const el = e.target;
  if (['categoria', 'marca', 'tono', 'piel'].includes(el.name)) state[el.name] = $$(`[name="${el.name}"]:checked`, form).map((i) => i.value);
  if (el.name === 'oferta' || el.name === 'stock') state[el.name] = el.checked;
  if (el.name === 'min' || el.name === 'max') state[el.name] = el.value;
  apply();
});
form.addEventListener('submit', (e) => e.preventDefault());
document.addEventListener('click', (e) => {
  const range = e.target.closest('[data-range]');
  if (range) { [state.min, state.max] = range.dataset.range.split('-'); $('#f-min').value = state.min; $('#f-max').value = state.max; apply(); }
  if (e.target.closest('[data-clear]')) {
    Object.assign(state, { q: '', categoria: [], marca: [], tono: [], piel: [], min: '', max: '', oferta: false, stock: false });
    $$('input[type=checkbox]', form).forEach((i) => { i.checked = false; });
    $('#f-min').value = ''; $('#f-max').value = '';
    apply();
  }
  const chip = e.target.closest('[data-chip]');
  if (chip) {
    const { chip: k, val } = chip.dataset;
    if (k === 'q') state.q = '';
    else if (k === 'precio') { state.min = ''; state.max = ''; $('#f-min').value = ''; $('#f-max').value = ''; }
    else if (k === 'oferta' || k === 'stock') { state[k] = false; form.elements[k].checked = false; }
    else { state[k] = state[k].filter((v) => v !== val); const box = $(`[name="${k}"][value="${CSS.escape(val)}"]`, form); if (box) box.checked = false; }
    apply();
  }
});
$('#sort').addEventListener('change', (e) => { state.orden = e.target.value; apply(); });

/* Panel de filtros en móvil */
let release;
const filtersEl = $('.filters');
const closeFilters = () => { filtersEl.classList.remove('is-open'); document.body.classList.remove('no-scroll'); $('.filters-toggle').setAttribute('aria-expanded', 'false'); release?.(); };
$('.filters-toggle').addEventListener('click', () => {
  filtersEl.classList.add('is-open'); document.body.classList.add('no-scroll'); $('.filters-toggle').setAttribute('aria-expanded', 'true');
  release = trapFocus(filtersEl, closeFilters);
});
filtersEl.addEventListener('click', (e) => { if (e.target.closest('[data-close-filters]')) closeFilters(); });

bindCardActions($('#grid'), products);
apply();
