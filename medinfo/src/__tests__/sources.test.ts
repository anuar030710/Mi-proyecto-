import { mapCimaDrug, mapCimaSummary } from '@/data/remote/cima';
import { decodeEntities, htmlToParagraphs } from '@/data/remote/html';
import { mapFdaDrug, mapFdaSummary, splitLabelText } from '@/data/remote/openFda';

describe('html', () => {
  it('extrae párrafos y decodifica entidades', () => {
    const html =
      '<div><p><span>No debe administrarse en combinaci&#243;n con:</span></p><p>&#xa0;</p>' +
      '<p><u>&#193;cido acetilsalic&#237;lico</u></p><ul><li>Uno</li><li>Dos</li></ul>' +
      '<table><tr><td>Frecuentes</td><td>Náuseas</td></tr></table><script>alert(1)</script></div>';
    expect(htmlToParagraphs(html)).toEqual([
      'No debe administrarse en combinación con:',
      'Ácido acetilsalicílico',
      '• Uno',
      '• Dos',
      'Frecuentes · Náuseas',
    ]);
  });

  it('ignora entidades inválidas', () => {
    expect(decodeEntities('a &#xFFFFFFF; b &foo;')).toBe('a  b &foo;');
  });
});

describe('CIMA', () => {
  const item = {
    nregistro: '80298',
    nombre: 'GRIPPOSTAD CON IBUPROFENO 200 MG/5 MG',
    labtitular: 'Laboratorio Stada S.L.',
    receta: false,
    dosis: '200 mg/5 mg',
    vtm: { nombre: 'ibuprofeno + fenilefrina' },
    formaFarmaceutica: { nombre: 'COMPRIMIDO RECUBIERTO CON PELÍCULA' },
  };

  it('resumen', () => {
    expect(mapCimaSummary(item)).toEqual({
      id: 'cima:80298',
      source: 'cima',
      name: item.nombre,
      activeIngredients: ['ibuprofeno', 'fenilefrina'],
      presentation: '200 mg/5 mg · Comprimido recubierto con película',
      manufacturer: 'Laboratorio Stada S.L.',
      requiresPrescription: false,
    });
  });

  it('ficha: agrupa subsecciones y omite secciones vacías', () => {
    const drug = mapCimaDrug(
      {
        ...item,
        principiosActivos: [{ nombre: 'IBUPROFENO' }, { nombre: 'FENILEFRINA HIDROCLORURO' }],
        docs: [{ tipo: 1, urlHtml: 'https://cima/ft.html', fecha: Date.UTC(2025, 3, 2) }],
      },
      [
        { seccion: '4.1', titulo: 'Indicaciones', contenido: '<p>Alivio sintomático.</p>' },
        { seccion: '4.2', titulo: 'Posología' },
        { seccion: '4.2.1', titulo: 'Posología', contenido: '<p>1 comprimido cada 8 horas.</p>' },
        { seccion: '4.2.2', titulo: 'Forma de administración', contenido: '<p>Vía oral.</p>' },
        { seccion: '4.3', titulo: 'Contraindicaciones', contenido: '' },
        { seccion: '5.1', titulo: 'Propiedades', contenido: '<p>No se muestra.</p>' },
      ],
    );
    expect(drug.activeIngredients).toEqual(['IBUPROFENO', 'FENILEFRINA HIDROCLORURO']);
    expect(drug.sections.map((s) => s.key)).toEqual(['indications', 'dosage']);
    expect(drug.sections[1].paragraphs).toEqual([
      '▸ Posología',
      '1 comprimido cada 8 horas.',
      '▸ Forma de administración',
      'Vía oral.',
    ]);
    expect(drug.references[0]).toEqual({
      name: 'Ficha técnica — CIMA (AEMPS)',
      url: 'https://cima/ft.html',
      revisedAt: '2025-04-02',
    });
  });
});

describe('openFDA', () => {
  const label = {
    set_id: 'a60cc18b-0631-4cf0-b021-9f52224ece65',
    effective_time: '20240415',
    openfda: {
      brand_name: ['LIPITOR'],
      generic_name: ['ATORVASTATIN CALCIUM'],
      manufacturer_name: ['Viatris'],
      product_type: ['HUMAN PRESCRIPTION DRUG'],
      route: ['ORAL'],
    },
    drug_interactions: ['7 DRUG INTERACTIONS 7.1 Strong CYP3A4 Inhibitors Avoid. 7.2 Rifampin May reduce levels.'],
    do_not_use: ['if you are allergic'],
  };

  it('resumen', () => {
    expect(mapFdaSummary(label)).toMatchObject({
      id: 'fda:a60cc18b-0631-4cf0-b021-9f52224ece65',
      name: 'Lipitor',
      activeIngredients: ['ATORVASTATIN CALCIUM'],
      requiresPrescription: true,
    });
  });

  it('separa combinaciones de principios activos', () => {
    expect(mapFdaSummary({ set_id: 'x', openfda: { generic_name: ['ACETAMINOPHEN AND IBUPROFEN'] } }).activeIngredients).toEqual([
      'ACETAMINOPHEN',
      'IBUPROFEN',
    ]);
  });

  it('ficha: secciones en inglés y fecha de revisión', () => {
    const drug = mapFdaDrug(label);
    expect(drug.sections.map((s) => [s.key, s.language])).toEqual([
      ['contraindications', 'en'],
      ['interactions', 'en'],
    ]);
    expect(drug.sections[1].paragraphs).toEqual([
      '7.1 Strong CYP3A4 Inhibitors Avoid.',
      '7.2 Rifampin May reduce levels.',
    ]);
    expect(drug.references[0].revisedAt).toBe('2024-04-15');
  });

  it('divide bloques largos en frases', () => {
    const long = Array.from({ length: 30 }, (_, i) => `Sentence number ${i} is here.`).join(' ');
    const parts = splitLabelText(long);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every((p) => p.length <= 600)).toBe(true);
    expect(parts.join(' ')).toBe(long);
  });
});
