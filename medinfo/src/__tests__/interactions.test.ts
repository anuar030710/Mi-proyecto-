import { checkInteractions, checkPair } from '@/services/interactions/interactionChecker';
import {
  antiacido,
  atorvastatinaFda,
  claritromicina,
  gabapentina,
  ibuprofeno,
  ibuprofenoParacetamol,
  morfina,
  paracetamol,
  warfarina,
} from './fixtures/drugs';

describe('checkInteractions', () => {
  it('clasifica warfarina + ibuprofeno como grave (tabla curada) y adjunta el texto de la ficha', () => {
    const [result] = checkPair(warfarina, ibuprofeno);
    expect(result.severity).toBe('grave');
    expect(result.evidence).toBe('curada');
    expect(result.excerpts.map((e) => e.text)).toEqual(
      expect.arrayContaining([expect.stringContaining('warfarina')]),
    );
    // Es simétrica.
    expect(checkPair(ibuprofeno, warfarina)[0].severity).toBe('grave');
  });

  it('detecta duplicidad de principio activo en combinaciones', () => {
    const results = checkPair(paracetamol, ibuprofenoParacetamol);
    expect(results).toHaveLength(1);
    expect(results[0].evidence).toBe('duplicidad');
    expect(results[0].summary).toContain('paracetamol');
  });

  it('no confunde el encabezado con el propio nombre como mención (dos productos de ibuprofeno)', () => {
    const results = checkPair(ibuprofeno, ibuprofenoParacetamol);
    expect(results.map((r) => r.evidence)).toEqual(['duplicidad']);
  });

  it('cruza fuentes e idiomas: atorvastatina (openFDA) + claritromicina (CIMA)', () => {
    const [result] = checkPair(atorvastatinaFda, claritromicina);
    expect(result.severity).toBe('grave');
    expect(result.excerpts[0].text).toContain('clarithromycin');
  });

  it('marca como "desconocida" una mención que no está en la tabla curada', () => {
    const [result] = checkPair(morfina, gabapentina);
    expect(result.severity).toBe('desconocida');
    expect(result.evidence).toBe('ficha-tecnica');
    expect(result.excerpts).toEqual([{ drugId: gabapentina.id, text: expect.stringContaining('morfina') }]);
  });

  it('no hay resultado si ninguna ficha menciona al otro', () => {
    expect(checkPair(gabapentina, antiacido)).toEqual([]);
  });

  it('ordena de más a menos grave', () => {
    const results = checkInteractions([paracetamol, warfarina, ibuprofeno]);
    const severities = results.map((r) => r.severity);
    expect(severities).toEqual(['grave', 'moderada']);
    expect(results[1].title).toBe('Paracetamol + Warfarina');
  });

  it('sin coincidencias devuelve lista vacía', () => {
    expect(checkInteractions([paracetamol, gabapentina])).toEqual([]);
  });
});
