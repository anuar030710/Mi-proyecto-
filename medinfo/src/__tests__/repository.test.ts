import { Cache, MemoryStore } from '@/data/cache/cache';
import { DefaultDrugRepository, rankResults } from '@/data/repositories/drugRepository';
import type { CimaClient } from '@/data/remote/cima';
import type { OpenFdaClient } from '@/data/remote/openFda';
import { DataError, type DrugSummary } from '@/domain/types';
import { makeDrug } from './fixtures/drugs';

const summary = (id: string, name: string, activeIngredients: string[]): DrugSummary => ({
  id,
  source: 'cima',
  name,
  activeIngredients,
});

function setup() {
  const cima = {
    searchByName: jest.fn().mockResolvedValue([]),
    searchByIngredient: jest.fn().mockResolvedValue([]),
    getDrug: jest.fn(),
  };
  const fda = { search: jest.fn().mockResolvedValue([]), getDrug: jest.fn() };
  let now = 1_000_000;
  const cache = new Cache(new MemoryStore(), 't:', () => now);
  const repo = new DefaultDrugRepository(cima as unknown as CimaClient, fda as unknown as OpenFdaClient, cache);
  return { repo, cima, fda, advance: (ms: number) => (now += ms) };
}

describe('DefaultDrugRepository.search', () => {
  it('traduce marcas y nombres en inglés a cada fuente', async () => {
    const { repo, cima, fda } = setup();
    const res = await repo.search('Advil');
    expect(cima.searchByName).toHaveBeenCalledWith('Advil', undefined);
    expect(cima.searchByIngredient).toHaveBeenCalledWith('ibuprofeno', undefined);
    expect(fda.search).toHaveBeenCalledWith(['ibuprofen', 'Advil'], expect.any(Number), undefined);
    expect(res.recognizedIngredient).toBe('ibuprofeno');
  });

  it('combina, elimina duplicados y ordena', async () => {
    const { repo, cima } = setup();
    const combo = summary('cima:1', 'ANTIDOL DUAL', ['paracetamol', 'ibuprofeno']);
    const single = summary('cima:2', 'DALSY', ['ibuprofeno']);
    cima.searchByName.mockResolvedValue([combo]);
    cima.searchByIngredient.mockResolvedValue([combo, single]);
    const res = await repo.search('ibuprofeno');
    expect(res.primary.map((d) => d.id)).toEqual(['cima:2', 'cima:1']);
  });

  it('avisa si una fuente falla pero devuelve el resto', async () => {
    const { repo, cima, fda } = setup();
    cima.searchByName.mockResolvedValue([summary('cima:1', 'DALSY', ['ibuprofeno'])]);
    fda.search.mockRejectedValue(new DataError('network', 'x'));
    const res = await repo.search('dalsy');
    expect(res.primary).toHaveLength(1);
    expect(res.warnings).toEqual([expect.stringContaining('openFDA')]);
  });

  it('sin conexión usa la búsqueda guardada aunque esté caducada', async () => {
    const { repo, cima, fda, advance } = setup();
    cima.searchByName.mockResolvedValue([summary('cima:1', 'DALSY', ['ibuprofeno'])]);
    await repo.search('dalsy');
    advance(2 * 24 * 60 * 60 * 1000);
    cima.searchByName.mockRejectedValue(new DataError('network', 'x'));
    cima.searchByIngredient.mockRejectedValue(new DataError('network', 'x'));
    fda.search.mockRejectedValue(new DataError('network', 'x'));
    const res = await repo.search('dalsy');
    expect(res.primary).toHaveLength(1);
    expect(res.warnings[0]).toContain('Sin conexión');
  });

  it('sin conexión y sin caché lanza el error', async () => {
    const { repo, cima, fda } = setup();
    cima.searchByName.mockRejectedValue(new DataError('network', 'sin red'));
    fda.search.mockRejectedValue(new DataError('network', 'sin red'));
    await expect(repo.search('dalsy')).rejects.toMatchObject({ kind: 'network' });
  });
});

describe('DefaultDrugRepository.getDrug', () => {
  it('enruta por prefijo y guarda en caché', async () => {
    const { repo, cima } = setup();
    cima.getDrug.mockResolvedValue(makeDrug({ id: 'cima:9', activeIngredients: [] }));
    await repo.getDrug('cima:9');
    await repo.getDrug('cima:9');
    expect(cima.getDrug).toHaveBeenCalledTimes(1);
    expect(cima.getDrug).toHaveBeenCalledWith('9', undefined);
  });

  it('sirve copia caducada si la red falla, marcándola', async () => {
    const { repo, fda, advance } = setup();
    fda.getDrug.mockResolvedValueOnce(makeDrug({ id: 'fda:x', activeIngredients: [] }));
    await repo.getDrug('fda:x');
    advance(8 * 24 * 60 * 60 * 1000);
    fda.getDrug.mockRejectedValue(new DataError('timeout', 'lento'));
    await expect(repo.getDrug('fda:x')).resolves.toMatchObject({ stale: true });
  });

  it('rechaza ids no válidos', async () => {
    const { repo } = setup();
    await expect(repo.getDrug('otro:1')).rejects.toMatchObject({ kind: 'not-found' });
  });
});

it('rankResults prioriza monofármacos del principio activo reconocido', () => {
  const items = [
    summary('3', 'ZZZ', ['otro']),
    summary('2', 'ANTIDOL', ['paracetamol', 'ibuprofeno']),
    summary('1', 'IBUPROFENO KERN', ['ibuprofeno']),
  ];
  expect(rankResults(items, 'ibu', 'ibuprofeno').map((d) => d.id)).toEqual(['1', '2', '3']);
});

it('rankResults pone primero la marca buscada', () => {
  const items = [
    summary('1', 'ANTIDOL 1 G', ['paracetamol']),
    summary('2', 'GELOCATIL GRIPE', ['paracetamol', 'pseudoefedrina']),
    summary('3', 'GELOCATIL 1 g', ['paracetamol']),
  ];
  expect(rankResults(items, 'gelocatil', 'paracetamol').map((d) => d.id)).toEqual(['3', '2', '1']);
});
