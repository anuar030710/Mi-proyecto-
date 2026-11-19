/** Utilidades de texto para búsqueda insensible a mayúsculas, tildes y signos. */

/** "Ácido  Acetilsalicílico®" → "acido acetilsalicilico" */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Distancia de Levenshtein con corte temprano: devuelve `max + 1` si se supera `max`. */
export function levenshtein(a: string, b: string, max = Infinity): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      rowMin = Math.min(rowMin, curr[j]);
    }
    if (rowMin > max) return max + 1;
    prev = curr;
  }
  return prev[b.length];
}

/** ¿Aparece `term` como palabra(s) completa(s) dentro de `text`? Ambos ya normalizados. */
export function containsWords(text: string, term: string): boolean {
  if (!term) return false;
  return ` ${text} `.includes(` ${term} `);
}

/** Errores tolerados según la longitud de la palabra (evita falsos positivos en palabras cortas). */
export function typoTolerance(length: number): number {
  if (length < 5) return 0;
  if (length < 9) return 1;
  return 2;
}
