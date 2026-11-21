// Genera las páginas legales (terminos, privacidad, cookies, reembolsos) con la misma cabecera y pie.
// Uso: node legal/build.mjs   (desde la carpeta soles). Edita el texto en legal/*.html y vuelve a correrlo.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const pages = [
  ['terminos', 'Términos y condiciones', 'Condiciones de compra de maquillaje en Soles Store por WhatsApp: precios, entrega, pagos, garantía y sorteos.'],
  ['privacidad', 'Política de privacidad', 'Cómo Soles Store trata tus datos personales según la Ley 1581 de 2012: qué datos, para qué, tus derechos y cómo ejercerlos.'],
  ['cookies', 'Política de cookies', 'Qué guarda la página de Soles Store en tu navegador y por qué no usa cookies de publicidad ni de analítica.'],
  ['reembolsos', 'Cambios y reembolsos', 'Cuándo Soles Store cambia un producto o devuelve el dinero: garantía legal, retracto y reversión del pago.'],
];

const head = (title, desc) => `<!doctype html>
<html lang="es" data-radius="soft" data-buttons="arrow">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title} | Soles Store</title>
<meta name="description" content="${desc}">
<link rel="icon" href="favicon.png" type="image/png">
<meta name="theme-color" content="#f8f0ec">
<meta name="robots" content="index, follow">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,400..700,0..100,0..1&family=Figtree:wght@400..600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/system.css">
<link rel="stylesheet" href="assets/motion/motion.css">
<link rel="stylesheet" href="legal.css">
<style>
:root {
  --p-bg: #f8f0ec; --p-surface: #f0e2dc; --p-ink: #2b1d1a; --p-muted: #6c5f5b;
  --p-accent: #7d3729; --p-accent-ink: #f8f0ec; --p-action: #7d3729; --p-action-ink: #f8f0ec;
  --font-display: "Fraunces", Georgia, serif; --font-text: "Figtree", system-ui, sans-serif;
  --display-weight: 400; --display-tracking: -0.02em; --display-axes: 'SOFT' 30, 'WONK' 0;
}
body { background: var(--bg); color: var(--ink); font-family: var(--font-text); }
</style>
</head>
<body>
<header class="legal-top">
  <div class="wrap">
    <a class="skip-link" href="#contenido">Ir al contenido</a>
    <a class="nav__logo" href="index.html"><img src="logo-soles.png" alt="" width="40" height="40">Soles Store</a>
    <a class="btn btn--primary" href="index.html#pedido">Volver a la tienda</a>
  </div>
</header>
<main id="contenido" class="legal">
  <div class="wrap">
    <article>
`;

const foot = `    </article>
  </div>
</main>
<footer class="legal-foot">
  <div class="wrap">
    <span>&copy; 2026 Soles Store, Caucasia, Antioquia</span>
    <a href="terminos.html">Términos y condiciones</a>
    <a href="privacidad.html">Privacidad</a>
    <a href="cookies.html">Cookies</a>
    <a href="reembolsos.html">Cambios y reembolsos</a>
    <a href="credits.html">Créditos de fotografías</a>
  </div>
</footer>
<script type="module" src="assets/motion/motion.js"></script>
</body>
</html>
`;

for (const [slug, title, desc] of pages) {
  const body = readFileSync(join(here, `${slug}.html`), 'utf8');
  writeFileSync(join(root, `${slug}.html`), head(title, desc) + body + foot);
  console.log('escrito', `${slug}.html`);
}
