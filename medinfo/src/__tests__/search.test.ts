import { cleanIngredientName, displayIngredientName, mentionTermsFor, resolveQuery, resolveSourceIngredient } from '@/services/search/ingredientResolver';
import { containsWords, levenshtein, normalize } from '@/services/search/normalize';

describe('normalize', () => {
  it('quita tildes, mayúsculas y signos', () => {
    expect(normalize('  Ácido  Acetilsalicílico® ')).toBe('acido acetilsalicilico');
    expect(normalize('Losartán/Hidroclorotiazida')).toBe('losartan hidroclorotiazida');
  });

  it('containsWords solo coincide con palabras completas', () => {
    expect(containsWords('dihidrocodeina y paracetamol', 'codeina')).toBe(false);
    expect(containsWords('otros aine como', 'aine')).toBe(true);
  });

  it('levenshtein corta al superar el máximo', () => {
    expect(levenshtein('ibuprofeno', 'ibuprofemo')).toBe(1);
    expect(levenshtein('abc', 'xyzxyz', 1)).toBe(2);
  });
});

describe('resolveQuery', () => {
  it.each([
    ['ibuprofeno', 'ibuprofeno', 'exact'],
    ['Advil', 'ibuprofeno', 'exact'],
    ['acetaminophen', 'paracetamol', 'exact'],
    ['aspirina', 'ácido acetilsalicílico', 'exact'],
    ['atorvas', 'atorvastatina', 'prefix'],
    ['ibuprofemo', 'ibuprofeno', 'fuzzy'],
    ['omeprasol', 'omeprazol', 'fuzzy'],
  ])('"%s" → %s (%s)', (query, expected, match) => {
    const r = resolveQuery(query);
    expect(r?.entry.name).toBe(expected);
    expect(r?.match).toBe(match);
  });

  it('no inventa coincidencias para términos desconocidos o ambiguos', () => {
    expect(resolveQuery('xyzabc')).toBeUndefined();
    expect(resolveQuery('ab')).toBeUndefined();
    // "sartan" es prefijo de nada y sufijo de varios: no debe elegir uno al azar.
    expect(resolveQuery('artan')).toBeUndefined();
  });
});

describe('ingredientes de las fuentes', () => {
  it('reconoce nombres de CIMA y de openFDA', () => {
    expect(resolveSourceIngredient('IBUPROFENO (ARGININA)')?.name).toBe('ibuprofeno');
    expect(resolveSourceIngredient('ATORVASTATIN CALCIUM')?.name).toBe('atorvastatina');
    expect(resolveSourceIngredient('ÁCIDO ACETILSALICÍLICO')?.name).toBe('ácido acetilsalicílico');
    expect(resolveSourceIngredient('GABAPENTINA')).toBeUndefined();
  });

  it('limpia sales y formas de los desconocidos', () => {
    expect(cleanIngredientName('PREGABALINA MONOHIDRATO')).toBe('pregabalina');
    expect(cleanIngredientName('METOCLOPRAMIDA HIDROCLORURO (MONOHIDRATO)')).toBe('metoclopramida');
    expect(displayIngredientName('WARFARINA SODICA')).toBe('warfarina');
  });

  it('incluye términos de grupo terapéutico para buscar menciones', () => {
    const terms = mentionTermsFor('IBUPROFENO');
    expect(terms).toEqual(expect.arrayContaining(['ibuprofeno', 'ibuprofen', 'aine', 'nsaids']));
  });
});
