#!/usr/bin/env node
/**
 * Soles Store — servidor local sin dependencias (solo Node.js 18+).
 *
 *   node server.js            → http://localhost:3000
 *   PORT=8080 node server.js  → otro puerto
 *
 * Hace tres cosas:
 *  1. Sirve los archivos de /public.
 *  2. POST /api/consent → agrega una línea a private/consent-log.jsonl con la prueba de cada
 *     autorización (qué, cuándo, cómo, versión del documento) + IP y hora del servidor.
 *  3. POST /api/contact → agrega el mensaje a private/contact-messages.jsonl.
 *
 * La carpeta private/ NO se publica: ni este servidor ni la web pueden leerla desde fuera.
 * En producción reemplaza los archivos .jsonl por una base de datos (ver README).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC = path.join(__dirname, 'public');
const PRIVATE = path.join(__dirname, 'private');
fs.mkdirSync(PRIVATE, { recursive: true });

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.woff2': 'font/woff2',
};

/* Cabeceras de seguridad. Si agregas Google Analytics u otro script externo, añade su dominio a script-src y connect-src. */
const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    // Firebase (y sus emuladores locales, solo para pruebas)
    "connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com http://localhost:8080 http://localhost:9099",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/* Límite simple de peticiones por IP para los endpoints (evita abuso). */
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  list.push(now); hits.set(ip, list);
  return list.length > 30;
}

function readJSON(req, limit = 20_000) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('too_large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new Error('bad_json')); } });
    req.on('error', reject);
  });
}

const send = (res, status, body, type = 'application/json; charset=utf-8') => {
  res.writeHead(status, { 'Content-Type': type, ...SECURITY_HEADERS });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};

const clientIp = (req) => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;

/** Valida lo mínimo del registro para no guardar basura. */
function validConsent(r) {
  return r && typeof r.recordId === 'string' && r.recordId.length < 80
    && typeof r.form === 'string' && Array.isArray(r.consents) && r.consents.length <= 10
    && r.consents.every((c) => typeof c.key === 'string' && typeof c.accepted === 'boolean');
}

async function handleApi(req, res, pathname) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
  if (!String(req.headers['content-type']).includes('application/json')) return send(res, 415, { error: 'json_required' });
  const ip = clientIp(req);
  if (rateLimited(ip)) return send(res, 429, { error: 'too_many_requests' });
  let body;
  try { body = await readJSON(req); } catch (e) { return send(res, e.message === 'too_large' ? 413 : 400, { error: e.message }); }

  if (pathname === '/api/consent') {
    if (!validConsent(body)) return send(res, 400, { error: 'invalid_record' });
    const entry = { ...body, serverTimestamp: new Date().toISOString(), ip, serverId: crypto.randomUUID() };
    fs.appendFileSync(path.join(PRIVATE, 'consent-log.jsonl'), `${JSON.stringify(entry)}\n`);
    return send(res, 201, { ok: true, recordId: body.recordId });
  }
  if (pathname === '/api/contact') {
    const { name, email, reason, message } = body || {};
    if (![name, email, reason, message].every((v) => typeof v === 'string' && v.length > 0 && v.length < 4000)) return send(res, 400, { error: 'invalid_message' });
    fs.appendFileSync(path.join(PRIVATE, 'contact-messages.jsonl'), `${JSON.stringify({ ...body, serverTimestamp: new Date().toISOString(), ip })}\n`);
    return send(res, 201, { ok: true });
  }
  return send(res, 404, { error: 'not_found' });
}

function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Método no permitido', 'text/plain; charset=utf-8');
  let rel = decodeURIComponent(pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(PUBLIC, rel));
  // Evita salir de /public (p. ej. /../private/consent-log.jsonl)
  if (!file.startsWith(PUBLIC + path.sep)) return send(res, 403, 'Prohibido', 'text/plain; charset=utf-8');
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      return fs.readFile(path.join(PUBLIC, '404.html'), (e2, html) => send(res, 404, e2 ? 'No encontrado' : html, 'text/html; charset=utf-8'));
    }
    const ext = path.extname(file).toLowerCase();
    const cache = ext === '.html' || ext === '.json' ? 'no-cache' : 'public, max-age=604800';
    res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': cache, ...SECURITY_HEADERS });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

http.createServer((req, res) => {
  let pathname;
  try { pathname = new URL(req.url, 'http://localhost').pathname; } catch { return send(res, 400, 'Bad request', 'text/plain'); }
  if (pathname.startsWith('/api/')) return handleApi(req, res, pathname).catch(() => send(res, 500, { error: 'server_error' }));
  return serveStatic(req, res, pathname);
}).listen(PORT, () => {
  console.log(`Soles Store lista en http://localhost:${PORT}`);
  console.log(`Registro de consentimientos: ${path.join(PRIVATE, 'consent-log.jsonl')}`);
});
