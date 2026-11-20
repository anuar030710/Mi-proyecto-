import { CURATED_INTERACTIONS, type CuratedInteraction, type Party } from '@/data/local/curatedInteractions';
import { DRUG_CLASSES, type IngredientEntry } from '@/data/local/ingredients';
import type { Drug, Interaction, InteractionExcerpt, InteractionSeverity } from '@/domain/types';
import {
  cleanIngredientName,
  displayIngredientName,
  mentionTermsFor,
  resolveSourceIngredient,
} from '@/services/search/ingredientResolver';
import { containsWords, normalize } from '@/services/search/normalize';

const SEVERITY_ORDER: InteractionSeverity[] = ['contraindicada', 'grave', 'moderada', 'leve', 'desconocida'];
const MAX_EXCERPTS_PER_DRUG = 3;
const MAX_EXCERPT_LENGTH = 400;

export function compareSeverity(a: InteractionSeverity, b: InteractionSeverity): number {
  return SEVERITY_ORDER.indexOf(a) - SEVERITY_ORDER.indexOf(b);
}

/**
 * Comprueba todas las parejas posibles de la lista y devuelve las interacciones encontradas,
 * de más a menos grave. Combina tres fuentes de evidencia:
 *
 *  1. Duplicidad: ambos medicamentos comparten principio activo (riesgo de sobredosis).
 *  2. Tabla curada: aporta la gravedad.
 *  3. Menciones en la sección de interacciones de cada ficha técnica: aporta el texto original
 *     y detecta interacciones no incluidas en la tabla (gravedad "desconocida").
 */
export function checkInteractions(drugs: Drug[]): Interaction[] {
  const results: Interaction[] = [];
  for (let i = 0; i < drugs.length; i++) {
    for (let j = i + 1; j < drugs.length; j++) {
      results.push(...checkPair(drugs[i], drugs[j]));
    }
  }
  return results.sort((x, y) => compareSeverity(x.severity, y.severity));
}

export function checkPair(a: Drug, b: Drug): Interaction[] {
  const results: Interaction[] = [];
  const title = `${shortName(a)} + ${shortName(b)}`;
  const excerpts = [...findMentions(a, b), ...findMentions(b, a)];

  const shared = sharedIngredients(a, b);
  if (shared.length > 0) {
    results.push({
      drugIds: [a.id, b.id],
      severity: 'grave',
      title,
      summary: `Ambos contienen ${shared.join(', ')}. Tomarlos juntos puede suponer una dosis excesiva.`,
      management: 'No combinar salvo indicación médica. Tener en cuenta la dosis total diaria del principio activo.',
      evidence: 'duplicidad',
      excerpts: [],
    });
  }

  const curated = findCurated(a, b);
  if (curated) {
    results.push({
      drugIds: [a.id, b.id],
      severity: curated.severity,
      title,
      summary: curated.summary,
      management: curated.management,
      evidence: 'curada',
      excerpts,
      reference: { name: 'Tabla de interacciones revisada de MedInfo, basada en las fichas técnicas (sección 4.5)' },
    });
  } else if (excerpts.length > 0 && shared.length === 0) {
    results.push({
      drugIds: [a.id, b.id],
      severity: 'desconocida',
      title,
      summary:
        'La ficha técnica menciona esta combinación o el grupo de medicamentos al que pertenece. Lee el texto original para valorar su importancia.',
      evidence: 'ficha-tecnica',
      excerpts,
    });
  }
  return results;
}

function shortName(drug: Drug): string {
  const names = drug.activeIngredients.map(displayIngredientName).filter(Boolean);
  const label = names.length > 0 ? names.join(' + ') : drug.name;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function sharedIngredients(a: Drug, b: Drug): string[] {
  const keysB = new Set(b.activeIngredients.map(ingredientKey));
  return [...new Set(a.activeIngredients.map(ingredientKey))].filter((k) => keysB.has(k));
}

/** Clave comparable entre fuentes: el nombre canónico si se conoce ("ATORVASTATIN CALCIUM" ≡ "ATORVASTATINA CÁLCICA"). */
function ingredientKey(raw: string): string {
  return resolveSourceIngredient(raw)?.name ?? cleanIngredientName(raw);
}

function entriesOf(drug: Drug): IngredientEntry[] {
  return drug.activeIngredients
    .map(resolveSourceIngredient)
    .filter((e): e is IngredientEntry => e !== undefined);
}

function matchesParty(entries: IngredientEntry[], party: Party): boolean {
  return 'ingredient' in party
    ? entries.some((e) => e.name === party.ingredient)
    : entries.some((e) => e.classes?.includes(party.class));
}

function findCurated(a: Drug, b: Drug): CuratedInteraction | undefined {
  const ea = entriesOf(a);
  const eb = entriesOf(b);
  if (ea.length === 0 || eb.length === 0) return undefined;
  return CURATED_INTERACTIONS.filter(
    (c) =>
      (matchesParty(ea, c.a) && matchesParty(eb, c.b)) || (matchesParty(ea, c.b) && matchesParty(eb, c.a)),
  ).sort((x, y) => compareSeverity(x.severity, y.severity))[0];
}

/** Párrafos de la sección de interacciones de `source` que mencionan a `target` o a su grupo. */
function findMentions(source: Drug, target: Drug): InteractionExcerpt[] {
  const section = source.sections.find((s) => s.key === 'interactions');
  if (!section) return [];

  // Los términos de grupo compartido sí cuentan (dos AINE: "no combinar con otros AINE"), pero se
  // excluye el nombre del propio principio activo de la ficha, que aparece en todos sus párrafos.
  const ownNames = new Set([
    ...source.activeIngredients.map((i) => normalize(ingredientKey(i))),
    ...entriesOf(source).flatMap((e) => e.en.map(normalize)),
  ]);
  const terms = target.activeIngredients.flatMap(mentionTermsFor).filter((t) => !ownNames.has(t));
  if (terms.length === 0) return [];

  const excerpts: InteractionExcerpt[] = [];
  for (const paragraph of section.paragraphs) {
    const text = normalize(paragraph);
    if (terms.some((t) => containsWords(text, t))) {
      excerpts.push({ drugId: source.id, text: truncate(paragraph) });
      if (excerpts.length >= MAX_EXCERPTS_PER_DRUG) break;
    }
  }
  return excerpts;
}

function truncate(text: string): string {
  return text.length > MAX_EXCERPT_LENGTH ? `${text.slice(0, MAX_EXCERPT_LENGTH).trimEnd()}…` : text;
}

/** Etiquetas de grupo terapéutico de un medicamento (para mostrar en la ficha). */
export function classLabelsFor(drug: Drug): string[] {
  const ids = new Set(entriesOf(drug).flatMap((e) => e.classes ?? []));
  return [...ids].map((id) => DRUG_CLASSES[id].label);
}
