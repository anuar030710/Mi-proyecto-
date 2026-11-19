import { config } from '@/config/env';
import { DataError } from '@/domain/types';

export type FetchFn = typeof fetch;

export interface HttpOptions {
  fetchFn?: FetchFn;
  timeoutMs?: number;
  retries?: number;
  /** Señal externa para cancelar (p. ej. el usuario sigue escribiendo). */
  signal?: AbortSignal;
  /** Estados HTTP que se tratan como "sin resultados" en lugar de error (openFDA responde 404 si no hay coincidencias). */
  notFoundStatuses?: number[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * GET JSON con tiempo de espera, reintentos con espera exponencial para fallos transitorios
 * (red, 5xx, 429) y errores tipados. Devuelve `null` si el estado está en `notFoundStatuses`.
 */
export async function getJson<T>(url: string, opts: HttpOptions = {}): Promise<T | null> {
  const {
    fetchFn = fetch,
    timeoutMs = config.http.timeoutMs,
    retries = config.http.retries,
    signal,
    notFoundStatuses = [],
  } = opts;

  let lastError: DataError = new DataError('unknown', 'Error desconocido');

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal?.aborted) throw abortError();
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal?.addEventListener('abort', onAbort);
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetchFn(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (notFoundStatuses.includes(res.status)) return null;
      if (res.ok) return (await res.json()) as T;

      if (res.status === 429) lastError = new DataError('rate-limited', 'Demasiadas consultas; inténtalo en unos segundos.');
      else if (res.status >= 500) lastError = new DataError('server', `El servidor respondió con un error (${res.status}).`);
      else if (res.status === 404) throw new DataError('not-found', 'No se encontró el recurso solicitado.');
      else throw new DataError('unknown', `Respuesta inesperada del servidor (${res.status}).`);
    } catch (err) {
      if (err instanceof DataError) throw err;
      if (signal?.aborted) throw abortError();
      lastError = controller.signal.aborted
        ? new DataError('timeout', 'El servidor tardó demasiado en responder.')
        : new DataError('network', 'No hay conexión a internet o el servidor no está disponible.');
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }

    if (attempt < retries) await sleep(300 * 2 ** attempt);
  }
  throw lastError;
}

export function abortError(): Error {
  const e = new Error('Aborted');
  e.name = 'AbortError';
  return e;
}

export function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

export function buildUrl(base: string, params: Record<string, string | number | undefined>): string {
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return query ? `${base}?${query}` : base;
}
