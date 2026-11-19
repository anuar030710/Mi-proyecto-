/**
 * Cliente y adaptador de CIMA, el Centro de Información online de Medicamentos de la AEMPS
 * (Agencia Española de Medicamentos y Productos Sanitarios). Fuente oficial, en español,
 * con las fichas técnicas autorizadas. API REST pública: https://cima.aemps.es/cima/rest
 */
import { config } from '@/config/env';
import { DataError, type Drug, type DrugSection, type DrugSummary, type SectionKey } from '@/domain/types';
import { htmlToParagraphs } from './html';
import { buildUrl, getJson, type HttpOptions } from './http';

// ——— Tipos de la API (solo los campos que se usan) ———

interface CimaListItem {
  nregistro: string;
  nombre: string;
  labtitular?: string;
  receta?: boolean;
  comerc?: boolean;
  dosis?: string;
  vtm?: { nombre: string };
  formaFarmaceutica?: { nombre: string };
  formaFarmaceuticaSimplificada?: { nombre: string };
}

interface CimaListResponse {
  totalFilas: number;
  resultados: CimaListItem[];
}

interface CimaMedicine extends CimaListItem {
  principiosActivos?: { nombre: string; cantidad?: string; unidad?: string }[];
  docs?: { tipo: number; url?: string; urlHtml?: string; fecha?: number }[];
}

interface CimaSegment {
  seccion: string;
  titulo?: string;
  contenido?: string;
}

// ——— Cliente ———

export class CimaClient {
  constructor(private readonly http: HttpOptions = {}) {}

  /** Busca por nombre comercial (coincidencia parcial, sin distinguir tildes). Solo comercializados. */
  searchByName(name: string, signal?: AbortSignal) {
    return this.list({ nombre: name, comerc: 1 }, signal);
  }

  /** Busca por principio activo (p. ej. "warfarina" encuentra Aldocumar). */
  searchByIngredient(ingredient: string, signal?: AbortSignal) {
    return this.list({ practiv1: ingredient, comerc: 1 }, signal);
  }

  async getDrug(nregistro: string, signal?: AbortSignal): Promise<Drug> {
    const opts = { ...this.http, signal };
    const [medicine, segments] = await Promise.all([
      getJson<CimaMedicine>(buildUrl(`${config.cima.baseUrl}/medicamento`, { nregistro }), opts),
      // Tipo 1 = ficha técnica. Una sola petición devuelve todas las secciones.
      getJson<CimaSegment[]>(buildUrl(`${config.cima.baseUrl}/docSegmentado/contenido/1`, { nregistro }), {
        ...opts,
        notFoundStatuses: [404],
      }),
    ]);
    if (!medicine || !medicine.nregistro) throw new DataError('not-found', 'No se encontró el medicamento en CIMA.');
    return mapCimaDrug(medicine, segments ?? []);
  }

  private async list(params: Record<string, string | number>, signal?: AbortSignal): Promise<DrugSummary[]> {
    const data = await getJson<CimaListResponse>(buildUrl(`${config.cima.baseUrl}/medicamentos`, params), {
      ...this.http,
      signal,
    });
    return (data?.resultados ?? []).map(mapCimaSummary);
  }
}

// ——— Adaptador CIMA → dominio ———

/** Secciones de la ficha técnica (formato europeo SmPC) que se muestran en la app. */
const SECTION_MAP: Record<string, { key: SectionKey; title: string }> = {
  '4.1': { key: 'indications', title: 'Indicaciones' },
  '4.2': { key: 'dosage', title: 'Posología y forma de administración' },
  '4.3': { key: 'contraindications', title: 'Contraindicaciones' },
  '4.4': { key: 'warnings', title: 'Advertencias y precauciones' },
  '4.5': { key: 'interactions', title: 'Interacciones' },
  '4.6': { key: 'pregnancy', title: 'Embarazo y lactancia' },
  '4.8': { key: 'sideEffects', title: 'Efectos adversos' },
  '4.9': { key: 'overdose', title: 'Sobredosis' },
};

export function mapCimaSummary(item: CimaListItem): DrugSummary {
  const form = item.formaFarmaceutica?.nombre ?? item.formaFarmaceuticaSimplificada?.nombre;
  return {
    id: `cima:${item.nregistro}`,
    source: 'cima',
    name: item.nombre,
    activeIngredients: item.vtm?.nombre ? item.vtm.nombre.split('+').map((s) => s.trim()).filter(Boolean) : [],
    presentation: [item.dosis, form && capitalize(form.toLowerCase())].filter(Boolean).join(' · ') || undefined,
    manufacturer: item.labtitular,
    requiresPrescription: item.receta,
  };
}

export function mapCimaDrug(medicine: CimaMedicine, segments: CimaSegment[]): Drug {
  const summary = mapCimaSummary(medicine);
  if (medicine.principiosActivos?.length) {
    summary.activeIngredients = medicine.principiosActivos.map((p) => p.nombre);
  }

  const sections: DrugSection[] = [];
  for (const [code, meta] of Object.entries(SECTION_MAP)) {
    // Incluye la sección y sus subsecciones (4.2 → 4.2.1, 4.2.2…) en orden.
    const parts = segments.filter((s) => s.seccion === code || s.seccion.startsWith(`${code}.`));
    const paragraphs = parts.flatMap((part) => {
      const body = part.contenido ? htmlToParagraphs(part.contenido) : [];
      const isSub = part.seccion !== code && part.titulo && body.length > 0;
      return isSub ? [`▸ ${part.titulo}`, ...body] : body;
    });
    if (paragraphs.length > 0) sections.push({ ...meta, paragraphs, language: 'es' });
  }

  const smpc = medicine.docs?.find((d) => d.tipo === 1);
  const leaflet = medicine.docs?.find((d) => d.tipo === 2);
  return {
    ...summary,
    sections,
    references: [
      {
        name: 'Ficha técnica — CIMA (AEMPS)',
        url: smpc?.urlHtml ?? smpc?.url ?? buildUrl(config.cima.publicUrl, { nregistro: medicine.nregistro }),
        revisedAt: smpc?.fecha ? new Date(smpc.fecha).toISOString().slice(0, 10) : undefined,
      },
      ...(leaflet
        ? [{ name: 'Prospecto para el paciente — CIMA (AEMPS)', url: leaflet.urlHtml ?? leaflet.url }]
        : []),
    ],
    fetchedAt: Date.now(),
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
