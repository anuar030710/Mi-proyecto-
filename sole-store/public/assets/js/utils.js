/**
 * Utilidades compartidas: precios, almacenamiento seguro, DOM, estrellas y avisos.
 */
import { CONFIG } from './config.js';

const priceFormatter = new Intl.NumberFormat(CONFIG.locale, {
  style: 'currency', currency: CONFIG.currency,
  minimumFractionDigits: CONFIG.decimals, maximumFractionDigits: CONFIG.decimals,
});
/** 59900 -> "$ 59.900" (COP) o "$59,900.00" (USD) */
export const formatPrice = (n) => priceFormatter.format(Math.round(n * 10 ** CONFIG.decimals) / 10 ** CONFIG.decimals);

/** localStorage que nunca rompe la página (modo privado, almacenamiento bloqueado, etc.). */
export const storage = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
  },
  remove(key) { try { localStorage.removeItem(key); } catch { /* sin acceso */ } },
};

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Escapa texto antes de insertarlo como HTML (evita inyección de código). */
export function escapeHTML(str = '') {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function debounce(fn, ms = 200) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export const getParam = (name) => new URLSearchParams(location.search).get(name);

/** Quita tildes y pasa a minúsculas para búsquedas tolerantes ("mascara" encuentra "Máscara"). */
export const normalize = (s = '') => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const STAR = '<svg viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9l-5.2 2.8 1-5.9L1.5 7.7l5.9-.8z"/></svg>';
const STAR_EMPTY = '<svg viewBox="0 0 20 20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.4" d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9l-5.2 2.8 1-5.9L1.5 7.7l5.9-.8z"/></svg>';
const STAR_HALF = '<svg viewBox="0 0 20 20" aria-hidden="true"><defs><linearGradient id="half"><stop offset="50%" stop-color="currentColor"/><stop offset="50%" stop-color="transparent"/></linearGradient></defs><path fill="url(#half)" stroke="currentColor" stroke-width="1.4" d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9l-5.2 2.8 1-5.9L1.5 7.7l5.9-.8z"/></svg>';

/** Estrellas con texto accesible: "Calificación 4,5 de 5". */
export function starsHTML(rating) {
  const r = Math.round(rating * 2) / 2;
  let html = '';
  for (let i = 1; i <= 5; i++) html += r >= i ? STAR : r >= i - 0.5 ? STAR_HALF : STAR_EMPTY;
  return `<span class="stars" role="img" aria-label="Calificación ${String(rating).replace('.', ',')} de 5">${html}</span>`;
}

/** Aviso flotante y anunciado a lectores de pantalla. */
export function toast(message, type = 'info') {
  let region = $('.toast-region');
  if (!region) {
    region = document.createElement('div');
    region.className = 'toast-region'; region.setAttribute('role', 'status'); region.setAttribute('aria-live', 'polite');
    document.body.appendChild(region);
  }
  const el = document.createElement('div');
  el.className = `toast${type === 'error' ? ' toast--error' : ''}`;
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/** Atrapa el foco dentro de un panel (drawer, modal) y lo devuelve al cerrar. */
export function trapFocus(container, onEscape) {
  const previouslyFocused = document.activeElement;
  const focusables = () => $$('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])', container)
    .filter((el) => el.offsetParent !== null);
  function onKey(e) {
    if (e.key === 'Escape') { onEscape?.(); return; }
    if (e.key !== 'Tab') return;
    const f = focusables(); if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  container.addEventListener('keydown', onKey);
  setTimeout(() => focusables()[0]?.focus(), 60);
  return () => { container.removeEventListener('keydown', onKey); previouslyFocused?.focus?.(); };
}

/** Id aleatorio legible (para órdenes y registros). */
export function randomId(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const arr = new Uint32Array(len); crypto.getRandomValues(arr);
  return [...arr].map((n) => chars[n % chars.length]).join('');
}

/** Aparición suave de secciones al hacer scroll. */
export function initReveal() {
  const els = $$('.reveal');
  if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-visible')); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach((e) => io.observe(e));
}
