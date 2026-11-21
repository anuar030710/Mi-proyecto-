/* Pedido de Soles Store: los botones "Agregar" llenan la bolsa; el formulario abre WhatsApp
   (wa.me/573054556549) con el pedido y el registro de aceptación escritos en el mensaje. */
import { registrar, fechaColombia } from './consentimiento.js';

const CLAVE = 'soles-bolsa';
const pesos = n => '$' + new Intl.NumberFormat('es-CO').format(n);

const productos = new Map(
  [...document.querySelectorAll('[data-id][data-price]')].map(li => [li.dataset.id, { nombre: li.dataset.name, precio: Number(li.dataset.price) }])
);

let bolsa = {};
try { bolsa = JSON.parse(localStorage.getItem(CLAVE) || '{}'); } catch { bolsa = {}; }
for (const id of Object.keys(bolsa)) if (!productos.has(id) || !(bolsa[id] > 0)) delete bolsa[id];

const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(bolsa)); } catch { /* sin almacenamiento */ } };

const caja = document.querySelector('[data-bag]');
const vacio = document.querySelector('[data-bag-empty]');

function total() {
  return Object.entries(bolsa).reduce((s, [id, n]) => s + productos.get(id).precio * n, 0);
}

function pintar() {
  if (!caja) return;
  caja.querySelectorAll('.bag__item, .bag__total').forEach(el => el.remove());
  const ids = Object.keys(bolsa);
  vacio.hidden = ids.length > 0;
  for (const id of ids) {
    const p = productos.get(id);
    const fila = document.createElement('div');
    fila.className = 'bag__item';
    const nombre = document.createElement('span');
    nombre.textContent = p.nombre;
    const qty = document.createElement('span');
    qty.className = 'bag__qty';
    const menos = document.createElement('button');
    menos.type = 'button'; menos.textContent = '−'; menos.setAttribute('aria-label', `Quitar uno: ${p.nombre}`);
    const n = document.createElement('span');
    n.textContent = bolsa[id];
    const mas = document.createElement('button');
    mas.type = 'button'; mas.textContent = '+'; mas.setAttribute('aria-label', `Agregar uno: ${p.nombre}`);
    menos.addEventListener('click', () => cambiar(id, -1));
    mas.addEventListener('click', () => cambiar(id, 1));
    qty.append(menos, n, mas);
    const precio = document.createElement('span');
    precio.textContent = pesos(p.precio * bolsa[id]);
    fila.append(nombre, qty, precio);
    caja.append(fila);
  }
  if (ids.length) {
    const t = document.createElement('p');
    t.className = 'bag__total';
    t.innerHTML = '<span>Total de productos</span><span></span>';
    t.lastChild.textContent = pesos(total());
    caja.append(t);
  }
}

function cambiar(id, d) {
  bolsa[id] = (bolsa[id] || 0) + d;
  if (bolsa[id] <= 0) delete bolsa[id];
  guardar();
  pintar();
}

document.querySelectorAll('[data-add]').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.closest('[data-id]').dataset.id;
    cambiar(id, 1);
    btn.textContent = `Agregado (${bolsa[id]})`;
  });
});
for (const [id, n] of Object.entries(bolsa)) {
  const btn = document.querySelector(`[data-id="${id}"] [data-add]`);
  if (btn) btn.textContent = `Agregado (${n})`;
}
pintar();

const form = document.getElementById('pedido-form');
if (form) {
  form.addEventListener('submit', e => {
    if (e.defaultPrevented || !form.checkValidity()) return;   // system.js ya mostró los errores
    const acepto = form.querySelector('#f-acepto');
    const promos = form.querySelector('#f-promos');
    const texto = el => el.closest('.consent').querySelector('[data-consent-text]').textContent.replace(/\s+/g, ' ').trim();
    const registro = registrar({
      formulario: 'Pedido por WhatsApp',
      documentos: ['terminos', 'privacidad', 'reembolsos'],
      casillas: [
        { texto: texto(acepto), marcada: acepto.checked, obligatoria: true },
        { texto: texto(promos), marcada: promos.checked, obligatoria: false },
      ],
    });
    const lineas = ['Hola Soles Store, quiero hacer este pedido:'];
    const ids = Object.keys(bolsa);
    if (ids.length) {
      for (const id of ids) {
        const p = productos.get(id);
        lineas.push(`• ${bolsa[id]} x ${p.nombre}: ${pesos(p.precio * bolsa[id])}`);
      }
      lineas.push(`Total de productos: ${pesos(total())} (sin envío)`);
    } else {
      lineas.push('Aún no elijo productos; quiero que me asesoren.');
    }
    lineas.push(`Entrega: ${form.querySelector('#f-entrega').value}`);
    lineas.push('');
    lineas.push(`Acepto términos, privacidad y cambios (v1, nov. 2026). Registro ${registro.id}, ${fechaColombia(new Date(registro.fecha_utc))}.`);
    lineas.push(`Promociones por WhatsApp: ${promos.checked ? 'sí' : 'no'}.`);
    const texto_final = lineas.join('\n');
    form.querySelector('input[name="text"]').value = texto_final;
    // se abre con un enlace real: funciona en cualquier sitio, también donde el navegador bloquea ventanas nuevas
    e.preventDefault();
    const url = form.action + '?text=' + encodeURIComponent(texto_final);
    let enlace = form.querySelector('[data-wa-link]');
    if (!enlace) {
      enlace = document.createElement('a');
      enlace.className = 'btn btn--secondary';
      enlace.dataset.waLink = '';
      enlace.target = '_blank';
      enlace.rel = 'noopener';
      enlace.textContent = 'Abrir WhatsApp con mi pedido';
      form.querySelector('.btn-row').append(enlace);
    }
    enlace.href = url;
    let abierta = null;
    try { abierta = window.open(url, '_blank'); if (abierta) abierta.opener = null; } catch { abierta = null; }
    const estado = form.querySelector('[data-form-status]');
    if (estado) estado.textContent = abierta
      ? 'Abrimos WhatsApp con tu pedido escrito. Envía el mensaje para confirmarlo.'
      : 'Tu pedido está listo. Toca «Abrir WhatsApp con mi pedido» y envía el mensaje para confirmarlo.';
  });
}
