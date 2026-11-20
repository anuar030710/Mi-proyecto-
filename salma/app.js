/* Catálogo, inventario por talla, bolsa y envío del pedido por WhatsApp. */
import { cargarTienda, crearPedido, tallasDe, stockDe, agotado } from "./data.js";

const { $, esc, money, recordConsent, fechaCO } = window.Salma;
const BAG_KEY = "salma_bolsa";
const POCAS = 3; // a partir de cuántas unidades se muestra "¡Últimas!"

Salma.init(window.SALMA_CONFIG);
$("#grid").innerHTML = '<p class="muted">Cargando catálogo…</p>';
const { cfg, productos: products } = await cargarTienda();
Salma.init(cfg);
const waLink = Salma.waLink;
const byId = (id) => products.find((p) => p.id === id);

/* ---------- medios de pago ---------- */
$("#pay-strip").innerHTML =
  "<span><strong>Aceptamos:</strong> " + cfg.pagos.map(esc).join(" · ") + "</span><span>" + esc(cfg.notaPagos) + "</span>";

/* ---------- filtros y catálogo ---------- */
const cats = ["Todo", ...new Set(products.map((p) => p.categoria))];
let current = "Todo";
const filters = $("#filters");
function renderFilters() {
  filters.innerHTML = cats.map((c) => `<button type="button" class="chip" aria-pressed="${c === current}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
}
filters.addEventListener("click", (e) => {
  const b = e.target.closest("[data-cat]");
  if (!b) return;
  current = b.dataset.cat;
  renderFilters();
  renderGrid();
});

const priceHtml = (p) => money(p.precio) + (p.precioAntes > 0 ? ` <s>${money(p.precioAntes)}</s>` : "");
function totalStock(p) {
  if (!p.stock) return null;
  return tallasDe(p, cfg).reduce((s, t) => s + stockDe(p, t), 0);
}
function renderGrid() {
  const list = products.filter((p) => current === "Todo" || p.categoria === current);
  if (!list.length) { $("#grid").innerHTML = '<p class="muted">Pronto tendremos nuevas piezas aquí.</p>'; return; }
  $("#grid").innerHTML = list
    .map((p) => {
      const out = agotado(p, cfg);
      const tot = totalStock(p);
      const tag = out ? '<span class="tag out">Agotado</span>' : tot !== null && tot <= POCAS ? `<span class="tag">¡Últimas ${tot}!</span>` : p.nuevo ? '<span class="tag">Nuevo</span>' : "";
      return `
    <article class="card${out ? " is-out" : ""}">
      <button class="card-img" type="button" data-open="${esc(p.id)}" aria-label="Ver ${esc(p.nombre)}">
        <img src="${esc(p.imagen)}" alt="${esc(p.nombre)}: ${esc(p.piezas)}" loading="lazy" width="450" height="562" />
        ${tag}
      </button>
      <div class="card-body">
        <span class="card-cat">${esc(p.categoria)}</span>
        <h3>${esc(p.nombre)}</h3>
        <p class="pieces">${esc(p.piezas)}</p>
        <div class="swatches">${(p.colores || []).map((c) => `<span class="dot" style="background:${esc(c.hex)}" title="${esc(c.nombre)}"></span>`).join("")}</div>
        <p class="price">${priceHtml(p)}</p>
        <button class="btn ${out ? "btn-ghost" : "btn-primary"}" type="button" data-open="${esc(p.id)}">${out ? "Avísame cuando llegue" : "Elegir talla"}</button>
      </div>
    </article>`;
    })
    .join("");
}
$("#grid").addEventListener("click", (e) => {
  const b = e.target.closest("[data-open]");
  if (!b) return;
  const p = byId(b.dataset.open);
  if (agotado(p, cfg)) {
    window.open(waLink(`Hola ✨ quiero saber cuándo vuelve a estar disponible: ${p.nombre}`), "_blank", "noopener");
    return;
  }
  openProduct(p);
});

/* ---------- detalle ---------- */
const pdlg = $("#product-dlg");
let active = null, qty = 1;
function maxQty() {
  const t = $("#p-form").talla && $("#p-form").talla.value;
  if (!active || !t) return 20;
  const s = stockDe(active, t);
  const enBolsa = load().filter((i) => i.id === active.id && i.talla === t).reduce((a, i) => a + i.cantidad, 0);
  return s === null ? 20 : Math.max(0, Math.min(20, s - enBolsa));
}
function syncQty() {
  const m = maxQty();
  qty = Math.max(1, Math.min(qty, m || 1));
  $("#q-val").textContent = qty;
  $("#p-add").disabled = m === 0;
  $("#p-add").textContent = m === 0 ? "Ya tienes todas las unidades en tu bolsa" : "Agregar a la bolsa";
  const t = $("#p-form").talla && $("#p-form").talla.value;
  const s = t ? stockDe(active, t) : null;
  $("#p-stock").textContent = s === null || !t ? "" : s <= POCAS ? `¡Solo quedan ${s} en talla ${t}!` : `Disponible en talla ${t}`;
}
function openProduct(p) {
  active = p;
  qty = 1;
  $("#p-img").src = p.imagen;
  $("#p-img").alt = p.nombre;
  $("#p-cat").textContent = p.categoria;
  $("#p-name").textContent = p.nombre;
  $("#p-pieces").textContent = p.piezas;
  $("#p-price").innerHTML = priceHtml(p);
  $("#p-colors").innerHTML = (p.colores || [])
    .map((c, i) => `<label class="opt"><input type="radio" name="color" value="${esc(c.nombre)}" ${i === 0 ? "checked" : ""} /><span><i class="dot" style="background:${esc(c.hex)}"></i>${esc(c.nombre)}</span></label>`)
    .join("");
  $("#p-sizes").innerHTML = tallasDe(p, cfg)
    .map((s) => {
      const n = stockDe(p, s);
      const off = n !== null && n <= 0;
      return `<label class="opt${off ? " off" : ""}"><input type="radio" name="talla" value="${esc(s)}" ${off ? "disabled" : ""} required /><span>${esc(s)}${off ? " · agotada" : ""}</span></label>`;
    })
    .join("");
  syncQty();
  pdlg.showModal();
}
$("#p-sizes").addEventListener("change", syncQty);
$("#q-minus").onclick = () => { qty = Math.max(1, qty - 1); syncQty(); };
$("#q-plus").onclick = () => { qty = qty + 1; syncQty(); };
$("#p-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target;
  const talla = f.talla.value;
  if (!talla) { const r = f.querySelector('input[name="talla"]:not([disabled])'); if (r) { r.focus(); r.reportValidity(); } return; }
  if (maxQty() === 0) return;
  addToBag({ id: active.id, color: f.color ? f.color.value : "", talla, cantidad: qty });
  pdlg.close();
  openBag();
});

/* ---------- bolsa ---------- */
let memBag = [];
function load() {
  let bag;
  try { bag = JSON.parse(localStorage.getItem(BAG_KEY) || "[]"); } catch (e) { bag = memBag; }
  // Ajusta la bolsa al inventario actual
  return bag
    .filter((i) => byId(i.id))
    .map((i) => { const s = stockDe(byId(i.id), i.talla); return s === null ? i : { ...i, cantidad: Math.min(i.cantidad, s) }; })
    .filter((i) => i.cantidad > 0);
}
function save(bag) { memBag = bag; try { localStorage.setItem(BAG_KEY, JSON.stringify(bag)); } catch (e) {} renderBag(); }
function addToBag(item) {
  const bag = load();
  const same = bag.find((i) => i.id === item.id && i.color === item.color && i.talla === item.talla);
  if (same) same.cantidad += item.cantidad; else bag.push(item);
  save(bag);
}
const total = (bag) => bag.reduce((s, i) => s + byId(i.id).precio * i.cantidad, 0);
function renderBag() {
  const bag = load();
  $("#bag-count").textContent = bag.reduce((s, i) => s + i.cantidad, 0);
  $("#bag-list").innerHTML = bag
    .map((i, idx) => { const p = byId(i.id); return `
      <li class="bag-item"><img src="${esc(p.imagen)}" alt="" />
        <div><strong>${esc(p.nombre)}</strong><small>${i.color ? esc(i.color) + " · " : ""}Talla ${esc(i.talla)} · x${i.cantidad}</small><small>${money(p.precio * i.cantidad)}</small></div>
        <button class="rm" type="button" data-rm="${idx}">Quitar</button></li>`; })
    .join("");
  const empty = bag.length === 0;
  $("#bag-empty").hidden = !empty;
  $("#bag-total-row").hidden = empty;
  $("#order-form").hidden = empty;
  $("#bag-total").textContent = money(total(bag));
}
$("#bag-list").addEventListener("click", (e) => {
  const b = e.target.closest("[data-rm]");
  if (!b) return;
  const bag = load();
  bag.splice(+b.dataset.rm, 1);
  save(bag);
});
const bdlg = $("#bag-dlg");
function openBag() { renderBag(); bdlg.showModal(); }
$("#bag-open").addEventListener("click", openBag);

document.querySelectorAll("dialog").forEach((d) => {
  d.addEventListener("click", (e) => { if (e.target === d || e.target.closest("[data-close]")) d.close(); });
});

/* ---------- envío del pedido ---------- */
const textOf = (id) => $(id).textContent.replace(/\s+/g, " ").trim();
$("#order-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("#form-error");
  const nombre = $("#f-nombre").value.trim();
  const ciudad = $("#f-ciudad").value.trim();
  const nota = $("#f-nota").value.trim();
  const cT = $("#c-terminos").checked, cD = $("#c-datos").checked;
  if (!nombre) { err.textContent = "Escribe tu nombre."; $("#f-nombre").focus(); return; }
  if (!ciudad) { err.textContent = "Escribe tu ciudad o municipio."; $("#f-ciudad").focus(); return; }
  if (!cT) { err.textContent = "Debes aceptar los Términos y condiciones para enviar el pedido."; $("#c-terminos").focus(); return; }
  if (!cD) { err.textContent = "Necesitamos tu autorización de datos para gestionar el pedido."; $("#c-datos").focus(); return; }
  err.textContent = "";

  // Abrimos la pestaña ya (los navegadores bloquean ventanas abiertas después de esperar)
  const win = window.open("", "_blank");
  const btn = $("#send-btn");
  btn.disabled = true;
  btn.textContent = "Enviando…";

  const bag = load();
  const consentimiento = recordConsent({
    metodo: "Formulario de pedido web: dos casillas marcadas por la usuaria (no venían premarcadas)",
    aceptaTerminos: { valor: true, version: cfg.legal.versionTerminos, texto: textOf("#t-terminos") },
    autorizaDatos: { valor: true, version: cfg.legal.versionPrivacidad, texto: textOf("#t-datos") },
  });
  const items = bag.map((i) => { const p = byId(i.id); return { id: p.id, nombre: p.nombre, color: i.color, talla: i.talla, cantidad: i.cantidad, precio: p.precio }; });
  const pedidoId = await crearPedido({ nombre, ciudad, nota, items, subtotal: total(bag), consentimiento });
  const ref = pedidoId ? pedidoId.slice(0, 6).toUpperCase() : consentimiento.id;

  const lines = items.map((i) => `• ${i.nombre} — ${i.color ? i.color + ", " : ""}talla ${i.talla} x${i.cantidad} = ${money(i.precio * i.cantidad)}`);
  const msg = [
    `Hola ${cfg.marca.nombre} ✨ quiero hacer este pedido (ref. ${ref}):`,
    "",
    ...lines,
    "",
    `Subtotal: ${money(total(bag))} (sin envío)`,
    `Nombre: ${nombre}`,
    `Ciudad: ${ciudad}`,
    nota ? `Nota: ${nota}` : null,
    "",
    `— Registro de consentimiento ${consentimiento.id} —`,
    `✅ Acepto Términos y condiciones v${cfg.legal.versionTerminos} y Política de reembolsos`,
    `✅ Autorizo el tratamiento de mis datos (Política de privacidad v${cfg.legal.versionPrivacidad})`,
    `Fecha: ${fechaCO(consentimiento.fecha)} (hora Colombia) · Medio: formulario web`,
  ].filter((l) => l !== null).join("\n");

  if (win) win.location.href = waLink(msg); else window.location.href = waLink(msg);
  save([]);
  $("#order-form").reset();
  btn.disabled = false;
  btn.textContent = "Enviar pedido por WhatsApp";
  bdlg.close();
});

renderFilters();
renderGrid();
renderBag();
