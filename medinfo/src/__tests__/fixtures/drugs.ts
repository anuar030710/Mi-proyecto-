import type { Drug, DrugSection } from '@/domain/types';

const interactions = (...paragraphs: string[]): DrugSection => ({
  key: 'interactions',
  title: 'Interacciones',
  paragraphs,
  language: 'es',
});

export function makeDrug(partial: Partial<Drug> & Pick<Drug, 'id' | 'activeIngredients'>): Drug {
  return {
    source: 'cima',
    name: partial.id.toUpperCase(),
    sections: [],
    references: [],
    fetchedAt: 0,
    ...partial,
  };
}

export const ibuprofeno = makeDrug({
  id: 'cima:1',
  name: 'IBUPROFENO CINFA 600 mg',
  activeIngredients: ['IBUPROFENO'],
  sections: [
    interactions(
      'Ibuprofeno',
      'Anticoagulantes: los AINE pueden aumentar los efectos de los anticoagulantes, como la warfarina.',
      'Otros AINE: evitar el uso simultáneo con dos o más AINE.',
      'Antihipertensivos: los AINE pueden reducir su eficacia.',
    ),
  ],
});

export const warfarina = makeDrug({
  id: 'cima:2',
  name: 'ALDOCUMAR 3 mg',
  activeIngredients: ['WARFARINA SODICA'],
  sections: [interactions('Numerosos medicamentos potencian su efecto, entre ellos el paracetamol a dosis altas.')],
});

export const paracetamol = makeDrug({ id: 'cima:3', name: 'GELOCATIL 1 g', activeIngredients: ['PARACETAMOL'] });

export const ibuprofenoParacetamol = makeDrug({
  id: 'cima:4',
  name: 'ANTIDOL DUAL',
  activeIngredients: ['PARACETAMOL', 'IBUPROFENO'],
});

export const gabapentina = makeDrug({
  id: 'cima:5',
  name: 'GABAPENTINA NORMON',
  activeIngredients: ['GABAPENTINA'],
  sections: [
    interactions(
      'Los antiácidos que contienen aluminio y magnesio reducen su absorción.',
      'Opioides: el uso concomitante con morfina puede aumentar la depresión del SNC.',
    ),
  ],
});

export const antiacido = makeDrug({ id: 'cima:6', name: 'ALMAX', activeIngredients: ['ALMAGATO'] });

export const atorvastatinaFda = makeDrug({
  id: 'fda:abc',
  source: 'openfda',
  name: 'Lipitor',
  activeIngredients: ['ATORVASTATIN CALCIUM'],
  sections: [
    {
      key: 'interactions',
      title: 'Interacciones',
      language: 'en',
      paragraphs: ['7.1 Strong CYP3A4 inhibitors: clarithromycin increases atorvastatin exposure.'],
    },
  ],
});

export const claritromicina = makeDrug({
  id: 'cima:7',
  name: 'KLACID 500 mg',
  activeIngredients: ['CLARITROMICINA'],
});

export const morfina = makeDrug({ id: 'cima:8', name: 'MST CONTINUS', activeIngredients: ['MORFINA SULFATO'] });
