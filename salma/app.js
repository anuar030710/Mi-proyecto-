/* Catálogo, bolsa y envío del pedido por WhatsApp. Los datos vienen de config.js */
(function () {
  const { cfg, $, esc, money, waLink, recordConsent, fechaCO } = window.Salma;
  const BAG_KEY = "salma_bolsa";
  const products = cfg.productos;
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

  function priceHtml(p) {
    return money(p.precio) + (p.precioAntes > 0 ? ` <s>${money(p.precioAntes)}</s>` : "");
  }
  function renderGrid() {
    const list = products.filter((p) => current === "Todo" || p.categoria === current);
    $("#grid").innerHTML = list
      .map(
        (p) => `
      <article class="card">
        <button class="card-img" type="button" data-open="${esc(p.id)}" aria-label="Ver ${esc(p.nombre)}">
          <img src="${esc(p.imagen)}" alt="${esc(p.nombre)}: ${esc(p.piezas)}" loading="lazy" width="450" height="562" />
          ${!p.disponible ? '<span class="tag out">Agotado</span>' : p.nuevo ? '<span class="tag">Nuevo</span>' : ""}
        </button>
        <div class="card-body">
          <span class="card-cat">${esc(p.categoria)}</span>
          <h3>${esc(p.nombre)}</h3>
          <p class="pieces">${esc(p.piezas)}</p>
          <div class="swatches">${p.colores.map((c) => `<span class="dot" style="background:${esc(c.hex)}" title="${esc(c.nombre)}"></span>`).join("")}</div>
          <p class="price">${priceHtml(p)}</p>
          <button class="btn ${p.disponible ? "btn-primary" : "btn-ghost"}" type="button" data-open="${esc(p.id)}">${p.disponible ? "Elegir talla" : "Avísame cuando llegue"}</button>
        </div>
      </article>`
      )
      .join("");
  }
  $("#grid").addEventListener("click", (e) => {
    const b = e.target.closest("[data-open]");
    if (!b) return;
    const p = byId(b.dataset.open);
    if (!p.disponible) {
      window.open(waLink(`Hola ✨ quiero saber cuándo vuelve a estar disponible: ${p.nombre}`), "_blank", "noopener");
      return;
    }
    openProduct(p);
  });

  /* ---------- detalle ---------- */
  const pdlg = $("#product-dlg");
  let active = null, qty = 1;
  function openProduct(p) {
    active = p;
    qty = 1;
    $("#q-val").textContent = qty;
    $("#p-img").src = p.imagen;
    $("#p-img").alt = p.nombre;
    $("#p-cat").textContent = p.categoria;
    $("#p-name").textContent = p.nombre;
    $("#p-pieces").textContent = p.piezas;
    $("#p-price").innerHTML = priceHtml(p);
    $("#p-colors").innerHTML = p.colores
      .map((c, i) => `<label class="opt"><input type="radio" name="color" value="${esc(c.nombre)}" ${i === 0 ? "checked" : ""} /><span><i class="dot" style="background:${esc(c.hex)}"></i>${esc(c.nombre)}</span></label>`)
      .join("");
    const sizes = p.tallas && p.tallas.length ? p.tallas : cfg.tallas;
    $("#p-sizes").innerHTML = sizes.map((s) => `<label class="opt"><input type="radio" name="talla" value="${esc(s)}" required /><span>${esc(s)}</span></label>`).join("");
    pdlg.showModal();
  }
  $("#q-minus").onclick = () => { qty = Math.max(1, qty - 1); $("#q-val").textContent = qty; };
  $("#q-plus").onclick = () => { qty = Math.min(20, qty + 1); $("#q-val").textContent = qty; };
  $("#p-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    const talla = f.talla.value;
    if (!talla) { f.querySelector('input[name="talla"]').focus(); f.querySelector('input[name="talla"]').reportValidity(); return; }
    addToBag({ id: active.id, color: f.color.value, talla, cantidad: qty });
    pdlg.close();
    openBag();
  });

  /* ---------- bolsa ---------- */
  function load() { try { return JSON.parse(localStorage.getItem(BAG_KEY) || "[]").filter((i) => byId(i.id)); } catch (e) { return memBag; } }
  let memBag = [];
  function save(bag) { memBag = bag; try { localStorage.setItem(BAG_KEY, JSON.stringify(bag)); } catch (e) {} renderBag(); }
  function addToBag(item) {
    const bag = load();
    const same = bag.find((i) => i.id === item.id && i.color === item.color && i.talla === item.talla);
    if (same) same.cantidad = Math.min(20, same.cantidad + item.cantidad); else bag.push(item);
    save(bag);
  }
  const total = (bag) => bag.reduce((s, i) => s + byId(i.id).precio * i.cantidad, 0);
  function renderBag() {
    const bag = load();
    $("#bag-count").textContent = bag.reduce((s, i) => s + i.cantidad, 0);
    $("#bag-list").innerHTML = bag
      .map((i, idx) => { const p = byId(i.id); return `
        <li class="bag-item"><img src="${esc(p.imagen)}" alt="" />
          <div><strong>${esc(p.nombre)}</strong><small>${esc(i.color)} · Talla ${esc(i.talla)} · x${i.cantidad}</small><small>${money(p.precio * i.cantidad)}</small></div>
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
  $("#order-form").addEventListener("submit", (e) => {
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

    const bag = load();
    const rec = recordConsent({
      metodo: "Formulario de pedido web: dos casillas marcadas por la usuaria (no venían premarcadas)",
      nombre,
      ciudad,
      aceptaTerminos: { valor: true, version: cfg.legal.versionTerminos, texto: textOf("#t-terminos") },
      autorizaDatos: { valor: true, version: cfg.legal.versionPrivacidad, texto: textOf("#t-datos") },
    });

    const lines = bag.map((i) => { const p = byId(i.id); return `• ${p.nombre} — ${i.color}, talla ${i.talla} x${i.cantidad} = ${money(p.precio * i.cantidad)}`; });
    const msg = [
      `Hola ${cfg.marca.nombre} ✨ quiero hacer este pedido:`,
      "",
      ...lines,
      "",
      `Subtotal: ${money(total(bag))} (sin envío)`,
      `Nombre: ${nombre}`,
      `Ciudad: ${ciudad}`,
      nota ? `Nota: ${nota}` : null,
      "",
      `— Registro de consentimiento ${rec.id} —`,
      `✅ Acepto Términos y condiciones v${cfg.legal.versionTerminos} y Política de reembolsos`,
      `✅ Autorizo el tratamiento de mis datos (Política de privacidad v${cfg.legal.versionPrivacidad})`,
      `Fecha: ${fechaCO(rec.fecha)} (hora Colombia) · Medio: formulario web`,
    ].filter((l) => l !== null).join("\n");

    window.open(waLink(msg), "_blank", "noopener");
    save([]);
    $("#order-form").reset();
    bdlg.close();
  });

  renderFilters();
  renderGrid();
  renderBag();
})();
