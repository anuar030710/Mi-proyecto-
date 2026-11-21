/* Registro de aceptación (consentimiento) de Soles Store.
   Cada vez que una persona marca las casillas y envía un formulario se crea un registro con: cuándo (fecha y hora),
   cómo (casilla marcada en el sitio web, el texto exacto de cada casilla), qué versión de cada documento aceptó,
   y en qué página. El registro:
     1. viaja dentro del mensaje de WhatsApp (la tienda lo guarda en el chat con su código SOL-...),
     2. se guarda en el navegador de la persona (localStorage "soles-consentimientos"), para que pueda verlo
        en la Política de privacidad,
     3. y, si la tienda configura un servicio de registro (meta name="consent-log" con una URL https),
        se envía también ahí como JSON. */

export const VERSIONES = {
  terminos: 'v1 del 21-11-2026',
  privacidad: 'v1 del 21-11-2026',
  reembolsos: 'v1 del 21-11-2026',
  cookies: 'v1 del 21-11-2026',
};

const CLAVE = 'soles-consentimientos';

export function leerRegistros() {
  try { return JSON.parse(localStorage.getItem(CLAVE) || '[]'); } catch { return []; }
}

function guardarLocal(registro) {
  try {
    const todos = leerRegistros();
    todos.push(registro);
    localStorage.setItem(CLAVE, JSON.stringify(todos.slice(-50)));
  } catch { /* navegador sin almacenamiento: el registro sigue yendo en el mensaje */ }
}

function nuevoId(fecha) {
  const d = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(fecha).replace(/-/g, '');
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SOL-${d}-${r}`;
}

export function fechaColombia(fecha) {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Bogota' }).format(fecha);
}

/* casillas: [{ texto, marcada, obligatoria }] */
export function registrar({ formulario, casillas, documentos }) {
  const ahora = new Date();
  const registro = {
    id: nuevoId(ahora),
    fecha_utc: ahora.toISOString(),
    fecha_colombia: fechaColombia(ahora),
    formulario,
    metodo: 'Casilla marcada por la persona en el sitio web de Soles Store',
    documentos: Object.fromEntries((documentos || []).map(k => [k, VERSIONES[k]])),
    casillas,
    pagina: location.href.split('#')[0],
    navegador: navigator.userAgent,
  };
  guardarLocal(registro);
  const destino = document.querySelector('meta[name="consent-log"]')?.content?.trim();
  if (destino && /^https:\/\//.test(destino)) {
    try {
      fetch(destino, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(registro) }).catch(() => {});
    } catch { /* sin conexión: queda en el mensaje y en el navegador */ }
  }
  return registro;
}
