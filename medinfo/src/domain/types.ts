/**
 * Modelo de dominio. Independiente de cualquier fuente de datos y de la UI:
 * los repositorios traducen cada fuente (CIMA, openFDA…) a estos tipos.
 */

/** Origen de un dato. Se muestra siempre al usuario para que pueda valorar su fiabilidad. */
export type DataSourceId = 'cima' | 'openfda';

export interface SourceReference {
  /** Nombre legible de la fuente, p. ej. "Ficha técnica — CIMA (AEMPS)". */
  name: string;
  url?: string;
  /** Fecha de la versión del documento original (ISO yyyy-mm-dd), si se conoce. */
  revisedAt?: string;
}

export interface DrugSummary {
  /** Identificador estable con prefijo de fuente: `cima:80298`, `fda:<set_id>`. */
  id: string;
  source: DataSourceId;
  /** Nombre comercial o de la presentación, tal como lo publica la fuente. */
  name: string;
  /** Principios activos tal como aparecen en la fuente (p. ej. "IBUPROFENO (ARGININA)"). */
  activeIngredients: string[];
  /** Dosis y forma farmacéutica, p. ej. "600 mg · Comprimido recubierto con película". */
  presentation?: string;
  /** Laboratorio titular o fabricante. */
  manufacturer?: string;
  /** `true` si requiere receta médica; `undefined` si la fuente no lo indica. */
  requiresPrescription?: boolean;
}

export type SectionKey =
  | 'boxedWarning'
  | 'indications'
  | 'dosage'
  | 'contraindications'
  | 'warnings'
  | 'interactions'
  | 'pregnancy'
  | 'sideEffects'
  | 'overdose';

export interface DrugSection {
  key: SectionKey;
  title: string;
  paragraphs: string[];
  /** Idioma del texto original. openFDA publica en inglés y se indica en la UI. */
  language: 'es' | 'en';
}

export interface Drug extends DrugSummary {
  sections: DrugSection[];
  references: SourceReference[];
  /** Momento en que se obtuvo el dato (ms epoch). Permite avisar de datos de caché antiguos. */
  fetchedAt: number;
}

export type InteractionSeverity = 'contraindicada' | 'grave' | 'moderada' | 'leve' | 'desconocida';

export interface InteractionExcerpt {
  /** Id del medicamento en cuya ficha aparece el texto. */
  drugId: string;
  text: string;
}

export interface Interaction {
  drugIds: [string, string];
  severity: InteractionSeverity;
  /** Título breve, p. ej. "Ibuprofeno + Warfarina". */
  title: string;
  summary: string;
  management?: string;
  /** `curada`: tabla revisada de la app. `ficha-tecnica`: mención encontrada en la sección 4.5. `duplicidad`: mismo principio activo. */
  evidence: 'curada' | 'ficha-tecnica' | 'duplicidad';
  excerpts: InteractionExcerpt[];
  reference?: SourceReference;
}

export interface SearchResults {
  /** Resultados de la fuente principal (CIMA, en español). */
  primary: DrugSummary[];
  /** Resultados de fuentes internacionales (openFDA, en inglés). */
  international: DrugSummary[];
  /** Principio activo reconocido en la consulta (corrige erratas y traduce nombres en inglés o marcas). */
  recognizedIngredient?: string;
  /** Avisos no bloqueantes, p. ej. una fuente no respondió. */
  warnings: string[];
}

export type DataErrorKind = 'network' | 'timeout' | 'not-found' | 'rate-limited' | 'server' | 'unknown';

/** Error tipado para que la UI muestre mensajes útiles. */
export class DataError extends Error {
  constructor(
    public readonly kind: DataErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'DataError';
  }
}
