#!/usr/bin/env node
/**
 * Sole Store — Generador de imágenes de producto (SVG).
 *
 * Por qué existe: las imágenes de ejemplo se dibujan aquí, con código propio,
 * para que la tienda NO use fotos de terceros sin licencia. Cada imagen que
 * produce este script es una obra creada para este proyecto (ver
 * docs/DERECHOS-IMAGENES.md).
 *
 * Uso:  node scripts/generate-images.js
 * Lee:  public/data/products.json   (campo "shape" y "tones" de cada producto)
 * Crea: public/assets/img/products/{slug}-1.svg  (producto)
 *       public/assets/img/products/{slug}-2.svg  (producto + muestras de tono)
 *       public/assets/img/products/{slug}-3.svg  (textura de cerca)
 *       public/assets/img/hero.svg, public/assets/img/og-image.svg
 *
 * Cuando tengas fotos reales, reemplaza las rutas en products.json y ya no
 * necesitas este script.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'public');
const OUT = path.join(ROOT, 'assets', 'img', 'products');
const { products } = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'products.json'), 'utf8'));

const GOLD = ['#F3E2B3', '#D8B66A', '#B08A3E'];
const ROSE_HANDLE = ['#F6E1DE', '#E6BDB8', '#C9938D'];
let uid = 0;
const id = (p) => `${p}${++uid}`;

/* ---------- utilidades de color ---------- */
function shade(hex, pct) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = pct < 0 ? 0 : 255, p = Math.abs(pct);
  r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function linear(stops, x2 = '1', y2 = '0') {
  const gid = id('g');
  const s = stops.map((c, i) => `<stop offset="${(i / (stops.length - 1)) * 100}%" stop-color="${c}"/>`).join('');
  return { gid, def: `<linearGradient id="${gid}" x1="0" y1="0" x2="${x2}" y2="${y2}">${s}</linearGradient>` };
}
function radial(stops) {
  const gid = id('r');
  const s = stops.map((c, i) => `<stop offset="${(i / (stops.length - 1)) * 100}%" stop-color="${c}"/>`).join('');
  return { gid, def: `<radialGradient id="${gid}" cx="40%" cy="35%" r="70%">${s}</radialGradient>` };
}
const goldGrad = () => linear([GOLD[2], GOLD[0], GOLD[1], GOLD[2]]);

/* ---------- fondo común (rosa palo + destellos dorados) ---------- */
function background(defs, variant = 0) {
  const bg = linear(variant ? ['#FFF8F6', '#F6E3E0'] : ['#FBEFEC', '#F2D8D4'], '0', '1');
  defs.push(bg.def);
  return `<rect width="800" height="1000" fill="url(#${bg.gid})"/>
  <circle cx="${variant ? 640 : 160}" cy="210" r="150" fill="#FFFFFF" opacity=".45"/>
  <circle cx="${variant ? 150 : 650}" cy="760" r="210" fill="#EBC9C4" opacity=".35"/>
  <circle cx="610" cy="170" r="6" fill="${GOLD[1]}" opacity=".7"/>
  <circle cx="200" cy="820" r="4" fill="${GOLD[1]}" opacity=".7"/>
  <ellipse cx="400" cy="905" rx="230" ry="26" fill="#B98580" opacity=".18"/>`;
}

/* ---------- formas de producto (dibujadas en un lienzo de 800x1000) ---------- */
const shapes = {
  lipstick(defs, c) {
    const g = goldGrad(); const b = linear([shade(c, -0.25), c, shade(c, 0.15), shade(c, -0.2)]);
    defs.push(g.def, b.def);
    return `<rect x="320" y="600" width="160" height="290" rx="12" fill="url(#${g.gid})"/>
    <rect x="320" y="588" width="160" height="26" rx="4" fill="${GOLD[2]}"/>
    <rect x="342" y="455" width="116" height="140" rx="6" fill="url(#${g.gid})" opacity=".9"/>
    <path d="M352 458 L352 320 Q352 292 380 276 L448 238 L448 458 Z" fill="url(#${b.gid})"/>
    <path d="M366 452 L366 318 Q368 300 384 290 L392 286 L392 452 Z" fill="#fff" opacity=".22"/>
    <rect x="340" y="640" width="14" height="230" rx="7" fill="#fff" opacity=".35"/>
    <text x="400" y="760" text-anchor="middle" font-family="Georgia, serif" font-size="22" letter-spacing="6" fill="#7A5A22">SOLE</text>`;
  },
  gloss(defs, c) {
    const g = goldGrad(); const b = linear([shade(c, -0.15), shade(c, 0.25), c]);
    defs.push(g.def, b.def);
    return `<rect x="345" y="340" width="110" height="550" rx="48" fill="url(#${b.gid})" opacity=".92"/>
    <rect x="362" y="380" width="18" height="470" rx="9" fill="#fff" opacity=".45"/>
    <rect x="352" y="150" width="96" height="205" rx="16" fill="url(#${g.gid})"/>
    <rect x="352" y="335" width="96" height="16" fill="${GOLD[2]}"/>
    <rect x="364" y="170" width="12" height="160" rx="6" fill="#fff" opacity=".4"/>`;
  },
  foundation(defs, c) {
    const g = goldGrad(); const b = linear([shade(c, -0.18), shade(c, 0.12), c, shade(c, -0.12)]);
    defs.push(g.def, b.def);
    return `<rect x="270" y="430" width="260" height="460" rx="34" fill="url(#${b.gid})"/>
    <rect x="270" y="430" width="260" height="460" rx="34" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="6"/>
    <rect x="292" y="460" width="22" height="400" rx="11" fill="#fff" opacity=".35"/>
    <rect x="360" y="370" width="80" height="66" fill="url(#${g.gid})"/>
    <rect x="330" y="300" width="140" height="74" rx="14" fill="url(#${g.gid})"/>
    <rect x="462" y="318" width="70" height="20" rx="8" fill="${GOLD[2]}"/>
    <rect x="320" y="640" width="160" height="110" rx="6" fill="#fff" opacity=".82"/>
    <text x="400" y="688" text-anchor="middle" font-family="Georgia, serif" font-size="24" letter-spacing="5" fill="#5B4330">AUREA</text>
    <text x="400" y="722" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" letter-spacing="3" fill="#8A6A4A">SEGUNDA PIEL</text>`;
  },
  stick(defs, c) {
    const g = linear(['#2E2427', '#4A3B3F', '#2E2427']); const b = linear([shade(c, -0.2), c, shade(c, 0.15)]);
    defs.push(g.def, b.def);
    return `<rect x="300" y="520" width="200" height="370" rx="20" fill="url(#${g.gid})"/>
    <rect x="300" y="505" width="200" height="22" fill="${GOLD[1]}"/>
    <path d="M318 508 L318 330 Q318 300 348 296 L482 286 L482 508 Z" fill="url(#${b.gid})"/>
    <rect x="332" y="320" width="20" height="180" rx="10" fill="#fff" opacity=".25"/>
    <text x="400" y="720" text-anchor="middle" font-family="Georgia, serif" font-size="20" letter-spacing="5" fill="${GOLD[0]}">VELVET</text>`;
  },
  compact(defs, c, opts = {}) {
    const g = goldGrad(); const p = radial(opts.shimmer
      ? ['#FFFFFF', shade(c, 0.3), c, shade(c, -0.15)]
      : [shade(c, 0.25), c, shade(c, -0.12)]);
    defs.push(g.def, p.def);
    const petals = opts.shimmer
      ? `<circle cx="400" cy="590" r="150" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3"/>
         <circle cx="400" cy="590" r="100" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="3"/>
         <circle cx="400" cy="590" r="50" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="3"/>`
      : [0, 60, 120, 180, 240, 300].map((a) => `<ellipse cx="400" cy="520" rx="38" ry="70" fill="#fff" opacity=".13" transform="rotate(${a} 400 590)"/>`).join('');
    return `<circle cx="400" cy="600" r="250" fill="#B98580" opacity=".15"/>
    <circle cx="400" cy="590" r="245" fill="url(#${g.gid})"/>
    <circle cx="400" cy="590" r="222" fill="${GOLD[2]}" opacity=".5"/>
    <circle cx="400" cy="590" r="210" fill="url(#${p.gid})"/>
    ${petals}
    <path d="M250 470 A200 200 0 0 1 400 390" stroke="#fff" stroke-opacity=".55" stroke-width="10" fill="none" stroke-linecap="round"/>`;
  },
  highlighter(defs, c) { return shapes.compact(defs, c, { shimmer: true }); },
  dropper(defs, c) {
    const g = goldGrad(); const b = linear([shade(c, -0.2), shade(c, 0.2), c]);
    defs.push(g.def, b.def);
    return `<rect x="300" y="500" width="200" height="390" rx="40" fill="url(#${b.gid})" opacity=".95"/>
    <rect x="318" y="530" width="20" height="320" rx="10" fill="#fff" opacity=".4"/>
    <rect x="345" y="430" width="110" height="80" rx="8" fill="url(#${g.gid})"/>
    <path d="M360 430 L360 300 Q360 250 400 250 Q440 250 440 300 L440 430 Z" fill="#F7E4E1"/>
    <path d="M372 420 L372 305 Q372 270 392 264" stroke="#fff" stroke-width="8" fill="none" opacity=".6"/>
    <text x="400" y="720" text-anchor="middle" font-family="Georgia, serif" font-size="22" letter-spacing="6" fill="#fff">TINT</text>`;
  },
  palette(defs, c, tone) {
    const g = goldGrad(); defs.push(g.def);
    const colors = (tone && tone.palette) || Array(12).fill(c);
    const pans = colors.map((col, i) => {
      const x = 205 + (i % 4) * 130, y = 420 + Math.floor(i / 4) * 130;
      const pr = radial([shade(col, 0.25), col, shade(col, -0.15)]); defs.push(pr.def);
      return `<rect x="${x - 50}" y="${y - 50}" width="100" height="100" rx="14" fill="url(#${pr.gid})" stroke="${GOLD[2]}" stroke-opacity=".4" stroke-width="3"/>`;
    }).join('');
    return `<rect x="120" y="300" width="560" height="500" rx="30" fill="#2D2326"/>
    <rect x="120" y="300" width="560" height="500" rx="30" fill="none" stroke="url(#${g.gid})" stroke-width="8"/>
    <text x="400" y="352" text-anchor="middle" font-family="Georgia, serif" font-size="24" letter-spacing="8" fill="${GOLD[0]}">LUMIÈRE ROSE</text>
    ${pans}`;
  },
  mascara(defs, c) {
    const g = goldGrad(); const t = linear(['#1D1719', '#3B2F33', '#1D1719']);
    defs.push(g.def, t.def);
    const bristles = Array.from({ length: 26 }, (_, i) => {
      const y = 300 + i * 9;
      return `<line x1="${560 - 24}" y1="${y}" x2="${560 + 24}" y2="${y + 4}" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`;
    }).join('');
    return `<g transform="rotate(-8 400 560)">
      <rect x="300" y="380" width="74" height="520" rx="32" fill="url(#${t.gid})"/>
      <rect x="300" y="230" width="74" height="160" rx="12" fill="url(#${g.gid})"/>
      <rect x="312" y="410" width="12" height="440" rx="6" fill="#fff" opacity=".18"/>
      <text x="337" y="680" text-anchor="middle" transform="rotate(-90 337 680)" font-family="Georgia, serif" font-size="22" letter-spacing="6" fill="${GOLD[0]}">VOLUMEN</text>
    </g>
    <g transform="rotate(10 560 520)">
      <rect x="530" y="510" width="60" height="330" rx="12" fill="url(#${g.gid})"/>
      <rect x="555" y="300" width="10" height="220" fill="#555"/>
      ${bristles}
    </g>`;
  },
  liner(defs, c) {
    const g = goldGrad(); const t = linear(['#1D1719', '#40343A', '#1D1719']);
    defs.push(g.def, t.def);
    return `<g transform="rotate(-25 400 560)">
      <rect x="370" y="300" width="60" height="560" rx="28" fill="url(#${t.gid})"/>
      <rect x="370" y="430" width="60" height="18" fill="url(#${g.gid})"/>
      <rect x="380" y="320" width="10" height="520" rx="5" fill="#fff" opacity=".18"/>
      <path d="M380 300 L400 210 L420 300 Z" fill="${c}"/>
      <rect x="372" y="290" width="56" height="16" fill="${GOLD[1]}"/>
    </g>
    <path d="M520 760 Q600 700 690 680" stroke="${c}" stroke-width="10" fill="none" stroke-linecap="round" opacity=".85"/>`;
  },
  brush(defs, x, y, rot, len, headW, headH, bristle) {
    const g = goldGrad(); const h = linear(ROSE_HANDLE); const br = linear([bristle, shade(bristle, 0.5)], '0', '1');
    defs.push(g.def, h.def, br.def);
    return `<g transform="translate(${x} ${y}) rotate(${rot})">
      <path d="M${-headW / 2} 0 Q${-headW / 2} ${-headH} 0 ${-headH - 18} Q${headW / 2} ${-headH} ${headW / 2} 0 Z" fill="url(#${br.gid})"/>
      <rect x="${-headW / 2 + 4}" y="0" width="${headW - 8}" height="70" rx="6" fill="url(#${g.gid})"/>
      <path d="M${-headW / 2 + 8} 70 L${headW / 2 - 8} 70 L8 ${70 + len} L-8 ${70 + len} Z" fill="url(#${h.gid})"/>
    </g>`;
  },
  brushset(defs) {
    return [
      shapes.brush(defs, 250, 520, -24, 300, 70, 110, '#3A2A2E'),
      shapes.brush(defs, 330, 470, -12, 330, 90, 120, '#5A4044'),
      shapes.brush(defs, 400, 440, 0, 360, 110, 140, '#3A2A2E'),
      shapes.brush(defs, 470, 470, 12, 330, 60, 120, '#5A4044'),
      shapes.brush(defs, 550, 520, 24, 300, 46, 90, '#3A2A2E'),
    ].join('');
  },
  kabuki(defs) {
    const g = goldGrad(); const h = linear(['#5B3F33', '#8A6250', '#5B3F33']); const br = linear(['#F4E1DD', '#C99891'], '0', '1');
    defs.push(g.def, h.def, br.def);
    return `<ellipse cx="400" cy="470" rx="200" ry="190" fill="url(#${br.gid})"/>
    <path d="M250 520 Q400 600 550 520" stroke="#fff" stroke-opacity=".3" stroke-width="6" fill="none"/>
    <rect x="270" y="580" width="260" height="110" rx="18" fill="url(#${g.gid})"/>
    <rect x="290" y="685" width="220" height="200" rx="40" fill="url(#${h.gid})"/>
    <rect x="300" y="600" width="18" height="70" rx="9" fill="#fff" opacity=".45"/>`;
  },
};

/* ---------- vistas ---------- */
function svg(defs, body, label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000" role="img" aria-label="${label}">
<defs>${defs.join('')}</defs>
${body}
</svg>\n`;
}

function viewMain(p) {
  const defs = []; const tone = p.tones[0]; const c = tone ? tone.hex : '#C98B86';
  return svg(defs, background(defs) + shapes[p.shape](defs, c, tone), `${p.name}`);
}

function viewSwatches(p) {
  const defs = []; const tones = p.tones.length ? p.tones : [{ hex: '#E6BDB8', name: '' }];
  const tone = tones[0];
  const product = `<g transform="translate(-40 160) scale(.62)">${shapes[p.shape](defs, tone.hex, tone)}</g>`;
  const swatches = tones.slice(0, 5).map((t, i) => {
    const y = 300 + i * 120;
    return `<path d="M480 ${y} q60 -40 150 -10 q50 18 40 50 q-10 30 -90 26 q-90 -6 -100 -66z" fill="${t.hex}"/>
      <path d="M500 ${y - 4} q60 -26 120 -8" stroke="#fff" stroke-opacity=".35" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  }).join('');
  return svg(defs, background(defs, 1) + product + swatches, `${p.name}: muestras de tono`);
}

function viewTexture(p) {
  const defs = []; const tones = p.tones.length ? p.tones : [{ hex: '#E6BDB8' }, { hex: '#C9938D' }];
  const blobs = tones.slice(0, 4).map((t, i) => {
    const r = radial([shade(t.hex, 0.35), t.hex, shade(t.hex, -0.2)]); defs.push(r.def);
    const cx = 250 + (i % 2) * 300, cy = 330 + Math.floor(i / 2) * 330;
    return `<circle cx="${cx}" cy="${cy}" r="${170 - i * 10}" fill="url(#${r.gid})"/>
      <ellipse cx="${cx - 50}" cy="${cy - 60}" rx="50" ry="22" fill="#fff" opacity=".35" transform="rotate(-30 ${cx - 50} ${cy - 60})"/>`;
  }).join('');
  return svg(defs, background(defs, 1) + blobs, `${p.name}: textura`);
}

/* ---------- ejecutar ---------- */
fs.mkdirSync(OUT, { recursive: true });
for (const p of products) {
  if (!shapes[p.shape]) throw new Error(`Forma desconocida "${p.shape}" en ${p.id}`);
  fs.writeFileSync(path.join(OUT, `${p.slug}-1.svg`), viewMain(p));
  fs.writeFileSync(path.join(OUT, `${p.slug}-2.svg`), viewSwatches(p));
  fs.writeFileSync(path.join(OUT, `${p.slug}-3.svg`), viewTexture(p));
}

/* Hero: composición horizontal (1600x1000) */
{
  const defs = [];
  const bg = linear(['#FBEFEC', '#F3DAD6', '#F8E9E6'], '1', '1'); defs.push(bg.def);
  const body = `<rect width="1600" height="1000" fill="url(#${bg.gid})"/>
  <circle cx="1150" cy="480" r="380" fill="#fff" opacity=".5"/>
  <circle cx="1150" cy="480" r="300" fill="none" stroke="${GOLD[1]}" stroke-opacity=".5" stroke-width="2"/>
  <ellipse cx="1150" cy="880" rx="420" ry="34" fill="#B98580" opacity=".18"/>
  <g transform="translate(760 140) scale(.82)">${shapes.compact(defs, '#E58C9C')}</g>
  <g transform="translate(1080 50) scale(.9)">${shapes.lipstick(defs, '#A3212F')}</g>
  <g transform="translate(1230 150) scale(.78) rotate(18 400 600)">${shapes.brush(defs, 400, 440, 0, 360, 110, 140, '#3A2A2E')}</g>
  <circle cx="900" cy="180" r="8" fill="${GOLD[1]}"/><circle cx="1450" cy="300" r="6" fill="${GOLD[1]}"/>`;
  fs.writeFileSync(path.join(ROOT, 'assets', 'img', 'hero.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000" role="img" aria-label="Labial, rubor y brocha de Sole Store"><defs>${defs.join('')}</defs>${body}</svg>\n`);
}

console.log(`Listo: ${products.length * 3} imágenes de producto + hero.svg`);
