import { DataError } from '@/domain/types';
import { buildUrl, getJson } from '@/data/remote/http';

const response = (status: number, body: unknown = {}) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe('getJson', () => {
  it('reintenta errores 5xx y devuelve el resultado', async () => {
    const fetchFn = jest.fn().mockResolvedValueOnce(response(503)).mockResolvedValueOnce(response(200, { ok: 1 }));
    await expect(getJson('u', { fetchFn, retries: 2 })).resolves.toEqual({ ok: 1 });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('no reintenta un 404 y lanza not-found', async () => {
    const fetchFn = jest.fn().mockResolvedValue(response(404));
    await expect(getJson('u', { fetchFn, retries: 2 })).rejects.toMatchObject({ kind: 'not-found' });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('devuelve null para estados marcados como "sin resultados"', async () => {
    const fetchFn = jest.fn().mockResolvedValue(response(404));
    await expect(getJson('u', { fetchFn, notFoundStatuses: [404] })).resolves.toBeNull();
  });

  it('convierte fallos de red en DataError tras agotar reintentos', async () => {
    const fetchFn = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    const err = (await getJson('u', { fetchFn, retries: 1 }).catch((e: unknown) => e)) as DataError;
    expect(err).toBeInstanceOf(DataError);
    expect(err.kind).toBe('network');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('aplica el tiempo de espera', async () => {
    const fetchFn = jest.fn(
      (_: unknown, init?: RequestInit) =>
        new Promise<Response>((_, reject) =>
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
        ),
    ) as unknown as typeof fetch;
    await expect(getJson('u', { fetchFn, retries: 0, timeoutMs: 10 })).rejects.toMatchObject({ kind: 'timeout' });
  });
});

it('buildUrl codifica parámetros y omite vacíos', () => {
  expect(buildUrl('https://x/y', { a: 'á b', b: undefined, c: 2 })).toBe('https://x/y?a=%C3%A1%20b&c=2');
});
