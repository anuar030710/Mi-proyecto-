/**
 * Conversión mínima de HTML (fichas técnicas de CIMA) a párrafos de texto plano.
 * No se renderiza HTML remoto en la app: se extrae el texto para mostrarlo con componentes nativos.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', uuml: 'ü',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', Uuml: 'Ü',
  ge: '≥', le: '≤', deg: '°', micro: 'µ', middot: '·', ndash: '–', mdash: '—', reg: '®', trade: '™',
  laquo: '«', raquo: '»', iquest: '¿', iexcl: '¡', plusmn: '±', times: '×',
};

export function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeFromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeFromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name] ?? m);
}

function safeFromCodePoint(code: number): string {
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

export function htmlToParagraphs(html: string): string[] {
  const withBreaks = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    // Celdas de tabla separadas por " · " para conservar algo de estructura.
    .replace(/<\/t[dh]>\s*<t[dh][^>]*>/gi, ' · ')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6]|table|ul|ol)>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  return decodeEntities(withBreaks)
    .split('\n')
    .map((line) => line.replace(/[\s ]+/g, ' ').trim())
    .filter((line) => line.length > 0 && line !== '•');
}
