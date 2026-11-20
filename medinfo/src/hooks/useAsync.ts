import { useCallback, useEffect, useState } from 'react';
import { isAbortError } from '@/data/remote/http';

export type AsyncState<T> =
  | { status: 'idle'; data?: undefined; error?: undefined }
  | { status: 'loading'; data?: T; error?: undefined }
  | { status: 'success'; data: T; error?: undefined }
  | { status: 'error'; data?: undefined; error: Error };

type Settled<T> = { key: string } & ({ ok: true; data: T } | { ok: false; error: Error });

/**
 * Ejecuta una tarea asíncrona cancelable cada vez que cambian sus dependencias.
 * - Cancela la petición anterior, así una respuesta lenta no sobrescribe otra más reciente.
 * - Mientras carga conserva los datos previos, para no vaciar la lista en cada tecla.
 * - Expone `retry` para los estados de error.
 *
 * El estado de carga se deriva comparando la clave de la última respuesta con la actual, en
 * lugar de fijarlo dentro del efecto (evita renders en cascada).
 */
export function useAsync<T>(
  task: ((signal: AbortSignal) => Promise<T>) | null,
  deps: readonly unknown[],
): AsyncState<T> & { retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const [lastData, setLastData] = useState<T | undefined>(undefined);
  const key = JSON.stringify([...deps, attempt]);

  useEffect(() => {
    if (!task) return;
    const controller = new AbortController();
    task(controller.signal).then(
      (data) => {
        if (controller.signal.aborted) return;
        setSettled({ key, ok: true, data });
        setLastData(data);
      },
      (error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        setSettled({ key, ok: false, error: error instanceof Error ? error : new Error(String(error)) });
      },
    );
    return () => controller.abort();
    // `task` es la del render actual; el efecto se repite solo cuando cambia la clave.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, task === null]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  let state: AsyncState<T>;
  if (!task) state = { status: 'idle' };
  else if (settled?.key !== key) state = { status: 'loading', data: lastData };
  else if (settled.ok) state = { status: 'success', data: settled.data };
  else state = { status: 'error', error: settled.error };
  return { ...state, retry };
}
