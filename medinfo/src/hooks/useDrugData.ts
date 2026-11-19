import { useEffect, useState } from 'react';
import { config } from '@/config/env';
import type { DrugResult } from '@/data/repositories/drugRepository';
import { useServices } from '@/state/services';
import { useAsync } from './useAsync';

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

/** Búsqueda con espera tras dejar de escribir, longitud mínima y cancelación de la anterior. */
export function useDrugSearch(query: string) {
  const { drugs } = useServices();
  const debounced = useDebouncedValue(query.trim(), config.search.debounceMs);
  const enabled = debounced.length >= config.search.minQueryLength;
  const state = useAsync(enabled ? (signal) => drugs.search(debounced, signal) : null, [debounced, enabled]);
  return { ...state, query: debounced, pending: query.trim() !== debounced };
}

export function useDrug(id: string | undefined) {
  const { drugs } = useServices();
  return useAsync(id ? (signal) => drugs.getDrug(id, signal) : null, [id]);
}

/** Carga varias fichas a la vez (para el comprobador de interacciones). Tolera fallos parciales. */
export function useDrugs(ids: string[]) {
  const { drugs } = useServices();
  const key = ids.join('|');
  return useAsync(
    ids.length > 0
      ? async (signal) => {
          const settled = await Promise.allSettled(ids.map((id) => drugs.getDrug(id, signal)));
          const loaded: DrugResult[] = [];
          const failed: string[] = [];
          settled.forEach((r, i) => (r.status === 'fulfilled' ? loaded.push(r.value) : failed.push(ids[i])));
          return { loaded, failed };
        }
      : null,
    [key],
  );
}
