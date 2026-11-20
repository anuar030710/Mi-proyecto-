import { DRUG_CLASSES, INGREDIENTS, type IngredientEntry } from '@/data/local/ingredients';
import { containsWords, levenshtein, normalize, typoTolerance } from './normalize';

interface IndexedTerm {
  term: string;
  entry: IngredientEntry;
}

/** Índice plano término normalizado → principio activo, ordenado de más largo a más corto. */
const TERMS: IndexedTerm[] = INGREDIENTS.flatMap((entry) =>
  [entry.name, ...entry.en, ...(entry.aliases ?? [])].map((t) => ({ term: normalize(t), entry })),
).sort((a, b) => b.term.length - a.term.length);

export interface QueryResolution {
  entry: IngredientEntry;
  /** Cómo se reconoció: coincidencia exacta, por prefijo o con corrección de erratas. */
  match: 'exact' | 'prefix' | 'fuzzy';
}

/**
 * Interpreta lo que escribe el usuario: "advil" → ibuprofeno, "acetaminophen" → paracetamol,
 * "ibuprofemo" → ibuprofeno. Devuelve `undefined` si no hay una coincidencia razonablemente segura.
 */
export function resolveQuery(query: string): QueryResolution | undefined {
  const q = normalize(query);
  if (q.length < 3) return undefined;

  const exact = TERMS.find((t) => t.term === q);
  if (exact) return { entry: exact.entry, match: 'exact' };

  // Prefijo: solo si identifica un único principio activo ("atorvas" → atorvastatina).
  if (q.length >= 4) {
    const prefixed = unique(TERMS.filter((t) => t.term.startsWith(q)).map((t) => t.entry));
    if (prefixed.length === 1) return { entry: prefixed[0], match: 'prefix' };
  }

  const max = typoTolerance(q.length);
  if (max === 0) return undefined;
  let best: { entry: IngredientEntry; dist: number } | undefined;
  let tie = false;
  for (const { term, entry } of TERMS) {
    const d = levenshtein(q, term, max);
    if (d > max) continue;
    if (!best || d < best.dist) {
      best = { entry, dist: d };
      tie = false;
    } else if (d === best.dist && entry !== best.entry) {
      tie = true;
    }
  }
  return best && !tie ? { entry: best.entry, match: 'fuzzy' } : undefined;
}

/**
 * Identifica el principio activo a partir del nombre que publica una fuente:
 * "IBUPROFENO (ARGININA)" → ibuprofeno; "ATORVASTATIN CALCIUM" → atorvastatina.
 */
export function resolveSourceIngredient(raw: string): IngredientEntry | undefined {
  const text = normalize(raw);
  return TERMS.find((t) => containsWords(text, t.term))?.entry;
}

/** Términos con los que otra ficha técnica podría mencionar este principio activo. */
export function mentionTermsFor(rawIngredient: string): string[] {
  const entry = resolveSourceIngredient(rawIngredient);
  if (!entry) return [cleanIngredientName(rawIngredient)].filter((t) => t.length >= 4);
  const terms = [entry.name, ...entry.en, ...(entry.classes ?? []).flatMap((c) => DRUG_CLASSES[c].mentionTerms)];
  return unique(terms.map(normalize));
}

const SALT_WORDS = new Set(
  (
    'calcica calcio calcium sodica sodico sodio sodium potasica potasico potasio potassium magnesica magnesio magnesium ' +
    'hidrocloruro clorhidrato hydrochloride hcl trihidrato dihidrato monohidrato hemihidrato sesquihidrato anhidro anhidra ' +
    'hydrate trihydrate monohydrate dihydrate maleato maleate besilato besylate mesilato mesylate tartrato tartrate ' +
    'succinato succinate fumarato fumarate sulfato sulfate fosfato phosphate acetato acetate citrato citrate bromuro bromide ' +
    'arginina lisina lysine'
  ).split(' '),
);

/** "ATORVASTATINA CÁLCICA TRIHIDRATO" → "atorvastatina"; "IBUPROFENO (ARGININA)" → "ibuprofeno". */
export function cleanIngredientName(raw: string): string {
  return normalize(raw.replace(/\([^)]*\)/g, ' '))
    .split(' ')
    .filter((w) => !SALT_WORDS.has(w))
    .join(' ');
}

/** Nombre legible del principio activo: canónico si se conoce, o el de la fuente sin sales. */
export function displayIngredientName(raw: string): string {
  return resolveSourceIngredient(raw)?.name ?? cleanIngredientName(raw);
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}
