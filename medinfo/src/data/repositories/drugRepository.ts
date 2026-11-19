import { config } from '@/config/env';
import { DataError, type Drug, type DrugSummary, type SearchResults } from '@/domain/types';
import { resolveQuery } from '@/services/search/ingredientResolver';
import { normalize } from '@/services/search/normalize';
import { Cache } from '../cache/cache';
import { CimaClient } from '../remote/cima';
import { abortError, isAbortError } from '../remote/http';
import { OpenFdaClient } from '../remote/openFda';

export interface DrugResult {
  drug: Drug;
  /** `true` si se sirve una copia guardada caducada porque no se pudo contactar con la fuente. */
  stale: boolean;
}

/**
 * Punto único de acceso a los datos de medicamentos para la UI.
 * Orquesta las fuentes, la caché y el modo sin conexión; la UI no conoce ninguna API concreta.
 * Para añadir una fuente nueva basta con un cliente que devuelva tipos del dominio y
 * registrarlo aquí.
 */
export interface DrugRepository {
  search(query: string, signal?: AbortSignal): Promise<SearchResults>;
  getDrug(id: string, signal?: AbortSignal): Promise<DrugResult>;
  clearCache(): Promise<number>;
}

export class DefaultDrugRepository implements DrugRepository {
  constructor(
    private readonly cima: CimaClient,
    private readonly fda: OpenFdaClient,
    private readonly cache: Cache,
  ) {}

  async search(query: string, signal?: AbortSignal): Promise<SearchResults> {
    const q = query.trim();
    const key = `search:v1:${normalize(q)}`;
    const cached = await this.cache.get<SearchResults>(key, config.cache.searchTtlMs);
    if (cached && !cached.stale) return cached.value;

    const resolution = resolveQuery(q);
    const ingredient = resolution?.entry;

    const primaryTasks: Promise<DrugSummary[]>[] = [this.cima.searchByName(q, signal)];
    if (ingredient) primaryTasks.push(this.cima.searchByIngredient(ingredient.name, signal));
    // openFDA: el nombre en inglés del principio activo y, si lo escrito es latino sin tildes
    // (p. ej. una marca estadounidense como "Lipitor"), también lo escrito tal cual.
    const fdaTerms = [...(ingredient ? [ingredient.en[0]] : []), ...(/^[a-z0-9 -]+$/i.test(q) ? [q] : [])];

    const [primarySettled, fdaSettled] = await Promise.all([
      Promise.allSettled(primaryTasks),
      Promise.allSettled(
        fdaTerms.length ? [this.fda.search(fdaTerms, config.search.maxInternationalResults, signal)] : [],
      ),
    ]);
    if (signal?.aborted) throw abortError();

    const primaryOk = fulfilledValues(primarySettled);
    const fdaOk = fulfilledValues(fdaSettled);
    const primaryFailed = primarySettled.some((r) => r.status === 'rejected');
    const fdaFailed = fdaSettled.some((r) => r.status === 'rejected');

    if (primaryFailed && primaryOk.length === 0 && (fdaSettled.length === 0 || fdaFailed)) {
      // Ninguna fuente respondió: si hay una búsqueda guardada, se usa aunque esté caducada.
      if (cached) return { ...cached.value, warnings: ['Sin conexión: se muestran resultados guardados.'] };
      throw firstError(primarySettled) ?? new DataError('network', 'No se pudo completar la búsqueda.');
    }

    const warnings: string[] = [];
    if (primaryFailed) warnings.push('CIMA (AEMPS) no respondió; los resultados pueden estar incompletos.');
    if (fdaFailed) warnings.push('openFDA no respondió; no se muestran resultados internacionales.');

    const results: SearchResults = {
      primary: rankResults(dedupeById(primaryOk), q, ingredient?.name).slice(0, config.search.maxPrimaryResults),
      international: rankResults(fdaOk, q, ingredient?.en[0]),
      recognizedIngredient: ingredient && normalize(ingredient.name) !== normalize(q) ? ingredient.name : undefined,
      warnings,
    };
    // Solo se guardan búsquedas completas, para no fijar en caché un resultado parcial.
    if (warnings.length === 0) await this.cache.set(key, results);
    return results;
  }

  async getDrug(id: string, signal?: AbortSignal): Promise<DrugResult> {
    const key = `drug:v1:${id}`;
    const cached = await this.cache.get<Drug>(key, config.cache.drugTtlMs);
    if (cached && !cached.stale) return { drug: cached.value, stale: false };

    try {
      const drug = await this.fetchDrug(id, signal);
      await this.cache.set(key, drug);
      return { drug, stale: false };
    } catch (err) {
      if (isAbortError(err)) throw err;
      const recoverable = err instanceof DataError && err.kind !== 'not-found';
      if (cached && recoverable) return { drug: cached.value, stale: true };
      throw err;
    }
  }

  clearCache() {
    return this.cache.clear();
  }

  private fetchDrug(id: string, signal?: AbortSignal): Promise<Drug> {
    const [source, ...rest] = id.split(':');
    const sourceId = rest.join(':');
    if (source === 'cima' && sourceId) return this.cima.getDrug(sourceId, signal);
    if (source === 'fda' && sourceId) return this.fda.getDrug(sourceId, signal);
    return Promise.reject(new DataError('not-found', 'Identificador de medicamento no válido.'));
  }
}

/**
 * Ordena para que lo más probable salga primero:
 *  1. Nombre comercial que empieza por lo escrito ("gelocatil" → GELOCATIL…), monofármacos antes.
 *  2. Medicamentos con un solo principio activo que coincide con el reconocido.
 *  3. Combinaciones que lo contienen.
 *  4. Resto, alfabético.
 */
export function rankResults(items: DrugSummary[], query: string, ingredient?: string): DrugSummary[] {
  const q = normalize(query);
  const ing = ingredient ? normalize(ingredient) : undefined;
  const score = (d: DrugSummary): number => {
    const ings = d.activeIngredients.map(normalize);
    const single = ings.length === 1;
    if (normalize(d.name).startsWith(q)) return single ? 0 : 1;
    const contains = ing !== undefined && ings.some((i) => i === ing || i.startsWith(`${ing} `));
    if (contains) return single ? 2 : 3;
    return 4;
  };
  return [...items].sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name, 'es'));
}

function dedupeById(items: DrugSummary[]): DrugSummary[] {
  return [...new Map(items.map((d) => [d.id, d])).values()];
}

function fulfilledValues<T>(results: PromiseSettledResult<T[]>[]): T[] {
  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
}

function firstError(results: PromiseSettledResult<unknown>[]): Error | undefined {
  const rejected = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
  return rejected?.reason instanceof Error ? rejected.reason : undefined;
}

export function createDrugRepository(cache: Cache): DrugRepository {
  return new DefaultDrugRepository(new CimaClient(), new OpenFdaClient(), cache);
}
