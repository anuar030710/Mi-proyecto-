/* Código compartido por todas las páginas: encabezado, pie de página,
   datos legales, enlaces de WhatsApp y registro de consentimiento.
   No necesitas editar este archivo: todo se cambia en config.js. */
(function () {
  const cfg = window.SALMA_CONFIG;
  const $ = (s, r = document) => r.querySelector(s);

  const get = (path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), cfg);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => "$" + Number(n || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 });
  const waLink = (text) => "https://wa.me/" + cfg.whatsapp + (text ? "?text=" + encodeURIComponent(text) : "");

  const waIcon =
    '<svg viewBox="0 0 32 32" aria-hidden="true" fill="currentColor"><path d="M16 3C9 3 3.3 8.6 3.3 15.6c0 2.2.6 4.4 1.7 6.3L3 29l7.3-1.9c1.8 1 3.8 1.5 5.8 1.5 7 0 12.7-5.7 12.7-12.6S23 3 16 3zm0 23.2c-1.9 0-3.7-.5-5.3-1.4l-.4-.2-4.3 1.1 1.2-4.2-.3-.4a10.4 10.4 0 0 1-1.6-5.5C5.3 9.8 10.1 5.1 16 5.1S26.7 9.8 26.7 15.6 21.9 26.2 16 26.2zm5.8-7.8c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2l-1 1.2c-.2.2-.4.2-.7.1a8.6 8.6 0 0 1-4.3-3.7c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.4 3.6 5.7 5 2.1.9 2.9 1 4 .8.6-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5-.1-.1-.3-.2-.6-.3z"/></svg>';

  function header() {
    const el = $("#site-header");
    if (!el) return;
    const isHome = document.body.dataset.page === "home";
    el.innerHTML = `
      <p class="config-warn" id="config-warn" hidden>Faltan datos legales por completar en <code>config.js</code> (nombre, documento, dirección, correo). Complétalos antes de publicar la página.</p>
      <header class="top"><div class="wrap">
        <a class="logo" href="index.html">Inspirato <span>Salma</span></a>
        <nav aria-label="Principal">
          <a class="link" href="${isHome ? "" : "index.html"}#catalogo">Catálogo</a>
          <a class="link" href="${isHome ? "" : "index.html"}#como-comprar">Cómo comprar</a>
          ${isHome ? '<button class="bag-btn" id="bag-open" type="button" aria-haspopup="dialog">Bolsa <span class="bag-count" id="bag-count">0</span></button>' : '<a class="btn btn-wa" style="padding:9px 16px;font-size:15px" target="_blank" rel="noopener" href="' + waLink("Hola Inspirato Salma ✨") + '">WhatsApp</a>'}
        </nav>
      </div></header>`;
  }

  function footer() {
    const el = $("#site-footer");
    if (!el) return;
    const L = cfg.legal;
    el.innerHTML = `
      <footer><div class="wrap">
        <div class="cols">
          <div>
            <a class="logo" href="index.html">Inspirato <span>Salma</span></a>
            <p>${esc(cfg.marca.descripcion)}</p>
            <p>Escríbenos: <a target="_blank" rel="noopener" href="${waLink("Hola Inspirato Salma ✨")}">${esc(cfg.whatsappVisible)}</a></p>
          </div>
          <div>
            <h4>Legal</h4>
            <ul>
              <li><a href="terminos.html">Términos y condiciones</a></li>
              <li><a href="privacidad.html">Política de privacidad</a></li>
              <li><a href="cookies.html">Política de cookies</a></li>
              <li><a href="reembolsos.html">Cambios, devoluciones y reembolsos</a></li>
            </ul>
          </div>
          <div>
            <h4>Atención</h4>
            <ul>
              <li>PQRS: <a href="mailto:${esc(L.correo)}">${esc(L.correo)}</a></li>
              <li><a href="https://www.sic.gov.co" target="_blank" rel="noopener">Superintendencia de Industria y Comercio</a></li>
              ${cfg.marca.instagram ? `<li><a href="${esc(cfg.marca.instagram)}" target="_blank" rel="noopener">Instagram</a></li>` : ""}
            </ul>
          </div>
        </div>
        <p class="legal-id">© ${new Date().getFullYear()} ${esc(cfg.marca.nombre)} · Responsable: ${esc(L.responsable)} · ${esc(L.documento)} · ${esc(L.ciudad)}. Precios en pesos colombianos (COP) con impuestos incluidos.</p>
      </div></footer>
      <a class="wa-float" href="${waLink("Hola Inspirato Salma ✨ quiero información")}" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">${waIcon}</a>`;
  }

  function fillData() {
    document.querySelectorAll("[data-cfg]").forEach((n) => {
      const v = get(n.dataset.cfg);
      if (v != null) n.textContent = Array.isArray(v) ? v.join(", ") : v;
    });
    document.querySelectorAll("[data-mail]").forEach((n) => { n.href = "mailto:" + cfg.legal.correo; n.textContent = cfg.legal.correo; });
    document.querySelectorAll("[data-wa]").forEach((n) => { n.href = waLink(n.dataset.wa || ""); n.target = "_blank"; n.rel = "noopener"; });
    const missing = Object.values(cfg.legal).some((v) => typeof v === "string" && v.includes("[COMPLETAR"));
    const w = $("#config-warn");
    if (w) w.hidden = !missing;
  }

  /* ---------- Registro de consentimiento ---------- */
  const LOG_KEY = "salma_consentimientos";
  function newId() {
    const a = new Uint8Array(4);
    (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => (a[i] = Math.random() * 256));
    return "SAL-" + Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  function recordConsent(rec) {
    const full = Object.assign({ id: newId(), fecha: new Date().toISOString(), pagina: location.pathname.split("/").pop() || "index.html" }, rec);
    try {
      const log = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
      log.push(full);
      localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-20)));
    } catch (e) { /* almacenamiento no disponible: el registro sigue yendo en el mensaje de WhatsApp */ }
    if (cfg.urlRegistroConsentimiento) {
      try {
        fetch(cfg.urlRegistroConsentimiento, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(full), keepalive: true });
      } catch (e) { /* sin conexión: queda en WhatsApp */ }
    }
    return full;
  }
  const fechaCO = (iso) => new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" });

  window.Salma = { cfg, $, esc, money, waLink, recordConsent, fechaCO, waIcon };

  header();
  footer();
  fillData();
})();
