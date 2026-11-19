/**
 * Cliente y adaptador de openFDA (U.S. Food and Drug Administration). Publica las fichas
 * (labels) de los medicamentos autorizados en EE. UU., en inglés. Se usa como fuente
 * internacional complementaria para principios activos no comercializados en España.
 * https://open.fda.gov/apis/drug/label/
 */
import { config } from '@/config/env';
import { DataError, type Drug, type DrugSection, type DrugSummary, type SectionKey } from '@/domain/types';
import { buildUrl, getJson, type HttpOptions } from './http';

interface FdaLabel {
  set_id: string;
  effective_time?: string;
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
    manufacturer_name?: string[];
    product_type?: string[];
    route?: string[];
  };
  [field: string]: unknown;
}

interface FdaResponse {
  results: FdaLabel[];
}

export class OpenFdaClient {
  constructor(private readonly http: HttpOptions = {}) {}

  /**
   * Busca por nombre genérico o comercial en inglés (cualquiera de los términos). Admite prefijos
   * ("atorvas"). Se pasan varios términos para cubrir marca y principio activo ("lipitor", "atorvastatin").
   */
  async search(terms: string[], limit: number, signal?: AbortSignal): Promise<DrugSummary[]> {
    const clean = [...new Set(terms.map((t) => t.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()))].filter(
      (t) => t.length >= 3,
    );
    // Una consulta por término: combinadas, las cientos de fichas de genéricos entierran a la marca.
    const perTerm = await Promise.all(clean.map((t) => this.searchTerm(t, limit, signal)));
    return dedupe(perTerm.flat()).slice(0, limit).map(mapFdaSummary);
  }

  private async searchTerm(term: string, limit: number, signal?: AbortSignal): Promise<FdaLabel[]> {
    const value = term.includes(' ') ? `"${term}"` : `${term}*`;
    const url = buildUrl(config.openFda.baseUrl, {
      search: `openfda.generic_name:${value} openfda.brand_name:${value}`,
      // Se piden más de los necesarios porque hay muchas fichas casi idénticas de genéricos.
      limit: Math.min(limit * 5, 100),
    });
    // openFDA responde 404 cuando no hay coincidencias.
    const data = await getJson<FdaResponse>(url, { ...this.http, signal, notFoundStatuses: [404] });
    return data?.results ?? [];
  }

  async getDrug(setId: string, signal?: AbortSignal): Promise<Drug> {
    if (!/^[0-9a-f-]+$/i.test(setId)) throw new DataError('not-found', 'Identificador no válido.');
    const url = buildUrl(config.openFda.baseUrl, { search: `set_id:"${setId}"`, limit: 1 });
    const data = await getJson<FdaResponse>(url, { ...this.http, signal, notFoundStatuses: [404] });
    const label = data?.results?.[0];
    if (!label) throw new DataError('not-found', 'No se encontró la ficha en openFDA.');
    return mapFdaDrug(label);
  }
}

const FORM_WORDS = /\b(tablets?|capsules?|film coated|coated|oral|solution|suspension|usp|extended release)\b/g;

/** Una ficha por combinación nombre comercial + genérico (ignorando mayúsculas y forma), la más reciente. */
function dedupe(labels: FdaLabel[]): FdaLabel[] {
  const byKey = new Map<string, FdaLabel>();
  for (const label of labels) {
    if (!label.openfda?.generic_name?.length) continue;
    const brand = (label.openfda.brand_name?.[0] ?? '').toLowerCase().replace(FORM_WORDS, '').replace(/\s+/g, ' ').trim();
    const key = `${brand}|${label.openfda.generic_name[0].toLowerCase()}`;
    const current = byKey.get(key);
    if (!current || (label.effective_time ?? '') > (current.effective_time ?? '')) byKey.set(key, label);
  }
  return [...byKey.values()];
}

/** Campos de la ficha, por orden de preferencia (las fichas de venta libre usan otros nombres). */
const SECTION_FIELDS: { key: SectionKey; title: string; fields: string[] }[] = [
  { key: 'boxedWarning', title: 'Advertencia destacada (boxed warning)', fields: ['boxed_warning'] },
  { key: 'indications', title: 'Indicaciones', fields: ['indications_and_usage', 'purpose'] },
  { key: 'dosage', title: 'Posología y forma de administración', fields: ['dosage_and_administration'] },
  { key: 'contraindications', title: 'Contraindicaciones', fields: ['contraindications', 'do_not_use'] },
  { key: 'warnings', title: 'Advertencias y precauciones', fields: ['warnings_and_cautions', 'warnings', 'ask_doctor', 'stop_use'] },
  { key: 'interactions', title: 'Interacciones', fields: ['drug_interactions', 'ask_doctor_or_pharmacist'] },
  { key: 'pregnancy', title: 'Embarazo y lactancia', fields: ['pregnancy', 'lactation', 'pregnancy_or_breast_feeding'] },
  { key: 'sideEffects', title: 'Efectos adversos', fields: ['adverse_reactions'] },
  { key: 'overdose', title: 'Sobredosis', fields: ['overdosage'] },
];

export function mapFdaSummary(label: FdaLabel): DrugSummary {
  const o = label.openfda ?? {};
  const generic = o.generic_name?.[0] ?? '';
  const type = o.product_type?.[0];
  return {
    id: `fda:${label.set_id}`,
    source: 'openfda',
    name: titleCase(o.brand_name?.[0] ?? generic),
    activeIngredients: generic
      .split(/,| and |\//i)
      .map((s) => s.trim())
      .filter(Boolean),
    presentation: o.route?.[0] ? `Vía ${o.route[0].toLowerCase()} · EE. UU.` : 'EE. UU.',
    manufacturer: o.manufacturer_name?.[0],
    requiresPrescription: type ? type.includes('PRESCRIPTION') : undefined,
  };
}

export function mapFdaDrug(label: FdaLabel): Drug {
  const sections: DrugSection[] = [];
  for (const { key, title, fields } of SECTION_FIELDS) {
    const texts = fields.flatMap((f) => (Array.isArray(label[f]) ? (label[f] as string[]) : []));
    const paragraphs = texts.flatMap(splitLabelText);
    if (paragraphs.length > 0) sections.push({ key, title, paragraphs, language: 'en' });
  }
  const revised = label.effective_time?.match(/^(\d{4})(\d{2})(\d{2})$/);
  return {
    ...mapFdaSummary(label),
    sections,
    references: [
      {
        name: 'Ficha del producto (label) — openFDA / DailyMed (EE. UU.)',
        url: buildUrl(config.openFda.publicUrl, { setid: label.set_id }),
        revisedAt: revised ? `${revised[1]}-${revised[2]}-${revised[3]}` : undefined,
      },
    ],
    fetchedAt: Date.now(),
  };
}

/**
 * Las fichas de openFDA llegan como un único bloque de texto por sección. Se separan por los
 * epígrafes numerados ("7.1 Strong CYP3A4 Inhibitors") y los bloques largos en grupos de frases.
 */
export function splitLabelText(text: string): string[] {
  const cleaned = text
    .replace(/^\s*\d{1,2}\s+[A-Z][A-Z &/,-]+(?=\s)/, '') // quita el encabezado "7 DRUG INTERACTIONS"
    .trim();
  const blocks = cleaned.split(/\s(?=\d{1,2}\.\d{1,2}\s+[A-Z])/);
  return blocks.flatMap((block) => chunkSentences(block.trim(), 600)).filter(Boolean);
}

function chunkSentences(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const sentences = text.split(/(?<=[.;])\s+(?=[A-Z•])/);
  const out: string[] = [];
  let current = '';
  for (const s of sentences) {
    if (current && current.length + s.length > max) {
      out.push(current);
      current = s;
    } else {
      current = current ? `${current} ${s}` : s;
    }
  }
  if (current) out.push(current);
  return out;
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}
