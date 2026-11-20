/* Panel de administración: solo la cuenta autorizada en firestore.rules puede guardar cambios. */
import { firebase, isLive, tallasDe } from "./data.js";

const $ = (s, r = document) => r.querySelector(s);
const app = $("#app");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => "$" + Number(n || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 });
const LOCAL = window.SALMA_CONFIG;

let toastT;
function toast(msg, ms = 2600) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => (t.hidden = true), ms);
}

if (!isLive()) {
  app.innerHTML = `<div class="center"><div class="panel login"><h1 style="font:500 26px var(--serif)">Panel no conectado</h1>
    <p class="muted">Falta configurar Firebase en <code>firebase-config.js</code>. Sigue los pasos de LEEME.md.</p></div></div>`;
  await new Promise(() => {}); // se detiene aquí sin error
}

const { db, auth, fs, au } = await firebase();

/* ===================== estado ===================== */
let cfg = null;
let productos = [];
let pedidos = [];
let tab = "pedidos";
let filtroPedidos = "pendiente";
let editando = null; // id del producto abierto o "nuevo"

/* ===================== login ===================== */
function renderLogin(msg = "") {
  app.innerHTML = `
    <div class="center"><form class="panel login form" id="login" novalidate>
      <a class="logo" href="index.html">Inspirato <span>Salma</span></a>
      <h1 style="font:500 26px/1.1 var(--serif);margin:8px 0 4px">Panel de administración</h1>
      <p class="muted" style="margin:0 0 8px">Solo para la dueña de la tienda.</p>
      <div class="field"><label for="l-email">Correo</label><input id="l-email" type="email" autocomplete="username" required /></div>
      <div class="field"><label for="l-pass">Contraseña</label><input id="l-pass" type="password" autocomplete="current-password" required /></div>
      <p class="form-error" id="l-err" role="alert">${esc(msg)}</p>
      <button class="btn btn-primary" type="submit">Entrar</button>
      <button class="back" type="button" id="l-reset">Olvidé mi contraseña</button>
    </form></div>`;
  $("#login").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("#l-email").value.trim(), pass = $("#l-pass").value;
    if (!email || !pass) { $("#l-err").textContent = "Escribe tu correo y contraseña."; return; }
    try {
      await au.signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      $("#l-err").textContent = "Correo o contraseña incorrectos.";
    }
  });
  $("#l-reset").onclick = async () => {
    const email = $("#l-email").value.trim();
    if (!email) { $("#l-err").textContent = "Escribe tu correo arriba y vuelve a tocar “Olvidé mi contraseña”."; return; }
    try { await au.sendPasswordResetEmail(auth, email); } catch (e) {}
    $("#l-err").textContent = "Si el correo es correcto, te llegó un enlace para crear una nueva contraseña.";
  };
}

au.onAuthStateChanged(auth, async (user) => {
  if (!user) return renderLogin();
  app.innerHTML = '<div class="center"><p class="muted">Cargando tu tienda…</p></div>';
  try {
    await cargarTodo();
  } catch (e) {
    console.error(e);
    await au.signOut(auth);
    return renderLogin(e.code === "permission-denied" ? "Esta cuenta no tiene permiso para administrar la tienda." : "No se pudo cargar: " + e.message);
  }
  render();
});

/* ===================== datos ===================== */
async function cargarTodo() {
  const [c, p, o] = await Promise.all([
    fs.getDoc(fs.doc(db, "tienda", "config")),
    fs.getDocs(fs.collection(db, "productos")),
    fs.getDocs(fs.query(fs.collection(db, "pedidos"), fs.orderBy("creado", "desc"), fs.limit(300))),
  ]);
  const base = JSON.parse(JSON.stringify(LOCAL));
  delete base.productos;
  cfg = c.exists() ? Object.assign(base, c.data()) : base;
  productos = p.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  pedidos = o.docs.map((d) => ({ id: d.id, ...d.data() }));
}

const stockTotal = (p) => tallasDe(p, cfg).reduce((s, t) => s + Number((p.stock || {})[t] || 0), 0);
const fecha = (ts) => (ts && ts.toDate ? ts.toDate().toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "medium", timeStyle: "short" }) : "—");

/* ===================== layout ===================== */
function render() {
  const pend = pedidos.filter((o) => o.estado === "pendiente").length;
  app.innerHTML = `
    <div class="adm-top">
      <h1>Hola ✨</h1>
      <div style="display:flex;gap:8px"><a class="btn btn-ghost small" href="index.html" target="_blank">Ver tienda</a><button class="btn btn-ghost small" id="logout" type="button">Salir</button></div>
    </div>
    <div class="tabs" role="tablist">
      <button role="tab" data-tab="pedidos" aria-selected="${tab === "pedidos"}">Pedidos${pend ? `<span class="badge">${pend}</span>` : ""}</button>
      <button role="tab" data-tab="productos" aria-selected="${tab === "productos"}">Productos</button>
      <button role="tab" data-tab="tienda" aria-selected="${tab === "tienda"}">Tienda</button>
    </div>
    <section id="view"></section>`;
  $("#logout").onclick = () => au.signOut(auth);
  app.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => { tab = b.dataset.tab; editando = null; render(); }));
  if (tab === "pedidos") renderPedidos();
  else if (tab === "productos") editando ? renderEditor() : renderProductos();
  else renderTienda();
  window.scrollTo({ top: 0 });
}

/* ===================== PEDIDOS ===================== */
function faltantes(o) {
  return (o.items || []).flatMap((i) => {
    const p = productos.find((x) => x.id === i.id);
    if (!p) return [`${i.nombre}: el producto ya no existe`];
    const s = Number((p.stock || {})[i.talla] || 0);
    return s < i.cantidad ? [`${i.nombre} talla ${i.talla}: hay ${s}, pide ${i.cantidad}`] : [];
  });
}
function renderPedidos() {
  const counts = { pendiente: 0, confirmado: 0, cancelado: 0 };
  pedidos.forEach((o) => (counts[o.estado] = (counts[o.estado] || 0) + 1));
  const list = pedidos.filter((o) => o.estado === filtroPedidos);
  const label = { pendiente: "Pendientes", confirmado: "Vendidos", cancelado: "Cancelados" };
  $("#view").innerHTML = `
    <div class="filters" style="margin:4px 0 14px">${Object.keys(label).map((k) => `<button class="chip" type="button" data-f="${k}" aria-pressed="${k === filtroPedidos}">${label[k]} (${counts[k] || 0})</button>`).join("")}</div>
    ${filtroPedidos === "pendiente" ? '<p class="muted" style="margin-top:0">Cuando la clienta pague, toca <b>Confirmar venta</b>: se descuenta del inventario.</p>' : ""}
    ${list.length ? "" : '<div class="panel"><p class="muted" style="margin:0">No hay pedidos aquí.</p></div>'}
    ${list.map((o) => {
      const falta = o.estado === "pendiente" ? faltantes(o) : [];
      const c = o.consentimiento || {};
      return `
      <article class="panel order">
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
          <h3>${esc(o.nombre)} · ${esc(o.ciudad)}</h3>
          <span class="pill">Ref. ${esc(o.id.slice(0, 6).toUpperCase())}</span>
        </div>
        <small class="muted">${fecha(o.creado)}${o.estado === "confirmado" ? " · vendido " + fecha(o.confirmado) : ""}</small>
        <ul>${(o.items || []).map((i) => `<li>${esc(i.nombre)} — ${i.color ? esc(i.color) + ", " : ""}talla ${esc(i.talla)} x${i.cantidad} · ${money(i.precio * i.cantidad)}</li>`).join("")}</ul>
        <strong>Subtotal: ${money(o.subtotal)}</strong>
        ${o.nota ? `<p class="muted" style="margin:6px 0 0">Nota: ${esc(o.nota)}</p>` : ""}
        ${falta.length ? `<p class="warn">⚠️ No alcanza el inventario:<br>${falta.map(esc).join("<br>")}</p>` : ""}
        <details style="margin-top:8px"><summary>Registro de consentimiento ${esc(c.id || "")}</summary>
          <pre>Fecha: ${esc(c.fecha || "")}
Método: ${esc(c.metodo || "")}
Términos v${esc(c.aceptaTerminos?.version)}: ${c.aceptaTerminos?.valor ? "ACEPTADO" : "NO"}
"${esc(c.aceptaTerminos?.texto)}"
Privacidad v${esc(c.autorizaDatos?.version)}: ${c.autorizaDatos?.valor ? "AUTORIZADO" : "NO"}
"${esc(c.autorizaDatos?.texto)}"</pre></details>
        <div class="row-btns">
          ${o.estado === "pendiente" ? `<button class="btn btn-wa small" type="button" data-confirm="${o.id}" ${falta.length ? "disabled" : ""}>Confirmar venta</button><button class="btn btn-ghost small danger" type="button" data-cancel="${o.id}">Cancelar pedido</button>` : ""}
          ${o.estado === "confirmado" ? `<button class="btn btn-ghost small danger" type="button" data-undo="${o.id}">Anular venta (devuelve al inventario)</button>` : ""}
          ${o.estado === "cancelado" ? `<button class="btn btn-ghost small" type="button" data-reopen="${o.id}">Volver a pendiente</button>` : ""}
        </div>
      </article>`;
    }).join("")}`;
  $("#view").onclick = async (e) => {
    const d = e.target.dataset;
    if (d.f) { filtroPedidos = d.f; return renderPedidos(); }
    try {
      if (d.confirm) { e.target.disabled = true; await moverInventario(d.confirm, "pendiente", "confirmado", -1); toast("Venta confirmada ✓ inventario descontado"); }
      else if (d.undo) { if (!confirm("¿Anular esta venta? Las unidades vuelven al inventario.")) return; await moverInventario(d.undo, "confirmado", "cancelado", +1); toast("Venta anulada, inventario devuelto"); }
      else if (d.cancel) { if (!confirm("¿Cancelar este pedido?")) return; await fs.updateDoc(fs.doc(db, "pedidos", d.cancel), { estado: "cancelado", cancelado: fs.serverTimestamp() }); toast("Pedido cancelado"); }
      else if (d.reopen) { await fs.updateDoc(fs.doc(db, "pedidos", d.reopen), { estado: "pendiente" }); toast("Pedido de nuevo pendiente"); }
      else return;
    } catch (err) {
      alert(err.message);
    }
    await cargarTodo();
    render();
  };
}

/* Descuenta (signo -1) o devuelve (+1) inventario de forma segura en una transacción */
async function moverInventario(id, desde, hacia, signo) {
  await fs.runTransaction(db, async (tx) => {
    const pref = fs.doc(db, "pedidos", id);
    const ps = await tx.get(pref);
    if (!ps.exists() || ps.data().estado !== desde) throw new Error("Este pedido cambió de estado. Recarga la página.");
    const items = ps.data().items || [];
    const ids = [...new Set(items.map((i) => i.id))];
    const snaps = {};
    for (const pid of ids) snaps[pid] = await tx.get(fs.doc(db, "productos", pid));
    const stocks = {};
    const falta = [];
    for (const i of items) {
      const s = snaps[i.id];
      if (!s.exists()) { if (signo < 0) falta.push(`${i.nombre}: el producto ya no existe`); continue; }
      stocks[i.id] = stocks[i.id] || { ...(s.data().stock || {}) };
      const actual = Number(stocks[i.id][i.talla] || 0);
      const nuevo = actual + signo * i.cantidad;
      if (nuevo < 0) falta.push(`${i.nombre} talla ${i.talla}: hay ${actual}, pide ${i.cantidad}`);
      stocks[i.id][i.talla] = nuevo;
    }
    if (falta.length) throw new Error("No hay suficiente inventario:\n" + falta.join("\n"));
    for (const pid of Object.keys(stocks)) tx.update(fs.doc(db, "productos", pid), { stock: stocks[pid] });
    tx.update(pref, { estado: hacia, [hacia === "confirmado" ? "confirmado" : "cancelado"]: fs.serverTimestamp() });
  });
}

/* ===================== PRODUCTOS ===================== */
function renderProductos() {
  if (!productos.length) {
    $("#view").innerHTML = `<div class="panel"><h2 style="font:500 22px var(--serif);margin:0 0 8px">Tu catálogo está vacío</h2>
      <p class="muted">Carga los ${LOCAL.productos.length} productos actuales de la página para empezar. Después podrás poner el inventario de cada talla.</p>
      <button class="btn btn-primary" id="import" type="button">Cargar catálogo actual</button></div>`;
    $("#import").onclick = importar;
    return;
  }
  $("#view").innerHTML = `
    <div class="row-btns" style="margin:4px 0 14px"><button class="btn btn-primary" type="button" id="nuevo">+ Agregar producto</button></div>
    <div class="plist">${productos.map((p) => {
      const tot = stockTotal(p);
      const pill = p.visible === false ? '<span class="pill hid">Oculto</span>' : tot <= 0 ? '<span class="pill out">Agotado</span>' : `<span class="pill">${tot} und.</span>`;
      return `<button class="prow" type="button" data-edit="${esc(p.id)}"><img src="${esc(p.imagen)}" alt="" loading="lazy" />
        <span><strong>${esc(p.nombre)}</strong><small>${money(p.precio)} · ${tallasDe(p, cfg).map((t) => `${esc(t)}: ${Number((p.stock || {})[t] || 0)}`).join(" · ")}</small></span>${pill}</button>`;
    }).join("")}</div>`;
  $("#nuevo").onclick = () => { editando = "nuevo"; render(); };
  $("#view").querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => { editando = b.dataset.edit; render(); }));
}

async function importar() {
  const btn = $("#import");
  btn.disabled = true;
  btn.textContent = "Cargando…";
  const batch = fs.writeBatch(db);
  const conf = JSON.parse(JSON.stringify(LOCAL));
  delete conf.productos;
  batch.set(fs.doc(db, "tienda", "config"), conf, { merge: true });
  LOCAL.productos.forEach((p, i) => {
    const t = p.tallas && p.tallas.length ? p.tallas : LOCAL.tallas;
    const { disponible, id, ...rest } = p;
    batch.set(fs.doc(db, "productos", id), { ...rest, orden: i, visible: true, stock: Object.fromEntries(t.map((x) => [x, 0])) });
  });
  await batch.commit();
  await cargarTodo();
  toast("Catálogo cargado ✓ Ahora pon el inventario de cada producto", 4000);
  render();
}

function renderEditor() {
  const nuevo = editando === "nuevo";
  const p = nuevo
    ? { nombre: "", categoria: "Conjuntos", precio: 0, precioAntes: 0, piezas: "", colores: [{ nombre: "", hex: "#f39bc0" }], tallas: [], imagen: "", visible: true, nuevo: true, stock: {} }
    : JSON.parse(JSON.stringify(productos.find((x) => x.id === editando)));
  p.stock = p.stock || {};
  const cats = [...new Set(["Conjuntos", "Batolas", "Enterizos", "Sets", ...productos.map((x) => x.categoria)])];

  function stockHtml() {
    return tallasDe(p, cfg).map((t) => `<div class="stock-cell"><b>Talla ${esc(t)}</b><div class="stepper">
      <button type="button" data-step="${esc(t)}" data-d="-1" aria-label="Menos talla ${esc(t)}">−</button>
      <input type="number" inputmode="numeric" min="0" step="1" value="${Number(p.stock[t] || 0)}" data-stock="${esc(t)}" aria-label="Unidades talla ${esc(t)}" />
      <button type="button" data-step="${esc(t)}" data-d="1" aria-label="Más talla ${esc(t)}">+</button></div></div>`).join("");
  }
  function coloresHtml() {
    return p.colores.map((c, j) => `<div class="crow"><input type="color" value="${esc(c.hex)}" data-chex="${j}" aria-label="Color" />
      <input type="text" value="${esc(c.nombre)}" placeholder="Nombre del color" data-cname="${j}" />
      <button class="btn btn-ghost small" type="button" data-cdel="${j}" aria-label="Quitar color">✕</button></div>`).join("");
  }

  $("#view").innerHTML = `
    <button class="back" type="button" id="volver">← Volver a productos</button>
    <form class="form" id="pform" novalidate>
      <div class="panel">
        <div class="photo"><img id="e-img" src="${esc(p.imagen)}" alt="" />
          <div><label class="btn btn-ghost small" style="display:inline-flex">📷 ${p.imagen ? "Cambiar foto" : "Subir foto"}<input type="file" accept="image/*" id="e-file" hidden /></label>
          <p class="muted" style="margin:8px 0 0">Usa fotos tuyas o con permiso del proveedor.</p></div></div>
      </div>
      <div class="panel grid2">
        <div class="field"><label>Nombre</label><input id="e-nombre" value="${esc(p.nombre)}" maxlength="80" required /></div>
        <div class="field"><label>Categoría</label><input id="e-cat" value="${esc(p.categoria)}" list="cats" /><datalist id="cats">${cats.map((c) => `<option value="${esc(c)}">`).join("")}</datalist></div>
        <div class="field"><label>Precio (sin puntos)</label><input id="e-precio" type="number" inputmode="numeric" min="0" value="${Number(p.precio) || ""}" placeholder="45000" /><p class="hint" id="e-precio-v">${money(p.precio)}</p></div>
        <div class="field"><label>Precio antes (oferta, 0 = no)</label><input id="e-antes" type="number" inputmode="numeric" min="0" value="${Number(p.precioAntes) || 0}" /></div>
        <div class="field" style="grid-column:1/-1"><label>Qué incluye</label><input id="e-piezas" value="${esc(p.piezas)}" placeholder="Camiseta + short" /></div>
      </div>
      <div class="panel">
        <h3 style="margin:0 0 4px">Inventario por talla</h3>
        <p class="muted" style="margin:0 0 12px">Unidades que tienes hoy. Se descuentan solas al confirmar cada venta.</p>
        <div class="stock-grid" id="e-stock">${stockHtml()}</div>
        <div class="field" style="margin-top:12px"><label>Tallas de este producto</label><input id="e-tallas" value="${esc((p.tallas || []).join(", "))}" placeholder="Vacío = ${esc(cfg.tallas.join(", "))}" /><p class="hint">Sepáralas con coma. Ej: S, M, L o Única</p></div>
      </div>
      <div class="panel">
        <h3 style="margin:0 0 10px">Colores</h3>
        <div class="colors" id="e-colores">${coloresHtml()}</div>
        <button class="btn btn-ghost small" type="button" id="e-addc" style="margin-top:10px">+ Agregar color</button>
      </div>
      <div class="panel" style="display:flex;flex-direction:column;gap:12px">
        <label class="toggle"><input type="checkbox" id="e-visible" ${p.visible !== false ? "checked" : ""} /> Mostrar en la tienda</label>
        <label class="toggle"><input type="checkbox" id="e-nuevo" ${p.nuevo ? "checked" : ""} /> Etiqueta “Nuevo”</label>
      </div>
      <p class="form-error" id="e-err" role="alert"></p>
      <div class="row-btns">
        <button class="btn btn-primary" type="submit" id="e-save" style="flex:1">Guardar cambios</button>
        ${nuevo ? "" : `<button class="btn btn-ghost small" type="button" id="e-up">↑ Subir en el catálogo</button><button class="btn btn-ghost small danger" type="button" id="e-del">Eliminar producto</button>`}
      </div>
    </form>`;

  const v = $("#view");
  $("#volver").onclick = () => { editando = null; render(); };
  $("#e-precio").oninput = (e) => ($("#e-precio-v").textContent = money(e.target.value));
  $("#e-tallas").onchange = (e) => {
    p.tallas = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
    $("#e-stock").innerHTML = stockHtml();
  };
  v.oninput = (e) => {
    const d = e.target.dataset;
    if (d.stock !== undefined) p.stock[d.stock] = Math.max(0, parseInt(e.target.value || "0", 10) || 0);
    if (d.chex !== undefined) p.colores[+d.chex].hex = e.target.value;
    if (d.cname !== undefined) p.colores[+d.cname].nombre = e.target.value;
  };
  v.onclick = (e) => {
    const d = e.target.dataset;
    if (d.step !== undefined) {
      p.stock[d.step] = Math.max(0, Number(p.stock[d.step] || 0) + Number(d.d));
      v.querySelector(`[data-stock="${CSS.escape(d.step)}"]`).value = p.stock[d.step];
    } else if (d.cdel !== undefined) {
      p.colores.splice(+d.cdel, 1);
      $("#e-colores").innerHTML = coloresHtml();
    }
  };
  $("#e-addc").onclick = () => { p.colores.push({ nombre: "", hex: "#f39bc0" }); $("#e-colores").innerHTML = coloresHtml(); };
  $("#e-file").onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      p.imagen = await comprimir(f);
      $("#e-img").src = p.imagen;
      toast("Foto lista. Toca “Guardar cambios”.");
    } catch (err) { alert("No se pudo leer la foto. Prueba con otra."); }
  };

  $("#pform").onsubmit = async (e) => {
    e.preventDefault();
    const err = $("#e-err");
    const data = {
      nombre: $("#e-nombre").value.trim(),
      categoria: $("#e-cat").value.trim() || "Conjuntos",
      precio: Math.max(0, parseInt($("#e-precio").value || "0", 10) || 0),
      precioAntes: Math.max(0, parseInt($("#e-antes").value || "0", 10) || 0),
      piezas: $("#e-piezas").value.trim(),
      tallas: p.tallas || [],
      colores: p.colores.filter((c) => c.nombre.trim()),
      imagen: p.imagen,
      visible: $("#e-visible").checked,
      nuevo: $("#e-nuevo").checked,
    };
    const t = tallasDe(data, cfg);
    data.stock = Object.fromEntries(t.map((x) => [x, Math.max(0, Number(p.stock[x] || 0))]));
    if (!data.nombre) { err.textContent = "Ponle un nombre al producto."; return; }
    if (!data.precio) { err.textContent = "Escribe el precio."; return; }
    if (!data.imagen) { err.textContent = "Sube una foto."; return; }
    if (!data.colores.length) { err.textContent = "Agrega al menos un color con nombre."; return; }
    const btn = $("#e-save");
    btn.disabled = true;
    btn.textContent = "Guardando…";
    try {
      if (nuevo) {
        data.orden = productos.length ? Math.max(...productos.map((x) => x.orden ?? 0)) + 1 : 0;
        const id = slug(data.nombre);
        await fs.setDoc(fs.doc(db, "productos", id), data);
      } else {
        await fs.updateDoc(fs.doc(db, "productos", editando), data);
      }
      await cargarTodo();
      toast("Guardado ✓ Ya se ve en la tienda");
      editando = null;
      render();
    } catch (e2) {
      err.textContent = "No se pudo guardar: " + (e2.code === "permission-denied" ? "sin permiso." : e2.message);
      btn.disabled = false;
      btn.textContent = "Guardar cambios";
    }
  };

  if (!nuevo) {
    $("#e-del").onclick = async () => {
      if (!confirm(`¿Eliminar “${p.nombre}” de la tienda? Esto no se puede deshacer. (Si solo está agotado, mejor deja el inventario en 0 o desmarca “Mostrar en la tienda”.)`)) return;
      await fs.deleteDoc(fs.doc(db, "productos", editando));
      await cargarTodo();
      toast("Producto eliminado");
      editando = null;
      render();
    };
    $("#e-up").onclick = async () => {
      const i = productos.findIndex((x) => x.id === editando);
      if (i <= 0) return toast("Ya es el primero");
      const a = productos[i], b = productos[i - 1];
      const batch = fs.writeBatch(db);
      batch.update(fs.doc(db, "productos", a.id), { orden: b.orden ?? i - 1 });
      batch.update(fs.doc(db, "productos", b.id), { orden: a.orden ?? i });
      await batch.commit();
      await cargarTodo();
      toast("Movido hacia arriba ✓");
    };
  }
}

function slug(s) {
  const base = s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "producto";
  return base + "-" + Date.now().toString(36).slice(-4);
}

/* Reduce la foto a máx. 800 px para que cargue rápido y quepa en la base de datos */
function comprimir(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 800;
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      let out = c.toDataURL("image/webp", 0.8);
      if (!out.startsWith("data:image/webp")) out = c.toDataURL("image/jpeg", 0.82);
      if (out.length > 900000) out = c.toDataURL("image/jpeg", 0.6);
      resolve(out);
    };
    img.onerror = reject;
    img.src = url;
  });
}

/* ===================== TIENDA ===================== */
function renderTienda() {
  const f = (label, path, type = "text", hint = "") => {
    const val = path.split(".").reduce((o, k) => (o ? o[k] : ""), cfg);
    const v = Array.isArray(val) ? val.join(", ") : val ?? "";
    return `<div class="field"><label>${label}</label>${type === "textarea" ? `<textarea data-p="${path}">${esc(v)}</textarea>` : `<input type="${type}" data-p="${path}" data-list="${Array.isArray(val)}" value="${esc(v)}" />`}${hint ? `<p class="hint">${hint}</p>` : ""}</div>`;
  };
  $("#view").innerHTML = `
    <form id="tform" class="form">
      <div class="panel"><h3 style="margin:0 0 10px">Marca y WhatsApp</h3><div class="grid2">
        ${f("Nombre de la marca", "marca.nombre")}${f("Lema", "marca.lema")}
        ${f("Descripción", "marca.descripcion", "textarea")}${f("Mensaje de envío", "marca.envio", "textarea")}
        ${f("WhatsApp (con 57, solo números)", "whatsapp", "tel", "Ej: 573145026686")}${f("WhatsApp como se muestra", "whatsappVisible")}
        ${f("Medios de pago (separados por coma)", "pagos")}${f("Nota de pagos", "notaPagos")}
        ${f("Instagram (enlace, opcional)", "marca.instagram", "url")}${f("Tallas generales (separadas por coma)", "tallas")}
      </div></div>
      <div class="panel"><h3 style="margin:0 0 10px">Datos legales</h3><div class="grid2">
        ${f("Nombre o razón social", "legal.responsable")}${f("C.C. o NIT", "legal.documento")}
        ${f("Ciudad", "legal.ciudad")}${f("Dirección de notificaciones", "legal.direccion")}
        ${f("Correo PQRS / datos", "legal.correo", "email")}${f("Teléfono", "legal.telefono", "tel")}
        ${f("Tiempo de entrega", "legal.diasEntrega")}${f("Costo de envío", "legal.costoEnvio")}
        ${f("Garantía (meses)", "legal.garantiaMeses", "number")}${f("Vigencia de políticas", "legal.vigencia", "date")}
        ${f("Versión términos", "legal.versionTerminos", "text", "Súbela (1.0 → 1.1) si cambias el texto de los términos")}${f("Versión privacidad", "legal.versionPrivacidad", "text", "Súbela si cambias la política de privacidad")}
      </div></div>
      <button class="btn btn-primary" type="submit" id="t-save">Guardar datos de la tienda</button>
    </form>`;
  $("#tform").onsubmit = async (e) => {
    e.preventDefault();
    const next = JSON.parse(JSON.stringify(cfg));
    $("#tform").querySelectorAll("[data-p]").forEach((el) => {
      const keys = el.dataset.p.split(".");
      const last = keys.pop();
      const obj = keys.reduce((o, k) => (o[k] = o[k] || {}), next);
      let v = el.value.trim();
      if (el.dataset.list === "true") v = v.split(",").map((s) => s.trim()).filter(Boolean);
      else if (el.type === "number") v = Number(v) || 0;
      obj[last] = v;
    });
    if (!/^57\d{10}$/.test(next.whatsapp)) { alert("El WhatsApp debe ser 57 seguido de los 10 dígitos del celular. Ej: 573145026686"); return; }
    $("#t-save").disabled = true;
    try {
      await fs.setDoc(fs.doc(db, "tienda", "config"), next);
      cfg = next;
      toast("Datos de la tienda guardados ✓");
    } catch (err) { alert("No se pudo guardar: " + err.message); }
    $("#t-save").disabled = false;
  };
}
